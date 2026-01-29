
import { LearningItem, Difficulty, AlgorithmSettings, FSRSState } from '../types';

// Default FSRS Weights (v4.5 Benchmark Defaults)
const DEFAULT_W = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61
];

export const DEFAULT_SETTINGS: AlgorithmSettings = {
  requestRetention: 0.9, // 90% retention target
  maximumInterval: 36500, // 100 years
  w: DEFAULT_W
};

/**
 * Maps UI Difficulty to FSRS Grade
 * Forgotten -> 1 (Again)
 * Hard      -> 2 (Hard)
 * Medium    -> 3 (Good)
 * Easy      -> 4 (Easy)
 */
const mapDifficultyToGrade = (d: Difficulty): number => {
  switch (d) {
    case Difficulty.FORGOTTEN: return 1;
    case Difficulty.HARD: return 2;
    case Difficulty.MEDIUM: return 3;
    case Difficulty.EASY: return 4;
    default: return 3;
  }
};

/**
 * FSRS Algorithm Implementation
 */
export const calculateNextReview = (
  item: LearningItem,
  difficulty: Difficulty,
  settings: AlgorithmSettings
): Partial<LearningItem> => {
  const now = new Date();
  const grade = mapDifficultyToGrade(difficulty);
  const w = settings.w || DEFAULT_W;
  const requestRetention = settings.requestRetention || 0.9;
  const maxInterval = settings.maximumInterval || 36500;

  // 1. Initialize or Migrate Data
  // If item lacks FSRS fields, initialize them from existing simple data
  let s = item.stability || 0.5; // Stability (days)
  let d = item.fsrsDifficulty || 5.0; // Difficulty (1-10)
  let state = item.fsrsState ?? (item.status === 'new' ? FSRSState.New : FSRSState.Review);
  
  // Calculate elapsed days since last review
  // If never reviewed, elapsed is 0
  const lastReview = item.fsrsLastReview || item.lastReviewedAt || item.createdAt;
  const elapsedDays = Math.max(0, (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24));

  // 2. FSRS Core Logic
  
  // Helper: Calculate Retrievability (R) at time t
  // R = (1 + t / (9 * S)) ^ -1
  const retrievability = Math.pow(1 + elapsedDays / (9 * s), -1);

  if (state === FSRSState.New) {
    // --- Initial Learning Phase ---
    // Initialize D and S based on first grade
    // D0(g) = w[0] + w[1](g-1)
    d = w[0] + w[1] * (grade - 1);
    // S0(g) = w[grade + 1]  (grade 1->w[2], 2->w[3], 3->w[4], 4->w[5])
    s = w[grade + 1];
    
    // State transition
    state = grade === 1 ? FSRSState.Learning : FSRSState.Review; // Typically first pass moves to Review unless 'Again'

  } else if (state === FSRSState.Learning || state === FSRSState.Relearning) {
    // --- Learning / Relearning Steps ---
    // Short term scheduling logic (Simplified FSRS)
    // Update D
    d += w[6] * (grade - 3);
    d = Math.min(Math.max(d, 1), 10); // Clamp D between 1 and 10

    // Update S
    // Simple exponential boost for short term
    s = s * Math.exp(w[16] * (grade - 3 + 1)); // Simplified short-term boost

    if (grade >= 3) {
        state = FSRSState.Review; // Graduated
    }
  } else {
    // --- Review Phase (Main FSRS Formula) ---
    
    // 2.1 Update Difficulty (D')
    // D' = D - w[6] * (grade - 3)
    // Mean Reversion: D' = w[7]*D0(3) + (1-w[7])*D'
    const nextD = d - w[6] * (grade - 3);
    const d0_3 = w[0] + w[1] * (3 - 1); // Base difficulty for 'Good'
    d = w[7] * d0_3 + (1 - w[7]) * nextD;
    d = Math.min(Math.max(d, 1), 10); // Clamp

    // 2.2 Update Stability (S')
    if (grade === 1) {
      // Forgot (Again)
      // S'(f) = w[11] * D^-w[12] * ((S+1)^w[13] - 1) * e^(w[14]*(1-R))
      s = w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp(w[14] * (1 - retrievability));
      state = FSRSState.Relearning;
    } else {
      // Recalled (Hard/Good/Easy)
      // S'(r) = S * (1 + e^w[8] * (11-D) * S^-w[9] * (e^(w[10]*(1-R)) - 1))
      // Hard penalty: w[15] if grade=2
      let hardPenalty = 1;
      if (grade === 2) hardPenalty = w[15];
      
      const recallBoost = Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp(w[10] * (1 - retrievability)) - 1);
      s = s * (1 + recallBoost * hardPenalty);
      state = FSRSState.Review;
    }
  }

  // 3. Calculate Interval (I)
  // I = S * 9 * (1/R_req - 1)
  // R_req is requestRetention (e.g. 0.9)
  let nextInterval = s * 9 * ((1 / requestRetention) - 1);

  // Apply Hard cap
  nextInterval = Math.min(nextInterval, maxInterval);

  // 4. Formatting for UI & Application
  
  // Fuzzing (keep from previous version to prevent bunching)
  // Only apply fuzzing for intervals > 4 days
  if (nextInterval > 4) {
      const fuzzFactor = 1 + (Math.random() * 0.05 - 0.025); // ±2.5%
      nextInterval = nextInterval * fuzzFactor;
  }

  // Convert to specific Date
  // If interval is extremely small (e.g. "Again"), schedule for 10 mins (0.007 days)
  if (state === FSRSState.Relearning || grade === 1) {
      // Force short interval for lapses
      nextInterval = Math.max(0.007, Math.min(nextInterval, 1)); 
  } else if (state === FSRSState.New || state === FSRSState.Learning) {
      nextInterval = Math.max(0.01, nextInterval); // At least ~15 mins
  }
  
  const nextDate = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000);

  // Determine standard app status
  let uiStatus: 'learning' | 'review' | 'mastered' = 'review';
  if (state === FSRSState.New) uiStatus = 'learning';
  if (state === FSRSState.Relearning) uiStatus = 'learning';
  if (nextInterval > 180) uiStatus = 'mastered'; // Visual flair for long intervals

  return {
    lastReviewedAt: now,
    nextReviewAt: nextDate,
    currentInterval: nextInterval,
    stability: parseFloat(s.toFixed(4)),
    retentionScore: Math.round(retrievability * 100), // Estimated current R
    reviewCount: item.reviewCount + 1,
    status: uiStatus,
    // FSRS Fields
    fsrsDifficulty: parseFloat(d.toFixed(4)),
    fsrsState: state,
    fsrsLastReview: now
  };
};

/**
 * Helper to show schedule preview (Ebbinghaus approximation)
 * Not strictly FSRS but good for UI visualization
 */
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