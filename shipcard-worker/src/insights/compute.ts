/**
 * Pure compute functions for AI Insights.
 *
 * All functions are pure: same input → same output, no side effects.
 * Input: SafeDailyStats[] from the SafeTimeSeries sync payload.
 * Output: typed insight sub-objects assembled by computeAllInsights().
 */

import type { SafeDailyStats } from "../types.js";
import type {
  CostTrendInsight,
  InsightResult,
  PeakDaysInsight,
  PeakHoursInsight,
  StreakInsight,
} from "./types.js";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Returns the Monday ISO date (YYYY-MM-DD) for the week containing dateStr.
 * Uses getUTCDay() to find the offset from Monday (Mon=1, so offset = (dow + 6) % 7).
 */
export function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const dow = d.getUTCDay(); // 0=Sun, 1=Mon ... 6=Sat
  const offsetToMonday = (dow + 6) % 7; // Mon=0, Tue=1 ... Sun=6
  d.setUTCDate(d.getUTCDate() - offsetToMonday);
  return d.toISOString().slice(0, 10);
}

/**
 * Computes peak coding hours from days that have hourlyActivity data.
 *
 * Returns undefined if no day in the array has an hourlyActivity field.
 * When present, sums all hourlyActivity arrays into 24 buckets and returns
 * the top 3 hours with human-readable labels like "9 AM", "2 PM".
 */
export function computePeakHours(
  days: SafeDailyStats[]
): PeakHoursInsight | undefined {
  const daysWithHourly = days.filter(
    (d) => d.hourlyActivity && d.hourlyActivity.length === 24
  );
  if (daysWithHourly.length === 0) return undefined;

  const hourlyTotals: number[] = Array(24).fill(0);
  for (const day of daysWithHourly) {
    for (let h = 0; h < 24; h++) {
      hourlyTotals[h] += day.hourlyActivity![h];
    }
  }

  const topHours = hourlyTotals
    .map((totalSessions, hour) => {
      const period = hour < 12 ? "AM" : "PM";
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const label = `${displayHour} ${period}`;
      return { hour, label, totalSessions };
    })
    .sort((a, b) => b.totalSessions - a.totalSessions)
    .slice(0, 3);

  return { hourlyTotals, topHours };
}

/**
 * Computes peak days of week from daily stats.
 *
 * Buckets active days (costCents > 0) by day-of-week using noon UTC to avoid
 * DST edge cases, then returns the top 3 days by average sessions.
 */
export function computePeakDays(days: SafeDailyStats[]): PeakDaysInsight {
  const buckets: { totalSessions: number; count: number }[] = Array.from(
    { length: 7 },
    () => ({ totalSessions: 0, count: 0 })
  );

  for (const day of days) {
    if (day.costCents <= 0) continue;
    const dow = new Date(day.date + "T12:00:00Z").getUTCDay();
    buckets[dow].totalSessions += day.sessions;
    buckets[dow].count++;
  }

  const topDays = buckets
    .map((b, i) => ({
      dayOfWeek: i,
      label: DAY_LABELS[i],
      avgSessions: b.count > 0 ? b.totalSessions / b.count : 0,
    }))
    .sort((a, b) => b.avgSessions - a.avgSessions)
    .slice(0, 3);

  return { topDays };
}

/**
 * Computes weekly cost totals and trend direction.
 *
 * Groups days into ISO weeks (Mon-Sun), trims to the last N weeks
 * (windowDays / 7: 2 for free, 4 for PRO), and computes costCents sum
 * per week. Trend compares the last two weeks:
 * - up if delta > 5%
 * - down if delta < -5%
 * - flat otherwise
 */
