
// Add Global Definition for Electron API
declare global {
  interface Window {
    electronAPI?: {
      saveImage: (dataUrl: string) => Promise<string>;
      saveFile: (filename: string, content: string) => Promise<string>; // New API
      openExternal: (url: string) => Promise<void>;
      openPath: (path: string) => Promise<void>;
    };
  }
}

export enum CardType {
  BASIC = '基础闪卡',
  CLOZE = '填空/完形',
  VISUAL = '视觉笔记',
  CASE = '综合应用'
}

export enum Difficulty {
  EASY = '简单',
  MEDIUM = '一般',
  HARD = '困难',
  FORGOTTEN = '已遗忘'
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

// FSRS State: 0=New, 1=Learning, 2=Review, 3=Relearning
export enum FSRSState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3
}

export interface LearningItem {
  id: string;
  type: CardType;
  title: string;
  contentFront: string;
  contentBack: string;
  extraContext?: string;
  mediaUrl?: string;
  tags: Tag[];
  createdAt: Date;
  lastReviewedAt: Date | null;
  nextReviewAt: Date;
  retentionScore: number; // 0-100%
  reviewCount: number;
  status: 'new' | 'learning' | 'review' | 'mastered';
  
  // Standard Fields (kept for UI compatibility)
  currentInterval: number; // Days
  stability: number; // Used as 'S' in FSRS

  // FSRS Specific Fields
  fsrsDifficulty?: number; // D (1-10)
  fsrsState?: FSRSState;   // State (New/Learning/Review/Relearning)
  fsrsLastReview?: Date;   // Precise timestamp for calculation
}

export interface ReviewLog {
  itemId: string;
  date: Date;
  difficulty: Difficulty;
  timeSpentSeconds: number;
}

export interface DailyStats {
  date: string;
  reviewsCompleted: number;
  newCardsAdded: number;
}

// FSRS Settings replace the old MultiplierConfig
export interface AlgorithmSettings {
  requestRetention: number; // 0.7 to 0.99 (Default 0.9)
  maximumInterval: number;  // Days (e.g., 36500)
  w: number[];             // FSRS Weights (17/19 params)
}