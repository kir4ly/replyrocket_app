export interface UserProfile {
  name: string;
  handle: string;
  bio: string;
  tone: string;
  topics: string;
  avatarUrl?: string;
}

export interface Tweet {
  id: string;
  content: string;
  createdAt: Date;
  scheduledFor?: Date;
  postedAt?: Date;
  status: "draft" | "scheduled" | "posted";
}
