"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription, AlertAction } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Profile, Tweet, supabase } from "@/lib/supabase";
import { createTweet, getTweets, deleteTweet, clearTwitterCredentials } from "@/lib/db";
import {
  Pencil,
  File,
  Calendar as CalendarIcon,
  Clock,
  ImageIcon,
  Hash,
  ArrowUp,
  Trash2,
  Check,
  Copy,
  Sparkles,
  Send,
  Bookmark,
  Zap,
  X,
  LogOut,
  ChevronsUpDown,
  Rocket,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { XLogoIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

interface ComposeAppProps {
  profile: Profile;
  onSignOut: () => void;
}

export function ComposeApp({ profile: initialProfile, onSignOut }: ComposeAppProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [tweetContent, setTweetContent] = useState("");
  const [scheduleContent, setScheduleContent] = useState("");
  const [activeTab, setActiveTab] = useState<"compose" | "drafts" | "scheduling" | "posted">("compose");
  const [aiPrompt, setAiPrompt] = useState("");
  const [scheduleAiPrompt, setScheduleAiPrompt] = useState("");
  const [scheduleAiSuggestion, setScheduleAiSuggestion] = useState("");
  const [isScheduleGenerating, setIsScheduleGenerating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [drafts, setDrafts] = useState<Tweet[]>([]);
  const [scheduled, setScheduled] = useState<Tweet[]>([]);
  const [posted, setPosted] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState("");
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  const isTwitterConnected = !!profile.twitter_access_token;
  const charCount = tweetContent.length;
  const maxChars = 280;

  // Check for Twitter connection on mount (from OAuth callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("twitter_connected") === "true") {
      window.location.href = "/";
    }
  }, []);

  const loadTweets = useCallback(async () => {
    try {
      const [draftsData, scheduledData, postedData] = await Promise.all([
        getTweets(profile.id, "draft").catch(() => []),
        getTweets(profile.id, "scheduled").catch(() => []),
        getTweets(profile.id, "posted").catch(() => []),
      ]);
      setDrafts(draftsData);
      setScheduled(scheduledData);
      setPosted(postedData);
    } catch (error) {
      // Silently fail - tweets table might not exist yet
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
      toast.error("Failed to generate tweet. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const useSuggestion = () => {
    setTweetContent(aiSuggestion);
    setAiSuggestion("");
    setAiPrompt("");
    toast.success("Tweet added to composer!");
  };

  const generateScheduleAiSuggestion = async () => {
    if (!scheduleAiPrompt.trim()) return;

    setIsScheduleGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: scheduleAiPrompt,
          userProfile: {
            name: profile.name,
            handle: profile.handle,
            bio: profile.bio,
            tone: profile.tone,
            topics: profile.topics,
          },
          currentDraft: scheduleContent,
        }),
      });

      const data = await response.json();
      if (data.result) {
        setScheduleAiSuggestion(data.result);
      }
    } catch (error) {
      console.error("Failed to generate:", error);
    } finally {
      setIsScheduleGenerating(false);
    }
  };

  const useScheduleSuggestion = () => {
    setScheduleContent(scheduleAiSuggestion);
    setScheduleAiSuggestion("");
    setScheduleAiPrompt("");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be less than 20MB");
      return;
    }

    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setUploadedImage(previewUrl);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = () => {
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage);
    }
    setUploadedImage(null);
    setImageFile(null);
  };

  const saveDraft = async () => {
    if (!tweetContent.trim()) return;

    try {
      const newDraft = await createTweet({
        profile_id: profile.id,
        content: tweetContent,
        status: "draft",
      });
      setDrafts(prev => [newDraft, ...prev]);
      setTweetContent("");
      removeImage();
      toast.success("Draft saved!");
    } catch (error) {
      console.error("Failed to save draft:", error);
      toast.error("Failed to save draft");
    }
  };

  const postTweet = async () => {
    if (!tweetContent.trim()) return;

    setIsPosting(true);

    try {
      // Convert image to base64 if present
      let imageBase64: string | undefined;
      if (imageFile) {
        const arrayBuffer = await imageFile.arrayBuffer();
        imageBase64 = Buffer.from(arrayBuffer).toString("base64");
      }

      if (isTwitterConnected) {
        const response = await fetch("/api/twitter/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: profile.id,
            content: tweetContent,
            imageBase64,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to post to Twitter");
        }
      }

      const newPost = await createTweet({
        profile_id: profile.id,
        content: tweetContent,
        status: "posted",
        posted_at: new Date().toISOString(),
      });
      setPosted([newPost, ...posted]);
      setTweetContent("");
      removeImage();
      toast.success(isTwitterConnected ? "Posted to X successfully!" : "Tweet saved!");
    } catch (error) {
      console.error("Failed to post tweet:", error);
      toast.error(error instanceof Error ? error.message : "Failed to post tweet");
    } finally {
      setIsPosting(false);
    }
  };

  const scheduleTweet = async (scheduledFor: Date) => {
    if (!scheduleContent.trim()) return;

    try {
      const newScheduled = await createTweet({
        profile_id: profile.id,
        content: scheduleContent,
        status: "scheduled",
        scheduled_for: scheduledFor.toISOString(),
      });
      setScheduled(prev => [newScheduled, ...prev]);
      setScheduleContent("");
      setScheduleDate(undefined);
      setScheduleTime("");
      toast.success("Tweet scheduled successfully!");
    } catch (error) {
      console.error("Failed to schedule tweet:", error);
      toast.error("Failed to schedule tweet");
    }
  };

  const handleQuickSchedule = (option: string) => {
    const now = new Date();
    let scheduledFor: Date;

    switch (option) {
      case "1hour":
        scheduledFor = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case "3hours":
        scheduledFor = new Date(now.getTime() + 3 * 60 * 60 * 1000);
        break;
      case "tomorrow9am":
        scheduledFor = new Date(now);
        scheduledFor.setDate(scheduledFor.getDate() + 1);
        scheduledFor.setHours(9, 0, 0, 0);
        break;
      case "tomorrow6pm":
        scheduledFor = new Date(now);
        scheduledFor.setDate(scheduledFor.getDate() + 1);
        scheduledFor.setHours(18, 0, 0, 0);
        break;
      default:
        return;
    }

    scheduleTweet(scheduledFor);
  };

  const handleCustomSchedule = () => {
    if (!scheduleDate || !scheduleTime) return;
    const [hours, minutes] = scheduleTime.split(":").map(Number);
    const scheduledFor = new Date(scheduleDate);
    scheduledFor.setHours(hours, minutes, 0, 0);
    if (scheduledFor <= new Date()) {
      toast.error("Cannot schedule in the past");
      return;
    }
    scheduleTweet(scheduledFor);
  };

  const cancelScheduledTweet = async (id: string) => {
    try {
      await deleteTweet(id);
      setScheduled(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error("Failed to cancel scheduled tweet:", error);
    }
  };

  const connectTwitter = () => {
    document.cookie = `replyrocket_profile_id=${profile.id}; path=/; max-age=600`;
    window.location.href = "/api/twitter/auth";
  };

  const disconnectTwitter = async () => {
    if (!confirm("Disconnect your X account?")) return;

    try {
      await clearTwitterCredentials(profile.id);
      window.location.reload();
    } catch (error) {
      console.error("Failed to disconnect Twitter:", error);
      alert("Failed to disconnect: " + (error as Error).message);
    }
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
    { text: "Hook for my audience", icon: Zap },
    { text: "Engaging question", icon: Hash },
    { text: "Share expertise tip", icon: Sparkles },
    { text: "Thread opener", icon: Pencil },
  ];

  const navItems = [
    { id: "compose" as const, label: "Compose", icon: Pencil },
    { id: "drafts" as const, label: "Drafts", icon: File, count: drafts.length },
    { id: "scheduling" as const, label: "Scheduling", icon: CalendarIcon, count: scheduled.length },
    { id: "posted" as const, label: "Posted", icon: Clock, count: posted.length },
  ];

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip="ReplyRocket">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Rocket className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">ReplyRocket</span>
                  <span className="truncate text-xs text-muted-foreground">AI Composer</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={activeTab === item.id}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <SidebarMenuBadge>{item.count}</SidebarMenuBadge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={isTwitterConnected ? profile.twitter_name : profile.name}
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={isTwitterConnected ? profile.twitter_profile_image_url : profile.avatar_url} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                        {(isTwitterConnected ? profile.twitter_name : profile.name)?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {isTwitterConnected ? profile.twitter_name : profile.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        @{isTwitterConnected ? profile.twitter_username : profile.handle}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuItem onClick={isTwitterConnected ? disconnectTwitter : connectTwitter}>
                    <XLogoIcon className="mr-2 h-4 w-4" weight="bold" />
                    {isTwitterConnected ? `Disconnect @${profile.twitter_username}` : "Connect X Account"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">
              {navItems.find(item => item.id === activeTab)?.label}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isTwitterConnected && (
              <Badge variant="outline" className="text-green-500 border-green-500/30">
                <XLogoIcon className="h-3 w-3 mr-1" weight="bold" />
                Connected
              </Badge>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-2xl">
            {/* Compose Tab */}
            {activeTab === "compose" && (
              <FieldGroup>
                {/* Tweet Composer */}
                <Card>
                  <CardHeader>
                    <CardTitle>Compose Tweet</CardTitle>
                    <CardDescription>Write your tweet and post it to X</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field orientation="horizontal">
                        <Avatar size="lg">
                          <AvatarImage src={isTwitterConnected ? profile.twitter_profile_image_url : profile.avatar_url} />
                          <AvatarFallback>
                            {(isTwitterConnected ? profile.twitter_name : profile.name)?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <FieldGroup>
                          <Textarea
                            id="tweet-content"
                            placeholder="What's happening?"
                            value={tweetContent}
                            onChange={(e) => setTweetContent(e.target.value)}
                          />
                          <FieldDescription>
                            <Badge variant={charCount > maxChars ? "destructive" : "secondary"}>
                              {charCount}/{maxChars}
                            </Badge>
                          </FieldDescription>
                        </FieldGroup>
                      </Field>

                      {/* Image Preview */}
                      {uploadedImage && (
                        <Alert>
                          <ImageIcon />
                          <AlertTitle>Image attached</AlertTitle>
                          <AlertDescription>
                            <img
                              src={uploadedImage}
                              alt="Upload preview"
                              className="max-h-48 rounded-lg object-cover mt-2"
                            />
                          </AlertDescription>
                          <AlertAction>
                            <Button size="icon-sm" variant="ghost" onClick={removeImage}>
                              <X />
                            </Button>
                          </AlertAction>
                        </Alert>
                      )}
                    </FieldGroup>
                  </CardContent>
                  <CardFooter className="gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <ImageIcon />
                      Add Image
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button variant="outline" size="sm" onClick={saveDraft} disabled={!tweetContent.trim()}>
                      <Bookmark />
                      Save Draft
                    </Button>
                    <Button size="lg" className="ml-auto" onClick={postTweet} disabled={!tweetContent.trim() || charCount > maxChars || isPosting}>
                      {isPosting && <Spinner size="sm" />}
                      Post
                    </Button>
                  </CardFooter>
                </Card>

                {/* AI Generator */}
                <Card>
                  <CardHeader>
                    <CardTitle>AI Tweet Generator</CardTitle>
                    <CardDescription>Describe what you want to tweet and I'll write it for you</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field>
                        <Input
                          id="ai-prompt"
                          placeholder="e.g., Share a tip about productivity..."
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              generateAiSuggestion();
                            }
                          }}
                          disabled={isGenerating}
                        />
                      </Field>

                      <Field orientation="horizontal" className="justify-center">
                        {quickPrompts.map((prompt) => (
                          <Button
                            key={prompt.text}
                            variant="outline"
                            size="sm"
                            onClick={() => setAiPrompt(prompt.text)}
                          >
                            {prompt.text}
                          </Button>
                        ))}
                      </Field>

                      <Button onClick={generateAiSuggestion} disabled={!aiPrompt.trim() || isGenerating}>
                        {isGenerating && <Spinner size="sm" />}
                        {isGenerating ? "Generating..." : "Generate Tweet"}
                      </Button>

                      {/* AI Suggestion */}
                      {aiSuggestion && (
                        <Alert>
                          <Sparkles />
                          <AlertTitle>Generated Tweet</AlertTitle>
                          <AlertDescription>{aiSuggestion}</AlertDescription>
                          <AlertAction>
                            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(aiSuggestion, "suggestion")}>
                              {copiedId === "suggestion" ? <Check /> : <Copy />}
                            </Button>
                          </AlertAction>
                        </Alert>
                      )}

                      {aiSuggestion && (
                        <Field orientation="horizontal">
                          <Button variant="outline" onClick={() => setAiSuggestion("")}>
                            <X />
                            Discard
                          </Button>
                          <Button onClick={() => useSuggestion()}>
                            <ArrowUp />
                            Use This Tweet
                          </Button>
                        </Field>
                      )}
                    </FieldGroup>
                  </CardContent>
                </Card>
              </FieldGroup>
            )}

            {/* Drafts Tab */}
            {activeTab === "drafts" && (
              <FieldGroup>
                {isLoading ? (
                  <Card>
                    <CardContent className="py-20">
                      <Spinner size="lg" />
                    </CardContent>
                  </Card>
                ) : drafts.length === 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>No drafts yet</CardTitle>
                      <CardDescription>Start composing and save your ideas here for later</CardDescription>
                    </CardHeader>
                  </Card>
                ) : (
                  drafts.map((draft) => (
                    <Card key={draft.id}>
                      <CardContent>
                        <FieldGroup>
                          <Field>
                            <FieldDescription>{draft.content}</FieldDescription>
                          </Field>
                        </FieldGroup>
                      </CardContent>
                      <CardFooter className="gap-2">
                        <Badge variant="secondary">
                          {new Date(draft.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto"
                          onClick={() => copyToClipboard(draft.content, draft.id)}
                        >
                          {copiedId === draft.id ? <Check /> : <Copy />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadDraft(draft)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDraft(draft.id)}
                        >
                          <Trash2 />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </FieldGroup>
            )}

            {/* Scheduling Tab */}
            {activeTab === "scheduling" && (
              <FieldGroup>
                {/* Schedule New Tweet */}
                <Card>
                  <CardHeader>
                    <CardTitle>Schedule Tweet</CardTitle>
                    <CardDescription>Write your tweet and pick when to post it</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field>
                        <Textarea
                          placeholder="What do you want to schedule?"
                          value={scheduleContent}
                          onChange={(e) => setScheduleContent(e.target.value)}
                        />
                        <FieldDescription>
                          <Badge variant={scheduleContent.length > 280 ? "destructive" : "secondary"}>
                            {scheduleContent.length}/280
                          </Badge>
                        </FieldDescription>
                      </Field>

                      <Field>
                        <FieldLabel>Quick schedule</FieldLabel>
                        <Field orientation="horizontal" className="justify-start">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickSchedule("1hour")}
                            disabled={!scheduleContent.trim()}
                          >
                            In 1 hour
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickSchedule("3hours")}
                            disabled={!scheduleContent.trim()}
                          >
                            In 3 hours
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickSchedule("tomorrow9am")}
                            disabled={!scheduleContent.trim()}
                          >
                            Tomorrow 9am
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickSchedule("tomorrow6pm")}
                            disabled={!scheduleContent.trim()}
                          >
                            Tomorrow 6pm
                          </Button>
                        </Field>
                      </Field>

                      <Field>
                        <FieldLabel>Custom date & time</FieldLabel>
                        <Field orientation="horizontal">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {scheduleDate ? format(scheduleDate, "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={scheduleDate}
                                onSelect={setScheduleDate}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              />
                            </PopoverContent>
                          </Popover>
                          <Input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                          />
                          <Button
                            onClick={handleCustomSchedule}
                            disabled={!scheduleContent.trim() || !scheduleDate || !scheduleTime}
                          >
                            Schedule
                          </Button>
                        </Field>
                      </Field>
                    </FieldGroup>
                  </CardContent>
                </Card>

                {/* Scheduled Tweets List */}
                {scheduled.length === 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>No scheduled tweets</CardTitle>
                      <CardDescription>Schedule a tweet above to see it here</CardDescription>
                    </CardHeader>
                  </Card>
                ) : (
                  scheduled.map((tweet) => (
                    <Card key={tweet.id}>
                      <CardContent>
                        <FieldGroup>
                          <Field>
                            <FieldDescription>{tweet.content}</FieldDescription>
                          </Field>
                        </FieldGroup>
                      </CardContent>
                      <CardFooter className="gap-2">
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {tweet.scheduled_for && new Date(tweet.scheduled_for).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto"
                          onClick={() => cancelScheduledTweet(tweet.id)}
                        >
                          <X />
                          Cancel
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </FieldGroup>
            )}

            {/* Posted Tab */}
            {activeTab === "posted" && (
              <div>
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Spinner size="lg" />
                  </div>
                ) : posted.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <Check className="h-8 w-8 text-primary/50" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">No posts yet</h3>
                    <p className="text-muted-foreground max-w-sm">
                      Your published posts will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {posted.map((post) => (
                      <Card key={post.id}>
                        <CardContent className="pt-4 pb-4">
                          <p className="text-foreground whitespace-pre-wrap leading-relaxed mb-4">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                              <Check className="h-3 w-3 mr-1" />
                              Posted
                            </Badge>
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
