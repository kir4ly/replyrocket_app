"use client";

import { useState, useEffect } from "react";
import { Auth } from "./auth";
import { ComposeApp } from "./compose-app";
import { Profile, supabase } from "@/lib/supabase";
import { createProfile, getProfile, getProfileByEmail } from "@/lib/db";

const PROFILE_ID_KEY = "replyrocket_profile_id";

export function ReplyRocket() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Check for Google auth session first
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user?.email) {
          // User signed in with Google
          const existingProfile = await getProfileByEmail(session.user.email);
          if (existingProfile) {
            localStorage.setItem(PROFILE_ID_KEY, existingProfile.id);
            setProfile(existingProfile);
          } else {
            // New Google user - needs onboarding
            setGoogleEmail(session.user.email);
            setNeedsOnboarding(true);
          }
          setIsLoading(false);
          return;
        }

        // Check localStorage for existing profile
        const savedProfileId = localStorage.getItem(PROFILE_ID_KEY);
        if (savedProfileId) {
          try {
            const loadedProfile = await getProfile(savedProfileId);
            setProfile(loadedProfile);
          } catch (error) {
            console.error("Failed to load profile:", error);
            localStorage.removeItem(PROFILE_ID_KEY);
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user?.email) {
        const existingProfile = await getProfileByEmail(session.user.email);
        if (existingProfile) {
          localStorage.setItem(PROFILE_ID_KEY, existingProfile.id);
          setProfile(existingProfile);
        } else {
          setGoogleEmail(session.user.email);
          setNeedsOnboarding(true);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (loggedInProfile: Profile) => {
    localStorage.setItem(PROFILE_ID_KEY, loggedInProfile.id);
    setProfile(loggedInProfile);
  };

  const handleSignup = async (profileData: Omit<Profile, "id" | "created_at" | "updated_at">) => {
    const newProfile = await createProfile(profileData);
    localStorage.setItem(PROFILE_ID_KEY, newProfile.id);
    setProfile(newProfile);
    setNeedsOnboarding(false);
  };

  const handleGoogleOnboarding = async (profileData: Omit<Profile, "id" | "created_at" | "updated_at" | "email" | "password">) => {
    if (!googleEmail) {
      throw new Error("No email found. Please sign out and try again.");
    }

    const newProfile = await createProfile({
      ...profileData,
      email: googleEmail,
      password: "google-oauth", // Placeholder for Google users
    });
    localStorage.setItem(PROFILE_ID_KEY, newProfile.id);
    setProfile(newProfile);
    setNeedsOnboarding(false);
    setGoogleEmail(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(PROFILE_ID_KEY);
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#16181c] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (needsOnboarding && googleEmail) {
    // Google user needs to complete profile setup
    return (
      <GoogleOnboarding
        email={googleEmail}
        onComplete={handleGoogleOnboarding}
        onSignOut={handleSignOut}
      />
    );
  }

  if (!profile) {
    return <Auth onLogin={handleLogin} onSignup={handleSignup} />;
  }

  return <ComposeApp profile={profile} onSignOut={handleSignOut} />;
}

// Separate onboarding component for Google users
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SparkleIcon } from "@phosphor-icons/react";

function GoogleOnboarding({
  email,
  onComplete,
  onSignOut
}: {
  email: string;
  onComplete: (data: Omit<Profile, "id" | "created_at" | "updated_at" | "email" | "password">) => Promise<void>;
  onSignOut: () => void;
}) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [tweets, setTweets] = useState({
    tweet1: "",
    tweet2: "",
    tweet3: "",
  });
  const [formData, setFormData] = useState({
    handle: "",
    bio: "",
    whatYouSell: "",
    tone: "casual",
    topics: "",
  });

  const analyzeTwitterStyle = async () => {
    const tweetList = [tweets.tweet1, tweets.tweet2, tweets.tweet3].filter(t => t.trim().length > 0);

    if (tweetList.length < 1) {
      setError("Please paste at least one tweet.");
      return;
    }

    setIsAnalyzing(true);
    setError("");

    try {
      const response = await fetch("/api/analyze-twitter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: formData.handle, tweets: tweetList }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          tone: data.tone || prev.tone,
          topics: data.topics || prev.topics,
        }));
        setStep(4);
      }
    } catch (err) {
      console.error("Failed to analyze tweets:", err);
      setError("Failed to analyze tweets. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleComplete = async () => {
    if (!formData.handle.trim() || !formData.bio.trim() || !formData.topics.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onComplete({
        name: formData.handle,
        handle: formData.handle,
        bio: formData.bio,
        tone: formData.tone,
        topics: formData.topics,
      });
    } catch (err) {
      console.error("Failed to complete profile:", err);
      setError("Failed to create profile. Please try again.");
      setIsSubmitting(false);
    }
  };

  const canProceedStep1 = () => formData.handle.trim().length > 0;
  const canProceedStep2 = () => formData.bio.trim().length > 0;
  const canProceedStep3 = () => tweets.tweet1.trim(); // Only first tweet is required
  const canProceedStep4 = () => formData.topics.trim().length > 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {step === 1 && "Complete your profile"}
            {step === 2 && "Tell us about yourself"}
            {step === 3 && "Share your tweets"}
            {step === 4 && "Review your profile"}
          </CardTitle>
          <CardDescription>
            {step === 1 && `Signed in as ${email}`}
            {step === 2 && "You can always edit this later"}
            {step === 3 && "Paste at least 1 tweet (3 recommended for best results)"}
            {step === 4 && "Review and confirm your profile details"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="handle">X Handle</FieldLabel>
                <Input
                  id="handle"
                  placeholder="@yourhandle"
                  value={formData.handle}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      handle: e.target.value.replace("@", ""),
                    })
                  }
                />
              </Field>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </FieldGroup>
          )}

          {step === 2 && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="bio">What You Do</FieldLabel>
                <Textarea
                  id="bio"
                  placeholder="e.g., Indie hacker building SaaS products, software engineer at a startup..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="min-h-20"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="whatYouSell">What You Sell (optional)</FieldLabel>
                <Textarea
                  id="whatYouSell"
                  placeholder="e.g., A course on building SaaS, consulting services, a newsletter..."
                  value={formData.whatYouSell}
                  onChange={(e) => setFormData({ ...formData, whatYouSell: e.target.value })}
                  className="min-h-20"
                />
              </Field>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </FieldGroup>
          )}

          {step === 3 && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="tweet1">Tweet 1 *</FieldLabel>
                <Textarea
                  id="tweet1"
                  placeholder="Paste your first tweet here..."
                  value={tweets.tweet1}
                  onChange={(e) => setTweets({ ...tweets, tweet1: e.target.value })}
                  className="min-h-20"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="tweet2">Tweet 2 (optional)</FieldLabel>
                <Textarea
                  id="tweet2"
                  placeholder="Paste your second tweet here..."
                  value={tweets.tweet2}
                  onChange={(e) => setTweets({ ...tweets, tweet2: e.target.value })}
                  className="min-h-20"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="tweet3">Tweet 3 (optional)</FieldLabel>
                <Textarea
                  id="tweet3"
                  placeholder="Paste your third tweet here..."
                  value={tweets.tweet3}
                  onChange={(e) => setTweets({ ...tweets, tweet3: e.target.value })}
                  className="min-h-20"
                />
              </Field>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </FieldGroup>
          )}

          {step === 4 && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="tone">Your Writing Tone</FieldLabel>
                <Select
                  value={formData.tone}
                  onValueChange={(value) => setFormData({ ...formData, tone: value })}
                >
                  <SelectTrigger id="tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual & Conversational</SelectItem>
                    <SelectItem value="professional">Professional & Polished</SelectItem>
                    <SelectItem value="witty">Witty & Humorous</SelectItem>
                    <SelectItem value="inspirational">Inspirational & Motivating</SelectItem>
                    <SelectItem value="educational">Educational & Informative</SelectItem>
                    <SelectItem value="bold">Bold & Provocative</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="topics">Topics You Post About</FieldLabel>
                <Textarea
                  id="topics"
                  placeholder="e.g., tech, startups, productivity, AI"
                  value={formData.topics}
                  onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                  className="min-h-16"
                />
              </Field>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </FieldGroup>
          )}

          <div className="mt-6 flex gap-3">
            {(step === 2 || step === 3 || step === 4) && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1"
                disabled={isSubmitting || isAnalyzing}
              >
                Back
              </Button>
            )}

            {step === 1 && (
              <Button
                onClick={() => {
                  if (!canProceedStep1()) {
                    setError("Please enter your X handle");
                    return;
                  }
                  setError("");
                  setStep(2);
                }}
                disabled={!canProceedStep1()}
                className="w-full"
              >
                Continue
              </Button>
            )}

            {step === 2 && (
              <Button
                onClick={() => {
                  if (!canProceedStep2()) {
                    setError("Please fill in what you do");
                    return;
                  }
                  setError("");
                  setStep(3);
                }}
                disabled={!canProceedStep2()}
                className="flex-1"
              >
                Continue
              </Button>
            )}

            {step === 3 && (
              <Button
                onClick={analyzeTwitterStyle}
                disabled={!canProceedStep3() || isAnalyzing}
                className="flex-1"
              >
                {isAnalyzing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <SparkleIcon className="h-4 w-4 mr-2" weight="fill" />
                    Analyze My Style
                  </>
                )}
              </Button>
            )}

            {step === 4 && (
              <Button
                onClick={handleComplete}
                disabled={!canProceedStep4() || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : (
                  "Get Started"
                )}
              </Button>
            )}
          </div>

          <div className="mt-4 flex justify-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <button
            onClick={onSignOut}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
