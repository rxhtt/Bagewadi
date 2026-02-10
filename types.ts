import React from 'react';

export type ModelID = 'sonar-pro' | 'gpt-4o' | 'claude-3.5' | 'gemini-3-pro-preview';

export type ImageProvider = 'openai' | 'stability' | 'replicate';

export interface Source {
  title: string;
  uri: string;
}

export interface AttachedFile {
  name: string;
  type: string;
  size: number;
  data: string; // Base64
  content?: string; 
}

export type MediaItemType = 'video' | 'music' | 'short';

export interface YoutubeShort {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  type?: MediaItemType;
  description?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image';
  imageUrl?: string;
  sources?: Source[];
  shorts?: YoutubeShort[];
  relatedQuestions?: string[];
  isSearching?: boolean;
  attachment?: AttachedFile;
  modelUsed?: ModelID | ImageProvider;
}

export interface Thread {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

export enum SearchFocus {
  ALL = 'All',
  ACADEMIC = 'Academic',
  WRITING = 'Writing',
  WOLFRAM = 'WolframAlpha',
  YOUTUBE = 'YouTube',
  REDDIT = 'Reddit',
  CANVAS = 'Canvas',
  MUSIC = 'Music'
}

export interface FocusOption {
  id: SearchFocus;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export type AppView = 'home' | 'discover' | 'library' | 'profile';
export type DiscoveryMode = 'all' | 'youtube' | 'shorts' | 'music';

export interface KeyStatus {
  key: string;
  status: 'active' | 'limited' | 'invalid' | 'unchecked';
}