"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Profile, Tweet } from "@/lib/supabase";
import { createTweet, getTweets, deleteTweet, updateProfile } from "@/lib/db";
import {
  PencilSimpleIcon,
  FileIcon,
  CalendarIcon,
  ClockIcon,
  ImageIcon,
  GifIcon,
  HashIcon,
  ArrowRightIcon,
  TrashIcon,
  CheckIcon,
  CopyIcon,
  SparkleIcon,
  PaperPlaneTiltIcon,
  BookmarkSimpleIcon,
  LightningIcon,
  XIcon,
  XLogoIcon,
  LinkIcon,
  CheckCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";

interface ComposeAppProps {
  profile: Profile;
}

export function ComposeApp({ profile: initialProfile }: ComposeAppProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [tweetContent, setTweetContent] = useState("");
  const [activeTab, setActiveTab] = useState<"compose" | "drafts" | "scheduled" | "posted">("compose");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [drafts, setDrafts] = useState<Tweet[]>([]);
  const [scheduled, setScheduled] = useState<Tweet[]>([]);
  const [posted, setPosted] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postSuccess, setPostSuccess] = useState(false);

  const isTwitterConnected = !!profile.twitter_access_token;
  const charCount = tweetContent.length;
  const maxChars = 280;
  const charPercentage = (charCount / maxChars) * 100;

  // Check for Twitter connection on mount (from OAuth callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("twitter_connected") === "true") {
      // Refresh profile to get Twitter credentials
      window.location.href = "/";
    }
  }, []);

  const loadTweets = useCallback(async () => {
    try {
      const [draftsData, scheduledData, postedData] = await Promise.all([
        getTweets(profile.id, "draft"),
        getTweets(profile.id, "scheduled"),
        getTweets(profile.id, "posted"),
      ]);
      setDrafts(draftsData);
      setScheduled(scheduledData);
      setPosted(postedData);
    } catch (error) {
      console.error("Failed to load tweets:", error);
    } finally {
      setIsLoading(false);
    }
  }, [profile.id]);

  useEffect(() => {
    loadTweets();
  }, [loadTweets]);

  const generateAiSuggestion = async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          userProfile: {
            name: profile.name,
            handle: profile.handle,
            bio: profile.bio,
            tone: profile.tone,
            topics: profile.topics,
          },
          currentDraft: tweetContent,
        }),
      });

      const data = await response.json();
      if (data.result) {
        setAiSuggestion(data.result);
      }
    } catch (error) {
      console.error("Failed to generate:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const useSuggestion = () => {
    setTweetContent(aiSuggestion);
    setAiSuggestion("");
    setAiPrompt("");
  };

  const saveDraft = async () => {
    if (!tweetContent.trim()) return;

    try {
      const newDraft = await createTweet({
        profile_id: profile.id,
        content: tweetContent,
        status: "draft",
      });
      setDrafts([newDraft, ...drafts]);
      setTweetContent("");
    } catch (error) {
      console.error("Failed to save draft:", error);
    }
  };

  const postTweet = async () => {
    if (!tweetContent.trim()) return;

    setIsPosting(true);
    setPostError(null);
    setPostSuccess(false);

    try {
      // Post to Twitter if connected
      if (isTwitterConnected) {
        const response = await fetch("/api/twitter/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: profile.id,
            content: tweetContent,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to post to Twitter");
        }
      }

      // Save to our database
      const newPost = await createTweet({
        profile_id: profile.id,
        content: tweetContent,
        status: "posted",
        posted_at: new Date().toISOString(),
      });
      setPosted([newPost, ...posted]);
      setTweetContent("");
      setPostSuccess(true);
      setTimeout(() => setPostSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to post tweet:", error);
      setPostError(error instanceof Error ? error.message : "Failed to post tweet");
      setTimeout(() => setPostError(null), 5000);
    } finally {
      setIsPosting(false);
    }
  };

  const connectTwitter = () => {
    // Store profile ID in cookie before redirecting
    document.cookie = `replyrocket_profile_id=${profile.id}; path=/; max-age=600`;
    window.location.href = "/api/twitter/auth";
  };

  const loadDraft = (draft: Tweet) => {
    setTweetContent(draft.content);
    setActiveTab("compose");
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      await deleteTweet(id);
      setDrafts(drafts.filter((d) => d.id !== id));
    } catch (error) {
      console.error("Failed to delete draft:", error);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    { text: "Hook for my audience", icon: LightningIcon },
    { text: "Engaging question", icon: HashIcon },
    { text: "Share expertise tip", icon: SparkleIcon },
    { text: "Thread opener", icon: PencilSimpleIcon },
  ];

  const tabs = [
    { id: "compose", label: "Compose", icon: PencilSimpleIcon },
    { id: "drafts", label: "Drafts", icon: FileIcon, count: drafts.length },
    { id: "scheduled", label: "Scheduled", icon: CalendarIcon, count: scheduled.length },
    { id: "posted", label: "Posted", icon: ClockIcon, count: posted.length },
  ] as const;

  return (
    <div className="min-h-screen bg-background noise">
      {/* Toast notifications */}
      {postSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in-up flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 shadow-lg">
          <CheckCircleIcon className="h-5 w-5 text-green-500" weight="fill" />
          <span className="text-sm text-green-500 font-medium">
            {isTwitterConnected ? "Posted to X successfully!" : "Tweet saved!"}
          </span>
        </div>
      )}
      {postError && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in-up flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 shadow-lg max-w-sm">
          <WarningIcon className="h-5 w-5 text-destructive shrink-0" weight="fill" />
          <span className="text-sm text-destructive font-medium">{postError}</span>
        </div>
      )}

      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-6 py-8">
        {/* Header */}
        <header className="mb-8 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-display text-lg">
                  {profile.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-display text-2xl text-foreground">
                  {profile.name}
                </h1>
                <p className="text-sm text-muted-foreground">@{profile.handle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isTwitterConnected ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" weight="fill" />
                  <span className="text-sm text-green-500 font-medium">
                    @{profile.twitter_username || "Connected"}
                  </span>
                </div>
              ) : (
                <Button
                  onClick={connectTwitter}
                  variant="outline"
                  size="sm"
                  className="border-border/50 hover:border-foreground/50 hover:bg-foreground/5 transition-smooth"
                >
                  <XLogoIcon className="h-4 w-4 mr-2" weight="bold" />
                  Connect X
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="mb-6 animate-fade-in-up stagger-1">
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                  transition-smooth
                  ${activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {'count' in tab && tab.count > 0 && (
                  <Badge
                    variant="secondary"
                    className={`
                      ml-1 h-5 min-w-5 px-1.5 text-xs
                      ${activeTab === tab.id ? "bg-primary/10 text-primary" : ""}
                    `}
                  >
                    {tab.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        {activeTab === "compose" && (
          <div className="space-y-6">
            {/* Compose Card */}
            <div className="animate-fade-in-up stagger-2 bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              {/* Compose Area */}
              <div className="p-6">
                <div className="flex gap-4">
                  {/* Avatar */}
                  <Avatar className="h-11 w-11 shrink-0 ring-2 ring-primary/10 ring-offset-2 ring-offset-card">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-display">
                      {profile.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Input Area */}
                  <div className="flex-1 min-w-0 pt-1">
                    <textarea
                      value={tweetContent}
                      onChange={(e) => setTweetContent(e.target.value)}
                      placeholder="What's happening?"
                      className="min-h-[120px] w-full resize-none border-none bg-transparent p-0 text-[17px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>

                {/* Toolbar */}
                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-smooth">
                      <ImageIcon className="h-5 w-5" />
                    </button>
                    <button className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-smooth">
                      <GifIcon className="h-5 w-5" />
                    </button>
                    <button className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-smooth">
                      <HashIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Circular Progress */}
                    <div className="relative h-8 w-8">
                      <svg className="h-8 w-8 -rotate-90">
                        <circle
                          cx="16"
                          cy="16"
                          r="12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          className="text-muted/50"
                        />
                        <circle
                          cx="16"
                          cy="16"
                          r="12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeDasharray={75.4}
                          strokeDashoffset={75.4 - (75.4 * Math.min(charPercentage, 100)) / 100}
                          className={`
                            transition-all duration-300
                            ${charPercentage > 100
                              ? "text-destructive"
                              : charPercentage > 90
                                ? "text-amber-500"
                                : "text-primary"
                            }
                          `}
                          strokeLinecap="round"
                        />
                      </svg>
                      {charCount > 260 && (
                        <span className={`
                          absolute inset-0 flex items-center justify-center text-xs font-medium
                          ${charCount > maxChars ? "text-destructive" : "text-muted-foreground"}
                        `}>
                          {maxChars - charCount}
                        </span>
                      )}
                    </div>

                    <div className="h-6 w-px bg-border/50" />

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={saveDraft}
                      disabled={!tweetContent.trim()}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <BookmarkSimpleIcon className="h-4 w-4 mr-2" />
                      Save
                    </Button>

                    <Button
                      onClick={postTweet}
                      disabled={!tweetContent.trim() || charCount > maxChars || isPosting}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 glow-sm px-6"
                    >
                      {isPosting ? (
                        <>
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                          Posting...
                        </>
                      ) : (
                        <>
                          <PaperPlaneTiltIcon className="h-4 w-4 mr-2" weight="fill" />
                          {isTwitterConnected ? "Post to X" : "Post"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Assistant Panel */}
            <div className="animate-fade-in-up stagger-3 bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <SparkleIcon className="h-5 w-5 text-primary" weight="fill" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg text-foreground">AI Assistant</h2>
                    <p className="text-sm text-muted-foreground">Let me help craft your message</p>
                  </div>
                </div>

                {/* Quick Prompts */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {quickPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setAiPrompt(prompt.text)}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                        border border-border/50 bg-background/50
                        text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5
                        transition-smooth
                      `}
                    >
                      <prompt.icon className="h-4 w-4" />
                      {prompt.text}
                    </button>
                  ))}
                </div>

                {/* AI Input */}
                <div className="relative flex items-center gap-3 p-3 rounded-xl bg-background/80 border border-border/30">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        generateAiSuggestion();
                      }
                    }}
                    placeholder="Describe what you want to say..."
                    className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                  <Button
                    size="icon"
                    onClick={generateAiSuggestion}
                    disabled={!aiPrompt.trim() || isGenerating}
                    className="h-9 w-9 shrink-0 rounded-lg bg-primary hover:bg-primary/90"
                  >
                    {isGenerating ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    ) : (
                      <ArrowRightIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* AI Suggestion */}
                {aiSuggestion && (
                  <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed mb-4">
                      {aiSuggestion}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={useSuggestion}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Use this
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(aiSuggestion, "ai")}
                        className="border-primary/20 hover:bg-primary/5"
                      >
                        {copiedId === "ai" ? (
                          <CheckIcon className="h-4 w-4 mr-2 text-green-500" />
                        ) : (
                          <CopyIcon className="h-4 w-4 mr-2" />
                        )}
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAiSuggestion("")}
                        className="text-muted-foreground"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Drafts Tab */}
        {activeTab === "drafts" && (
          <div className="animate-fade-in-up stagger-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              </div>
            ) : drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <FileIcon className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-display text-xl text-foreground mb-2">No drafts yet</h3>
                <p className="text-muted-foreground max-w-sm">
                  Start composing and save your ideas here for later
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {drafts.map((draft, i) => (
                  <div
                    key={draft.id}
                    className={`
                      p-5 bg-card rounded-xl border border-border/50
                      hover:border-primary/20 hover:shadow-sm
                      transition-smooth animate-fade-in-up
                    `}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed mb-4">
                      {draft.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(draft.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(draft.content, draft.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {copiedId === draft.id ? (
                            <CheckIcon className="h-4 w-4 text-green-500" />
                          ) : (
                            <CopyIcon className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadDraft(draft)}
                          className="border-primary/20 hover:bg-primary/5 hover:border-primary/40"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDraft(draft.id)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scheduled Tab */}
        {activeTab === "scheduled" && (
          <div className="animate-fade-in-up stagger-2 flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <CalendarIcon className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-display text-xl text-foreground mb-2">No scheduled posts</h3>
            <p className="text-muted-foreground max-w-sm">
              Schedule your posts to publish at the perfect time
            </p>
          </div>
        )}

        {/* Posted Tab */}
        {activeTab === "posted" && (
          <div className="animate-fade-in-up stagger-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              </div>
            ) : posted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <CheckIcon className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-display text-xl text-foreground mb-2">No posts yet</h3>
                <p className="text-muted-foreground max-w-sm">
                  Your published posts will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {posted.map((post, i) => (
                  <div
                    key={post.id}
                    className={`
                      p-5 bg-card rounded-xl border border-border/50
                      transition-smooth animate-fade-in-up
                    `}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed mb-4">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400">
                        <CheckIcon className="h-3.5 w-3.5" weight="bold" />
                        Posted
                      </div>
                      <span className="text-muted-foreground">
                        {post.posted_at &&
                          new Date(post.posted_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
