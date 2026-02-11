import { NextResponse } from "next/server";
import { generateAuthLink } from "@/lib/twitter";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const { url, codeVerifier, state } = generateAuthLink();

    // Store the code verifier and state in cookies for the callback
    const cookieStore = await cookies();
    cookieStore.set("twitter_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
    });
    cookieStore.set("twitter_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
    });

    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Twitter auth error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Twitter auth" },
      { status: 500 }
    );
  }
}
