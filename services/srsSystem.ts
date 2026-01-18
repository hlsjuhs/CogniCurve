import { LearningItem, Difficulty, AlgorithmSettings } from '../types';

export const DEFAULT_SETTINGS: AlgorithmSettings = {
  [Difficulty.EASY]: { multiplier: 1.5, stabilityMod: 1.2 },
  [Difficulty.MEDIUM]: { multiplier: 1.0, stabilityMod: 1.1 },
  [Difficulty.HARD]: { multiplier: 0.8, stabilityMod: 1.05 },
  [Difficulty.FORGOTTEN]: { multiplier: 0.5, stabilityMod: 0.5 },
};

/**
 * Calculates the next review schedule.
 * Enhanced to support 'Learning Phase' (Intraday intervals).
 */
export const calculateNextReview = (
  item: LearningItem,
  difficulty: Difficulty,
  settings: AlgorithmSettings
): Partial<LearningItem> => {
  const config = settings[difficulty];
  const now = new Date();
  
  // Current state
  let currentS = item.stability || 1.0;
  
  // --- INTRADAY / LEARNING PHASE LOGIC ---
  // If item is New or in Learning/Re-learning phase (interval < 1 day)
  // We want to ensure it comes back TODAY unless it's easy.
  if (item.status === 'new' || item.status === 'learning' || item.currentInterval < 1) {
      let nextIntervalDays = 0;
      let nextStatus: 'learning' | 'review' | 'mastered' = 'learning';

      if (difficulty === Difficulty.EASY) {
          // Easy -> Graduate to Review Mode immediately (1 day)
          nextIntervalDays = 1;
          nextStatus = 'review';
          currentS = Math.max(currentS, 1.5); // Boost stability
      } else if (difficulty === Difficulty.MEDIUM) {
          // Medium -> Small Step (e.g. 30 mins -> 1 day)
          // If it was already a short interval (e.g. 10 mins), graduate to 1 day.
          // If it is fresh new, set to ~30 mins (0.021 days).
          if (item.currentInterval > 0.01 && item.currentInterval < 0.5) {
               // Second step: Graduate to 1 day
               nextIntervalDays = 1;
               nextStatus = 'review';
          } else {
               // First step: ~30 minutes (0.021 days)
               nextIntervalDays = 0.021; 
          }
      } else if (difficulty === Difficulty.HARD) {
          // Hard -> Repeat very soon (5 mins)
          nextIntervalDays = 0.0035; // Approx 5 mins
          nextStatus = 'learning';
      } else {
          // Forgotten -> Immediate (1 min)
          nextIntervalDays = 0.0007; // 1 min
          nextStatus = 'learning';
      }

      // Calculate Date
      const nextDate = new Date(now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000);

      return {
          lastReviewedAt: now,
          nextReviewAt: nextDate,
          currentInterval: nextIntervalDays,
          stability: currentS, // Keep stability mostly static during learning phase
          retentionScore: 100, // Just reviewed
          reviewCount: item.reviewCount + 1,
          status: nextStatus
      };
  }

  // --- REVIEW PHASE LOGIC (Days) ---
  
  // Calculate new metrics
  const newStability = parseFloat((currentS * config.stabilityMod).toFixed(2));
  
  // Calculate raw next interval
  let nextIntervalDays = item.currentInterval * config.multiplier * newStability;

  // Logic boundaries for Review Mode
  if (difficulty === Difficulty.FORGOTTEN) {
      // Lapse: Back to Learning Phase (Intraday)
      nextIntervalDays = 0.007; // 10 mins
      return {
        lastReviewedAt: now,
        nextReviewAt: new Date(now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000),
        currentInterval: nextIntervalDays,
        stability: Math.max(0.5, currentS * 0.5), // Stability hit
        retentionScore: 0,
        reviewCount: item.reviewCount + 1,
        status: 'learning' // Demoted to learning
      };
  } 
  
  // Normal spacing
  if (difficulty === Difficulty.HARD) {
      // Hard: Interval grows slower or stays same, but doesn't shrink to 0
      nextIntervalDays = Math.max(item.currentInterval * 1.2, 1);
  } else {
      // Ensure minimum growth
      if (nextIntervalDays <= item.currentInterval) {
          nextIntervalDays = item.currentInterval * 1.3; 
      }
  }

  // Cap interval (e.g., 365 days max) if desired
  nextIntervalDays = parseFloat(nextIntervalDays.toFixed(4));

  // Calculate Date
  const nextDate = new Date(now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000);

  // Update Retention Score Simulation
  let newRetention = 100;
  if (difficulty === Difficulty.HARD) newRetention = 85;
  else if (difficulty === Difficulty.MEDIUM) newRetention = 95;
  else newRetention = 100;

  return {
    lastReviewedAt: now,
    nextReviewAt: nextDate,
    currentInterval: nextIntervalDays,
    stability: newStability,
    retentionScore: newRetention,
    reviewCount: item.reviewCount + 1,
    status: 'review'
  };
};

export const getEbbinghausSchedule = () => [
    { day: 0, label: '初次学习' },
    { day: 0.007, label: '10分钟后' },
    { day: 0.04, label: '1小时后' },
    { day: 1, label: '1天后' },
    { day: 2, label: '2天后' },
    { day: 4, label: '4天后' },
    { day: 7, label: '7天后' },
    { day: 15, label: '15天后' },
    { day: 30, label: '30天后' },
];