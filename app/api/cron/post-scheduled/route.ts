import { NextRequest, NextResponse } from "next/server";
import { postTweet, refreshAccessToken } from "@/lib/twitter";
import { supabase } from "@/lib/supabase";

// Secret token to authenticate cron requests
const CRON_SECRET = process.env.CRON_SECRET || "your-secret-token-here";

export async function GET(request: NextRequest) {
  try {
    // Verify the secret token
    const token = request.nextUrl.searchParams.get("token");
    if (token !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all scheduled tweets that are due
    const now = new Date().toISOString();
    const { data: scheduledTweets, error: fetchError } = await supabase
      .from("tweets")
      .select("*, profiles!inner(twitter_access_token, twitter_refresh_token, twitter_token_expires_at)")
      .eq("status", "scheduled")
      .lte("scheduled_for", now);

    if (fetchError) {
      console.error("Failed to fetch scheduled tweets:", fetchError);
      return NextResponse.json({ error: "Failed to fetch scheduled tweets" }, { status: 500 });
    }

    if (!scheduledTweets || scheduledTweets.length === 0) {
      return NextResponse.json({ message: "No tweets to post", posted: 0 });
    }

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const tweet of scheduledTweets) {
      const profile = tweet.profiles;

      if (!profile?.twitter_access_token) {
        results.push({ id: tweet.id, success: false, error: "No Twitter connection" });
        continue;
      }

      let accessToken = profile.twitter_access_token;

      // Check if token needs refresh
      if (profile.twitter_token_expires_at) {
        const expiresAt = new Date(profile.twitter_token_expires_at);
        const nowDate = new Date();

        if (expiresAt.getTime() - nowDate.getTime() < 5 * 60 * 1000) {
          if (profile.twitter_refresh_token) {
            try {
              const { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn } =
                await refreshAccessToken(profile.twitter_refresh_token);

              accessToken = newAccessToken;
              const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

              await supabase
                .from("profiles")
                .update({
                  twitter_access_token: newAccessToken,
                  twitter_refresh_token: newRefreshToken,
                  twitter_token_expires_at: newExpiresAt,
                })
                .eq("id", tweet.profile_id);
            } catch (refreshError) {
              console.error("Failed to refresh token for tweet:", tweet.id, refreshError);
              results.push({ id: tweet.id, success: false, error: "Token refresh failed" });
              continue;
            }
          }
        }
      }

      try {
        // Post the tweet to Twitter
        await postTweet(accessToken, tweet.content);

        // Update tweet status to posted
        await supabase
          .from("tweets")
          .update({
            status: "posted",
            posted_at: new Date().toISOString(),
          })
          .eq("id", tweet.id);

        results.push({ id: tweet.id, success: true });
      } catch (postError) {
        console.error("Failed to post tweet:", tweet.id, postError);
        results.push({
          id: tweet.id,
          success: false,
          error: postError instanceof Error ? postError.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return NextResponse.json({
      message: `Posted ${successCount} of ${scheduledTweets.length} tweets`,
      posted: successCount,
      results,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
