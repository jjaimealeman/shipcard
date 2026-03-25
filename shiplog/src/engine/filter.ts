/**
 * Date parsing and filtering for ShipLog analytics.
 *
 * Supports three date input formats:
 *   - ISO date: "2026-03-01" -> start of that day in local time
 *   - Relative:  "7d", "30d" -> N days ago from now (start of that day)
 *   - Keyword:   "today"     -> start of today in local time
 *
 * Filtering is inclusive on since (>=) and exclusive on until (<).
 * Messages outside the window are dropped before aggregation.
 */

import type { ParsedMessage } from "../parser/schema.js";

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

/**
 * Parse a filter date string into a Date object (local time).
 *
 * Supported formats:
 *   - ISO date: "2026-03-01"   -> 2026-03-01T00:00:00 local time
 *   - "today"                  -> today at 00:00:00 local time
 *   - Relative: "7d", "30d"    -> N days ago at 00:00:00 local time
 *
 * Throws Error with supported formats list for unrecognized input.
 */
export function parseFilterDate(input: string): Date {
  // ISO date: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    // Append local midnight so Date parses in local time (not UTC).
    return new Date(`${input}T00:00:00`);
  }

  // Keyword: today
  if (input === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Relative: Nd (e.g. "7d", "30d")
  const relMatch = /^(\d+)d$/.exec(input);
  if (relMatch !== null) {
    const days = parseInt(relMatch[1]!, 10);
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  throw new Error(
    `Unrecognized date filter: "${input}". ` +
      `Supported formats: ISO date (2026-03-01), relative (7d, 30d), or "today".`
  );
}

// ---------------------------------------------------------------------------
// Message filtering
// ---------------------------------------------------------------------------

/**
 * Filter ParsedMessages to only those within the specified date range.
 *
 * - since is inclusive: messages with timestamp >= since are kept.
 * - until is exclusive: messages with timestamp < until are kept.
 * - If neither is provided, all messages are returned unchanged (same reference).
 *
 * Does not mutate the input array.
 */
export function filterByDateRange(
  messages: ParsedMessage[],
  since?: string,
  until?: string
): ParsedMessage[] {
  if (since === undefined && until === undefined) {
    return messages;
  }

  const sinceDate = since !== undefined ? parseFilterDate(since) : undefined;
  const untilDate = until !== undefined ? parseFilterDate(until) : undefined;

  return messages.filter((msg) => {
    const ts = new Date(msg.timestamp);

    if (sinceDate !== undefined && ts < sinceDate) {
      return false;
    }

    if (untilDate !== undefined && ts >= untilDate) {
      return false;
    }

    return true;
  });
}
