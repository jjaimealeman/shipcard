/**
 * Type definitions for AI Insights computation.
 *
 * These interfaces define the shape of computed insight results derived
 * from SafeTimeSeries data. InsightResult is the stored blob per user
 * in KV under user:{username}:insights.
 */

export interface PeakHoursInsight {
  /** 24 buckets (index 0=midnight, 23=11pm) with total sessions per hour. */
  hourlyTotals: number[];
  /** Top 3 hours sorted by activity. */
  topHours: Array<{ hour: number; label: string; totalSessions: number }>;
}

export interface PeakDaysInsight {
  /** Top 3 days-of-week by average sessions. dayOfWeek: 0=Sun ... 6=Sat. */
  topDays: Array<{ dayOfWeek: number; label: string; avgSessions: number }>;
}

export interface CostTrendInsight {
  /** Weekly cost totals. Free: 2 entries, PRO: 4 entries. */
  weeklyTotals: Array<{ weekStart: string; costCents: number }>;
  trend: "up" | "down" | "flat";
  /** Positive = up, negative = down. */
  deltaPercent: number;
}

export interface StreakInsight {
  /** Consecutive days with costCents > 0 ending today. */
  currentStreak: number;
  /** All-time longest streak in available window. */
  longestStreak: number;
  /** Days in current Mon-Sun week with costCents > 0. */
  activeDaysThisWeek: number;
}

export interface InsightResult {
  username: string;
  /** ISO timestamp — used for "Last updated X days ago" badge. */
  computedAt: string;
  isPro: boolean;
  /** 14 for free users, 28 for PRO users. */
  windowDays: number;
  /** Only present when hourlyActivity data is available in the sync payload. */
  peakHours?: PeakHoursInsight;
  peakDays: PeakDaysInsight;
  costTrend: CostTrendInsight;
  streak: StreakInsight;
  /** Workers AI generated narrative — PRO only, undefined if not yet computed. */
  narrative?: string;
  /** true if AI call failed — dashboard shows stats without narrative. */
  narrativeError?: boolean;
}
