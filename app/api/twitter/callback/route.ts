import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, getCurrentUser } from "@/lib/twitter";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("Twitter OAuth error:", error);
      return NextResponse.redirect(new URL("/?twitter_error=denied", request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL("/?twitter_error=missing_params", request.url));
    }

    const cookieStore = await cookies();
    const codeVerifier = cookieStore.get("twitter_code_verifier")?.value;
    const storedState = cookieStore.get("twitter_state")?.value;

    if (!codeVerifier || !storedState || state !== storedState) {
      return NextResponse.redirect(new URL("/?twitter_error=invalid_state", request.url));
    }

    // Exchange code for tokens
    const { accessToken, refreshToken, expiresIn } = await getAccessToken(code, codeVerifier);

    // Get the Twitter user info
    const { data: twitterUser } = await getCurrentUser(accessToken);

    // Get the profile ID from the cookie (set during login)
    const profileId = cookieStore.get("replyrocket_profile_id")?.value;

    if (profileId) {
      // Calculate token expiry
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Update the profile with Twitter credentials
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          twitter_access_token: accessToken,
          twitter_refresh_token: refreshToken,
          twitter_token_expires_at: expiresAt,
          twitter_user_id: twitterUser.id,
          twitter_username: twitterUser.username,
          twitter_name: twitterUser.name,
          twitter_profile_image_url: twitterUser.profile_image_url?.replace("_normal", "_400x400"),
          twitter_verified: twitterUser.verified || false,
        })
        .eq("id", profileId);

      if (updateError) {
        console.error("Failed to update profile with Twitter tokens:", updateError);
      }
    }

    // Clear the OAuth cookies
    cookieStore.delete("twitter_code_verifier");
    cookieStore.delete("twitter_state");

    // Set a success cookie that the client can read
    cookieStore.set("twitter_connected", "true", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60, // Short-lived, just for the redirect
    });

    return NextResponse.redirect(new URL("/?twitter_connected=true", request.url));
  } catch (error) {
    console.error("Twitter callback error:", error);
    return NextResponse.redirect(new URL("/?twitter_error=callback_failed", request.url));
  }
}
