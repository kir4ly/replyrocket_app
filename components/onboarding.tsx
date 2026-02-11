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
import { RocketLaunchIcon, EnvelopeIcon, SparkleIcon } from "@phosphor-icons/react";

interface OnboardingProps {
  onComplete: (profile: Omit<Profile, "id" | "created_at" | "updated_at">) => void;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [expectedCode, setExpectedCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [pastedTweets, setPastedTweets] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    handle: "",
    bio: "",
    tone: "casual",
    topics: "",
  });

  const sendVerificationEmail = async () => {
    const code = generateCode();
    setExpectedCode(code);
    setIsSubmitting(true);
    setCodeError("");

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
    } catch (error) {
      console.error("Failed to send verification email:", error);
      setCodeError("Failed to send verification email. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyCode = () => {
    if (verificationCode === expectedCode) {
      setCodeError("");
      setStep(3);
    } else {
      setCodeError("Invalid code. Please try again.");
    }
  };

  const analyzeTwitterStyle = async () => {
    if (!pastedTweets.trim()) return;

    setIsAnalyzing(true);
    try {
      // Split pasted content into individual tweets
      const tweets = pastedTweets
        .split(/\n+/)
        .filter(t => t.trim().length > 10)
        .slice(0, 20); // Take up to 20 tweets

      if (tweets.length < 3) {
        setCodeError("Please paste at least 3 tweets for accurate analysis.");
        setIsAnalyzing(false);
        return;
      }

      const response = await fetch("/api/analyze-twitter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: formData.handle, tweets }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          bio: data.bio || prev.bio,
          tone: data.tone || prev.tone,
          topics: data.topics || prev.topics,
        }));
        setCodeError("");
      }
    } catch (error) {
      console.error("Failed to analyze tweets:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      onComplete({
        name: formData.handle,
        handle: formData.handle,
        bio: formData.bio,
        tone: formData.tone,
        topics: formData.topics,
      });
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
    return formData.bio.trim() && formData.topics.trim();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            {step === 2 ? (
              <EnvelopeIcon className="h-7 w-7 text-primary" weight="fill" />
            ) : step === 3 ? (
              <SparkleIcon className="h-7 w-7 text-primary" weight="fill" />
            ) : (
              <RocketLaunchIcon className="h-7 w-7 text-primary" weight="fill" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {step === 2 ? "Check your email" : step === 3 ? "Analyze your style" : "Welcome to ReplyRocket"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Create your account"}
            {step === 2 && `We sent a code to ${formData.email}`}
            {step === 3 && "Paste some of your tweets to learn your style"}
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
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
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
              {codeError && (
                <p className="text-sm text-destructive">{codeError}</p>
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
                    setCodeError("");
                  }}
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </Field>
              {codeError && (
                <p className="text-sm text-destructive text-center">{codeError}</p>
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
                <FieldLabel htmlFor="tweets">Paste Your Recent Tweets</FieldLabel>
                <Textarea
                  id="tweets"
                  placeholder="Copy and paste 5-10 of your recent tweets here (one per line). We'll analyze them to match your writing style."
                  value={pastedTweets}
                  onChange={(e) => setPastedTweets(e.target.value)}
                  className="min-h-32"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={analyzeTwitterStyle}
                  disabled={isAnalyzing || !pastedTweets.trim()}
                  className="mt-2"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <SparkleIcon className="h-4 w-4 mr-2" weight="fill" />
                      Analyze My Style
                    </>
                  )}
                </Button>
              </Field>

              {codeError && (
                <p className="text-sm text-destructive">{codeError}</p>
              )}

              <div className="border-t border-white/10 pt-4 mt-2">
                <p className="text-xs text-muted-foreground mb-3">Or fill in manually:</p>
              </div>

              <Field>
                <FieldLabel htmlFor="bio">Your Bio / What You Do</FieldLabel>
                <Textarea
                  id="bio"
                  placeholder="e.g., Indie hacker building SaaS products. Love talking about startups, coding, and productivity."
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  className="min-h-20"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="tone">Your Writing Tone</FieldLabel>
                <Select
                  value={formData.tone}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tone: value })
                  }
                >
                  <SelectTrigger id="tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">
                      Casual & Conversational
                    </SelectItem>
                    <SelectItem value="professional">
                      Professional & Polished
                    </SelectItem>
                    <SelectItem value="witty">Witty & Humorous</SelectItem>
                    <SelectItem value="inspirational">
                      Inspirational & Motivating
                    </SelectItem>
                    <SelectItem value="educational">
                      Educational & Informative
                    </SelectItem>
                    <SelectItem value="bold">Bold & Provocative</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="topics">Topics You Post About</FieldLabel>
                <Textarea
                  id="topics"
                  placeholder="e.g., tech, startups, productivity, AI, coding, entrepreneurship"
                  value={formData.topics}
                  onChange={(e) =>
                    setFormData({ ...formData, topics: e.target.value })
                  }
                  className="min-h-16"
                />
              </Field>
            </FieldGroup>
          )}

          <div className="mt-6 flex gap-3">
            {step === 3 && (
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1"
                disabled={isSubmitting}
              >
                Back
              </Button>
            )}

            {step === 1 && (
              <Button
                onClick={sendVerificationEmail}
                disabled={!canProceedStep1() || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : (
                  "Continue"
                )}
              </Button>
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
                onClick={handleComplete}
                disabled={!canProceedStep3() || isSubmitting}
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
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
