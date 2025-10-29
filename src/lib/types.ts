
import type { Timestamp } from "firebase/firestore";

export type MovieCategory = 'movie' | 'web-series' | 'podcast' | 'other';

export interface Movie {
  id: string;
  title: string;
  url: string;
  votes: number;
  createdAt: Timestamp | string;
  thumbnailUrl?: string;
  category?: MovieCategory;
  // YouTube API data
  channelTitle?: string;
  viewCount?: string;
  publishedAt?: string;
  channelThumbnailUrl?: string;
  duration?: number; // Duration in seconds
}

export interface User {
    id: string;
    name: string;
    coins: number;
}

export interface ChatMessage {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    timestamp: Timestamp;
    isBroadcast?: boolean;
}

export interface ChatThread {
    id: string;
    userId: string;
    userName: string;
    lastMessage: string;
    lastUpdated: Timestamp;
}
