/**
 * Workers AI narrative module for AI Insights.
 *
 * Builds a structured prompt from computed InsightResult data and calls
 * Workers AI (llama-3.2-1b-instruct) to generate a 2-3 sentence narrative
 * summary for PRO users.
 *
 * The Ai type is globally available from @cloudflare/workers-types — no import needed.
 */

import type { InsightResult } from "./types.js";

/**
 * Build a prompt for Workers AI to generate a 2-3 sentence narrative
 * summarizing the user's weekly coding insights.
 *
 * Keeps prompt under ~400 tokens for efficiency. Includes all key stats:
 * most active days, cost trend, streak, and peak hour if available.
 */
export function buildNarrativePrompt(insights: InsightResult): string {
  const { username, windowDays, peakDays, costTrend, streak, peakHours } =
    insights;

  const topDayLabels = peakDays.topDays
    .slice(0, 3)
    .map((d) => d.label)
    .join(", ");

  const deltaFormatted = Math.abs(Math.round(costTrend.deltaPercent));
  const trendDesc =
    costTrend.trend === "flat"
      ? "flat (no significant change)"
      : `${costTrend.trend} (${deltaFormatted}% vs previous week)`;

  const peakHourLine =
    peakHours && peakHours.topHours.length > 0
      ? `\n- Peak coding hour: ${peakHours.topHours[0].label}`
      : "";

  return [
    `Weekly coding stats for ${username} (${windowDays}-day window):`,
    `- Most active days: ${topDayLabels}`,
    `- Cost trend: ${trendDesc}`,
    `- Current coding streak: ${streak.currentStreak} days`,
    `- Active days this week: ${streak.activeDaysThisWeek}/7`,
    `- Longest streak: ${streak.longestStreak} days`,
    peakHourLine,
    "",
    "Write a 2-3 sentence narrative summary of this developer's activity.",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

/**
 * Call Workers AI to generate a narrative for the insight result.
 * Uses @cf/meta/llama-3.2-1b-instruct with max_tokens:150.
 * Returns the narrative string, or undefined if the call fails.
 */
export async function callWorkersAI(
  ai: Ai,
  insights: InsightResult
): Promise<string | undefined> {
  try {
    const prompt = buildNarrativePrompt(insights);
    const result = await ai.run(
      "@cf/meta/llama-3.2-1b-instruct",
      {
        messages: [
          {
            role: "system",
            content:
              "You are a concise coding activity analyst. Write exactly 2-3 sentences summarizing the developer's weekly activity. Be encouraging but factual. Do not use markdown formatting.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 150,
      }
    );
    // Workers AI returns { response: string } for text generation models
    const response = (result as { response?: string }).response;
    return response?.trim() || undefined;
  } catch {
    return undefined;
  }
}
