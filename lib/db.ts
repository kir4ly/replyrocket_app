import { supabase, Profile, Tweet } from "./supabase";

// Profile functions
export async function createProfile(profile: Omit<Profile, "id" | "created_at" | "updated_at">) {
  console.log("Creating profile with data:", profile);
  const { data, error } = await supabase
    .from("profiles")
    .insert([profile])
    .select()
    .single();

  if (error) {
    console.error("createProfile error:", error);
    throw error;
  }
  console.log("Profile created successfully:", data);
  return data as Profile;
}

export async function getProfile(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function getProfileByEmail(email: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("getProfileByEmail error:", error);
    return null;
  }
  return data as Profile | null;
}

export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .eq("password", password)
    .single();

  if (error) return null;
  return data as Profile;
}

export async function updateProfile(id: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

// Tweet functions
export async function createTweet(tweet: Omit<Tweet, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("tweets")
    .insert([tweet])
    .select()
    .single();

  if (error) throw error;
  return data as Tweet;
}

export async function getTweets(profileId: string, status?: Tweet["status"]) {
  let query = supabase
    .from("tweets")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as Tweet[];
}

export async function updateTweet(id: string, updates: Partial<Tweet>) {
  const { data, error } = await supabase
    .from("tweets")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Tweet;
}

export async function deleteTweet(id: string) {
  const { error } = await supabase
    .from("tweets")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function markTweetAsPosted(id: string) {
  return updateTweet(id, {
    status: "posted",
    posted_at: new Date().toISOString(),
  });
}
