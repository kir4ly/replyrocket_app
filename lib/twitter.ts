import { TwitterApi } from "twitter-api-v2";

// Twitter OAuth 2.0 credentials - these need to be set in environment variables
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!;
const TWITTER_CALLBACK_URL = process.env.NEXT_PUBLIC_URL
  ? `${process.env.NEXT_PUBLIC_URL}/api/twitter/callback`
  : "http://localhost:3000/api/twitter/callback";

// Twitter OAuth 1.0a credentials for media upload
const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET;
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
const TWITTER_ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET;

// Scopes needed for posting tweets
const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];

// Create a client for OAuth 2.0 flow
export function getAuthClient() {
  return new TwitterApi({
    clientId: TWITTER_CLIENT_ID,
    clientSecret: TWITTER_CLIENT_SECRET,
  });
}

// Generate OAuth 2.0 authorization URL
export function generateAuthLink() {
  const client = getAuthClient();
  return client.generateOAuth2AuthLink(TWITTER_CALLBACK_URL, {
    scope: SCOPES,
  });
}

// Exchange code for access token
export async function getAccessToken(code: string, codeVerifier: string) {
  const client = getAuthClient();
  return client.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri: TWITTER_CALLBACK_URL,
  });
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string) {
  const client = getAuthClient();
  return client.refreshOAuth2Token(refreshToken);
}

// Create authenticated client from access token
export function getAuthenticatedClient(accessToken: string) {
  return new TwitterApi(accessToken);
}

// Create OAuth 1.0a client for media upload
export function getOAuth1Client() {
  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_TOKEN_SECRET) {
    return null;
  }
  return new TwitterApi({
    appKey: TWITTER_API_KEY,
    appSecret: TWITTER_API_SECRET,
    accessToken: TWITTER_ACCESS_TOKEN,
    accessSecret: TWITTER_ACCESS_TOKEN_SECRET,
  });
}

// Post a tweet (with optional media)
export async function postTweet(accessToken: string, text: string, mediaData?: Buffer) {
  const client = getAuthenticatedClient(accessToken);

  if (mediaData) {
    // Try OAuth 1.0a client for media upload
    const oauth1Client = getOAuth1Client();

    if (oauth1Client) {
      try {
        // Upload media using OAuth 1.0a
        const mediaId = await oauth1Client.v1.uploadMedia(mediaData, { mimeType: "image/jpeg" });
        // Post tweet with media using OAuth 2.0
        return client.v2.tweet(text, { media: { media_ids: [mediaId] } });
      } catch (mediaError) {
        console.error("Media upload failed:", mediaError);
        throw new Error("Failed to upload image. Please try again.");
      }
    } else {
      throw new Error("Image upload requires OAuth 1.0a credentials. Please configure TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_TOKEN_SECRET.");
    }
  }

  return client.v2.tweet(text);
}

// Get current user info with profile details
export async function getCurrentUser(accessToken: string) {
  const client = getAuthenticatedClient(accessToken);
  return client.v2.me({
    "user.fields": ["profile_image_url", "verified", "name", "username"],
  });
}
