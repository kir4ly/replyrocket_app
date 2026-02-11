import { TwitterApi } from "twitter-api-v2";

// Twitter OAuth 2.0 credentials - these need to be set in environment variables
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!;
const TWITTER_CALLBACK_URL = process.env.NEXT_PUBLIC_URL
  ? `${process.env.NEXT_PUBLIC_URL}/api/twitter/callback`
  : "http://localhost:3000/api/twitter/callback";

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

// Post a tweet
export async function postTweet(accessToken: string, text: string) {
  const client = getAuthenticatedClient(accessToken);
  return client.v2.tweet(text);
}

// Get current user info
export async function getCurrentUser(accessToken: string) {
  const client = getAuthenticatedClient(accessToken);
  return client.v2.me();
}
