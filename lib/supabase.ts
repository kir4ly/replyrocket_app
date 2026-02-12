import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ffxylnvhfylxeygnspir.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmeHlsbnZoZnlseGV5Z25zcGlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2Nzg4OTYsImV4cCI6MjA4MDI1NDg5Nn0.NLYKX3-0eey1Rk-I4IxTNHkYadaO9myw0CbjSf2Npsc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  password: string;
  name: string;
  handle: string;
  bio: string;
  tone: string;
  topics: string;
  avatar_url?: string;
  twitter_access_token?: string;
  twitter_refresh_token?: string;
  twitter_token_expires_at?: string;
  twitter_user_id?: string;
  twitter_username?: string;
  twitter_name?: string;
  twitter_profile_image_url?: string;
  twitter_verified?: boolean;
  created_at: string;
  updated_at: string;
};

export type Tweet = {
  id: string;
  profile_id: string;
  content: string;
  status: "draft" | "scheduled" | "posted";
  scheduled_for?: string;
  posted_at?: string;
  created_at: string;
  updated_at: string;
};
