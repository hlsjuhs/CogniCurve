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
  
  // SRS Specific Fields
  currentInterval: number; // Days (can be fractional)
  stability: number; // The 'S' factor
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

export interface MultiplierConfig {
  multiplier: number; // 间隔倍率
  stabilityMod: number; // 稳定度变化系数 (e.g. 1.2 for +20%)
}

export interface AlgorithmSettings {
  [Difficulty.EASY]: MultiplierConfig;
  [Difficulty.MEDIUM]: MultiplierConfig;
  [Difficulty.HARD]: MultiplierConfig;
  [Difficulty.FORGOTTEN]: MultiplierConfig;
}