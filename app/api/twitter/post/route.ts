import { NextRequest, NextResponse } from "next/server";
import { postTweet, refreshAccessToken } from "@/lib/twitter";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { profileId, content } = await request.json();

    if (!profileId || !content) {
      return NextResponse.json(
        { error: "Missing profileId or content" },
        { status: 400 }
      );
    }

    // Get the profile with Twitter credentials
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("twitter_access_token, twitter_refresh_token, twitter_token_expires_at")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    if (!profile.twitter_access_token) {
      return NextResponse.json(
        { error: "Twitter not connected" },
        { status: 401 }
      );
    }

    let accessToken = profile.twitter_access_token;

    // Check if token is expired and refresh if needed
    if (profile.twitter_token_expires_at) {
      const expiresAt = new Date(profile.twitter_token_expires_at);
      const now = new Date();

      // Refresh if token expires in less than 5 minutes
      if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        if (profile.twitter_refresh_token) {
          try {
            const { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn } =
              await refreshAccessToken(profile.twitter_refresh_token);

            accessToken = newAccessToken;
            const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

            // Update tokens in database
            await supabase
              .from("profiles")
              .update({
                twitter_access_token: newAccessToken,
                twitter_refresh_token: newRefreshToken,
                twitter_token_expires_at: newExpiresAt,
              })
              .eq("id", profileId);
          } catch (refreshError) {
            console.error("Failed to refresh token:", refreshError);
            return NextResponse.json(
              { error: "Twitter session expired. Please reconnect." },
              { status: 401 }
            );
          }
        }
      }
    }

    // Post the tweet
    const result = await postTweet(accessToken, content);

    return NextResponse.json({
      success: true,
      tweetId: result.data.id,
    });
  } catch (error: unknown) {
    console.error("Failed to post tweet:", error);

    // Check for specific Twitter API errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("401") || errorMessage.includes("unauthorized")) {
      return NextResponse.json(
        { error: "Twitter authorization failed. Please reconnect your account." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to post tweet" },
      { status: 500 }
    );
  }
}
