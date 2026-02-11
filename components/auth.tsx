"use client";

import { useState } from "react";
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
import { Profile } from "@/lib/supabase";
import { getProfileByEmail, loginWithEmail } from "@/lib/db";
import { SparkleIcon, GoogleLogo } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";

interface AuthProps {
  onLogin: (profile: Profile) => void;
  onSignup: (profile: Omit<Profile, "id" | "created_at" | "updated_at">) => Promise<void>;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function Auth({ onLogin, onSignup }: AuthProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [expectedCode, setExpectedCode] = useState("");
  const [error, setError] = useState("");
  const [tweets, setTweets] = useState({
    tweet1: "",
    tweet2: "",
    tweet3: "",
  });
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    handle: "",
    bio: "",
    whatYouSell: "",
    tone: "casual",
    topics: "",
  });

  const handleLogin = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const profile = await loginWithEmail(formData.email, formData.password);
      if (profile) {
        onLogin(profile);
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendVerificationEmail = async () => {
    // Check if email already exists
    const existingProfile = await getProfileByEmail(formData.email);
    if (existingProfile) {
      setError("An account with this email already exists. Please log in.");
      return;
    }

    const code = generateCode();
    setExpectedCode(code);
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, code }),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }

      setStep(2);
    } catch (err) {
      console.error("Failed to send verification email:", err);
      setError("Failed to send verification email. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = () => {
    if (verificationCode === expectedCode) {
      setError("");
      setStep(3);
    } else {
      setError("Invalid code. Please try again.");
    }
  };

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
        setStep(5); // Move to profile review step
      }
    } catch (err) {
      console.error("Failed to analyze tweets:", err);
      setError("Failed to analyze tweets. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSignupComplete = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      await onSignup({
        email: formData.email,
        password: formData.password,
        name: formData.handle,
        handle: formData.handle,
        bio: formData.bio,
        tone: formData.tone,
        topics: formData.topics,
      });
    } catch (err) {
      console.error("Signup failed:", err);
      setError("Failed to create account. Please try again.");
      setIsSubmitting(false);
    }
  };

  const canLogin = formData.email.includes("@") && formData.password.length >= 1;

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        setError("Failed to sign in with Google. Please try again.");
      }
    } catch (err) {
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedStep1 = () => {
    return (
      formData.email.trim() &&
      formData.email.includes("@") &&
      formData.password.length >= 6 &&
      formData.handle.trim()
    );
  };

  const canProceedStep3 = () => {
    return formData.bio.trim();
  };

  const canProceedStep4 = () => {
    return tweets.tweet1.trim(); // Only first tweet is required
  };

  const canProceedStep5 = () => {
    return formData.topics.trim();
  };

  // Login mode
  if (mode === "login") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your ReplyRocket account</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canLogin) {
                      handleLogin();
                    }
                  }}
                />
              </Field>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </FieldGroup>

            <div className="mt-6 space-y-3">
              <Button
                onClick={handleLogin}
                disabled={!canLogin || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleGoogleAuth}
                disabled={isSubmitting}
                className="w-full"
              >
                <GoogleLogo className="h-4 w-4 mr-2" weight="bold" />
                Continue with Google
              </Button>
            </div>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setStep(1);
                  setError("");
                }}
                className="text-primary hover:underline"
              >
                Sign up
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Signup mode
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {step === 1 && "Create your account"}
            {step === 2 && "Check your email"}
            {step === 3 && "Tell us about yourself"}
            {step === 4 && "Share your tweets"}
            {step === 5 && "Review your profile"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Get started with ReplyRocket"}
            {step === 2 && `We sent a code to ${formData.email}`}
            {step === 3 && "You can always edit this later"}
            {step === 4 && "Paste at least 1 tweet (3 recommended for best results)"}
            {step === 5 && "Review and confirm your profile details"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </Field>
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
                <FieldLabel htmlFor="code">Verification Code</FieldLabel>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </Field>
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <button
                type="button"
                onClick={sendVerificationEmail}
                className="text-sm text-primary hover:underline"
                disabled={isSubmitting}
              >
                Resend code
              </button>
            </FieldGroup>
          )}

          {step === 3 && (
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

          {step === 4 && (
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

          {step === 5 && (
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
            {(step === 3 || step === 4 || step === 5) && (
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
              <div className="flex-1 space-y-3">
                <Button
                  onClick={sendVerificationEmail}
                  disabled={!canProceedStep1() || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  ) : (
                    "Continue"
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={handleGoogleAuth}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  <GoogleLogo className="h-4 w-4 mr-2" weight="bold" />
                  Continue with Google
                </Button>
              </div>
            )}

            {step === 2 && (
              <Button
                onClick={verifyCode}
                disabled={verificationCode.length !== 6}
                className="flex-1"
              >
                Verify
              </Button>
            )}

            {step === 3 && (
              <Button
                onClick={() => {
                  if (!canProceedStep3()) {
                    setError("Please fill in what you do");
                    return;
                  }
                  setError("");
                  setStep(4);
                }}
                disabled={!canProceedStep3()}
                className="flex-1"
              >
                Continue
              </Button>
            )}

            {step === 4 && (
              <Button
                onClick={analyzeTwitterStyle}
                disabled={!canProceedStep4() || isAnalyzing}
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

            {step === 5 && (
              <Button
                onClick={handleSignupComplete}
                disabled={!canProceedStep5() || isSubmitting}
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
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-1.5 w-5 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className="text-primary hover:underline"
            >
              Sign in
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
