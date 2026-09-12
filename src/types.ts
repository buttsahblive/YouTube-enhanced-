export interface Video {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId?: string;
  subscriberCount?: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  commentCount?: string;
  duration: string;
  thumbnail: string;
  category?: string;
  tags?: string[];
}

export interface VideoComment {
  id: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  textDisplay: string;
  likeCount: number;
  publishedAt: string;
}

export interface UserPreferences {
  autoplay?: boolean;
  defaultPlaybackSpeed?: number;
  preferredCategory?: string;
  theme?: "stone" | "dark";
  showCaptions?: boolean;
}

export interface UserStats {
  videosWatchedCount?: number;
  likedVideosCount?: number;
  watchLaterCount?: number;
  lastWatchedVideoTitle?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  channelCustomName?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  emailVerified?: boolean;
  providerId?: string;
  preferences?: UserPreferences;
  stats?: UserStats;
}

export interface AISummaryChapter {
  timestamp: string;
  seconds: number;
  title: string;
}

export interface AISummary {
  overview: string;
  keyTakeaways: string[];
  actionItems: string[];
  chapters?: AISummaryChapter[];
}

export interface AIQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