export function computeCostTrend(
  days: SafeDailyStats[],
  windowDays: number
): CostTrendInsight {
  // Group days by ISO week start (Monday)
  const weekMap = new Map<string, number>();
  for (const day of days) {
    const weekStart = getWeekStart(day.date);
    weekMap.set(weekStart, (weekMap.get(weekStart) ?? 0) + day.costCents);
  }

  // Sort week starts ascending and trim to last N weeks
  const numWeeks = Math.floor(windowDays / 7);
  const sortedWeeks = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-numWeeks);

  const weeklyTotals = sortedWeeks.map(([weekStart, costCents]) => ({
    weekStart,
    costCents,
  }));

  // Compute trend from last two weeks
  let trend: "up" | "down" | "flat" = "flat";
  let deltaPercent = 0;

  if (weeklyTotals.length >= 2) {
    const prev = weeklyTotals[weeklyTotals.length - 2].costCents;
    const last = weeklyTotals[weeklyTotals.length - 1].costCents;

    if (prev === 0) {
      trend = last > 0 ? "up" : "flat";
      deltaPercent = last > 0 ? 100 : 0;
    } else {
      deltaPercent = ((last - prev) / prev) * 100;
      if (deltaPercent > 5) trend = "up";
      else if (deltaPercent < -5) trend = "down";
      else trend = "flat";
    }
  }

  return { weeklyTotals, trend, deltaPercent };
}

/**
 * Computes current streak, longest streak, and active days this week.
 *
 * Active day definition: costCents > 0 (any Claude Code API usage).
 * Current streak: walk backward from today, counting consecutive active days.
 * Longest streak: linear scan over all days in ascending order.
 * activeDaysThisWeek: count of active days in current Mon-Sun week.
 */
export function computeStreak(days: SafeDailyStats[]): StreakInsight {
  const activeDates = new Set(
    days.filter((d) => d.costCents > 0).map((d) => d.date)
  );

  // Current streak: walk backwards from today
  let current = 0;
  const today = new Date().toISOString().slice(0, 10);
  let cursor = today;
  while (activeDates.has(cursor)) {
    current++;
    const prev = new Date(cursor + "T12:00:00Z");
    prev.setUTCDate(prev.getUTCDate() - 1);
    cursor = prev.toISOString().slice(0, 10);
  }

  // Longest streak: linear scan over sorted days
  let longest = 0;
  let run = 0;
  let prevDate: string | null = null;
  for (const day of days.slice().sort((a, b) => a.date.localeCompare(b.date))) {
    if (day.costCents <= 0) {
      longest = Math.max(longest, run);
      run = 0;
      prevDate = null;
      continue;
    }
    if (prevDate === null) {
      run = 1;
    } else {
      const expected = new Date(prevDate + "T12:00:00Z");
      expected.setUTCDate(expected.getUTCDate() + 1);
      run = expected.toISOString().slice(0, 10) === day.date ? run + 1 : 1;
    }
    longest = Math.max(longest, run);
    prevDate = day.date;
  }
  // Capture the final run if it didn't end with an inactive day
  longest = Math.max(longest, run);

  // activeDaysThisWeek: count active days in current Mon-Sun week
  const thisWeekStart = getWeekStart(today);
  const activeDaysThisWeek = days.filter(
    (d) => d.date >= thisWeekStart && d.date <= today && d.costCents > 0
  ).length;

  return { currentStreak: current, longestStreak: longest, activeDaysThisWeek };
}

/**
 * Orchestrates all insight computations and assembles the InsightResult.
 *
 * Determines windowDays (14 for free, 28 for PRO), filters to the last N
 * calendar days from today, calls all compute functions, and returns the
 * assembled InsightResult with computedAt set to now.
 */
export function computeAllInsights(
  days: SafeDailyStats[],
  username: string,
  isPro: boolean
): InsightResult {
  const windowDays = isPro ? 28 : 14;
  const today = new Date().toISOString().slice(0, 10);

  // Compute the window start date (last N calendar days from today, inclusive)
  const windowStart = new Date(today + "T12:00:00Z");
  windowStart.setUTCDate(windowStart.getUTCDate() - (windowDays - 1));
  const windowStartStr = windowStart.toISOString().slice(0, 10);

  const windowDays_ = days.filter(
    (d) => d.date >= windowStartStr && d.date <= today
  );

  const peakHours = computePeakHours(windowDays_);
  const peakDays = computePeakDays(windowDays_);
  const costTrend = computeCostTrend(windowDays_, windowDays);
  const streak = computeStreak(windowDays_);

  return {
    username,
    computedAt: new Date().toISOString(),
    isPro,
    windowDays,
    ...(peakHours !== undefined ? { peakHours } : {}),
    peakDays,
    costTrend,
    streak,
  };
}
