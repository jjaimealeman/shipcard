/**
 * UTF-8 box-drawing table renderer for ShipLog CLI output.
 *
 * Produces plain text tables with UTF-8 box-drawing characters.
 * No ANSI colors unless `color: true` is explicitly requested.
 */

import type { AnalyticsResult } from "../index.js";

// ---------------------------------------------------------------------------
// Box-drawing character constants
// ---------------------------------------------------------------------------

const BOX = {
  TL: "┌", // top-left
  TR: "┐", // top-right
  BL: "└", // bottom-left
  BR: "┘", // bottom-right
  H: "─", // horizontal
  V: "│", // vertical
  ML: "├", // middle-left
  MR: "┤", // middle-right
  TM: "┬", // top-middle
  BM: "┴", // bottom-middle
  MM: "┼", // middle-middle
} as const;

// ---------------------------------------------------------------------------
// Utility: column padding
// ---------------------------------------------------------------------------

/**
 * Pad a string to the right with spaces to reach the target width.
 * Truncates with "..." if the string exceeds the width.
 */
export function padRight(s: string, width: number): string {
  if (s.length > width) {
    return s.slice(0, width - 3) + "...";
  }
  return s.padEnd(width, " ");
}

// ---------------------------------------------------------------------------
// Generic table renderer
// ---------------------------------------------------------------------------

export interface RenderTableOptions {
  color?: boolean;
}

/**
 * Render a generic UTF-8 box-drawing table.
 *
 * @param headers  Column header labels.
 * @param rows     Data rows (each row must have same number of cells as headers).
 * @param options  Render options.
 * @returns        Multi-line string with box-drawing borders.
 */
export function renderTable(
  headers: string[],
  rows: string[][],
  options?: RenderTableOptions
): string {
  const _ = options; // reserved for future color usage
  if (headers.length === 0) return "";

  // Calculate column widths: max of header and all row values.
  const colWidths = headers.map((h, i) => {
    const dataMax = rows.reduce((max, row) => {
      const cell = row[i] ?? "";
      return Math.max(max, cell.length);
    }, 0);
    return Math.max(h.length, dataMax);
  });

  const lines: string[] = [];

  // Top border
  const topBorder =
    BOX.TL +
    colWidths.map((w) => BOX.H.repeat(w + 2)).join(BOX.TM) +
    BOX.TR;
  lines.push(topBorder);

  // Header row
  const headerRow =
    BOX.V +
    headers
      .map((h, i) => ` ${padRight(h, colWidths[i] ?? 0)} `)
      .join(BOX.V) +
    BOX.V;
  lines.push(headerRow);

  // Header separator
  const separator =
    BOX.ML +
    colWidths.map((w) => BOX.H.repeat(w + 2)).join(BOX.MM) +
    BOX.MR;
  lines.push(separator);

  // Data rows
  for (const row of rows) {
    const dataRow =
      BOX.V +
      headers
        .map((_, i) => ` ${padRight(row[i] ?? "", colWidths[i] ?? 0)} `)
        .join(BOX.V) +
      BOX.V;
    lines.push(dataRow);
  }

  // Bottom border
  const bottomBorder =
    BOX.BL +
    colWidths.map((w) => BOX.H.repeat(w + 2)).join(BOX.BM) +
    BOX.BR;
  lines.push(bottomBorder);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// formatSummary
// ---------------------------------------------------------------------------

/**
 * Format a full AnalyticsResult as a terminal-friendly summary display.
 *
 * Produces two sections:
 *   1. Overview: sessions, tokens, models, projects, cost, pricing source
 *   2. Tool calls: top tools by count
 */
export function formatSummary(
  result: AnalyticsResult,
  options?: RenderTableOptions
): string {
  const sections: string[] = [];

  // --- Overview section ---
  const { summary } = result;
  const tokens = summary.totalTokens;

  const overviewRows: string[][] = [
    ["Sessions", String(summary.totalSessions)],
    ["Tokens (input)", tokens.input.toLocaleString()],
    ["Tokens (output)", tokens.output.toLocaleString()],
    ["Cache creation", tokens.cacheCreate.toLocaleString()],
    ["Cache read", tokens.cacheRead.toLocaleString()],
    ["Models", summary.modelsUsed.join(", ") || "(none)"],
    ["Projects", summary.projectsTouched.join(", ") || "(none)"],
    ["Total cost", summary.totalCost],
    ["Pricing source", summary.pricingVersion],
  ];

  sections.push("Overview");
  sections.push(renderTable(["Metric", "Value"], overviewRows, options));

  // Date range line (if applicable)
  if (result.meta.dateRange !== undefined) {
    const { since, until } = result.meta.dateRange;
    const rangeParts: string[] = [];
    if (since !== undefined) rangeParts.push(`since ${since}`);
    if (until !== undefined) rangeParts.push(`until ${until}`);
    sections.push(`Date range: ${rangeParts.join(", ")}`);
  }

  // --- Tool calls section ---
  const toolEntries = Object.entries(summary.toolCallSummary);
  if (toolEntries.length > 0) {
    const toolRows = toolEntries
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tool, count]) => [tool, count.toLocaleString()]);

    sections.push("");
    sections.push("Tool Calls (top 10)");
    sections.push(renderTable(["Tool", "Count"], toolRows, options));
  }

  // --- Parse warnings ---
  if (result.meta.linesSkipped > 0) {
    sections.push(
      `\nWarning: ${result.meta.linesSkipped} line(s) skipped due to parse errors.`
    );
  }

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// formatCosts
// ---------------------------------------------------------------------------

/**
 * Format a full AnalyticsResult as a cost breakdown display.
 *
 * Produces two tables:
 *   1. By project: project name, sessions, cost, models
 *   2. By model: model name, cost, token breakdown
 */
export function formatCosts(
  result: AnalyticsResult,
  options?: RenderTableOptions
): string {
  const sections: string[] = [];

  // --- By-project table ---
  const projectEntries = Object.entries(result.byProject);
  if (projectEntries.length > 0) {
    const projectRows = projectEntries
      .sort(([, a], [, b]) => {
        const aCost = parseFloat(a.cost.replace(/[^0-9.]/g, "")) || 0;
        const bCost = parseFloat(b.cost.replace(/[^0-9.]/g, "")) || 0;
        return bCost - aCost;
      })
      .map(([name, stats]) => [
        name,
        String(stats.sessions),
        stats.cost,
        stats.models.join(", ") || "(none)",
      ]);

    sections.push("Cost by Project");
    sections.push(
      renderTable(
        ["Project", "Sessions", "Cost", "Models"],
        projectRows,
        options
      )
    );
  } else {
    sections.push("Cost by Project");
    sections.push("(no projects)");
  }

  sections.push("");

  // --- By-model table ---
  const modelEntries = Object.entries(result.byModel);
  if (modelEntries.length > 0) {
    const modelRows = modelEntries
      .sort(([, a], [, b]) => {
        const aCost = parseFloat(a.cost.replace(/[^0-9.]/g, "")) || 0;
        const bCost = parseFloat(b.cost.replace(/[^0-9.]/g, "")) || 0;
        return bCost - aCost;
      })
      .map(([model, stats]) => {
        const t = stats.tokens;
        const tokenStr = `in: ${t.input.toLocaleString()} / out: ${t.output.toLocaleString()}`;
        return [model, stats.cost, tokenStr];
      });

    sections.push("Cost by Model");
    sections.push(
      renderTable(["Model", "Cost", "Tokens"], modelRows, options)
    );
  } else {
    sections.push("Cost by Model");
    sections.push("(no models)");
  }

  // --- Parse warnings ---
  if (result.meta.linesSkipped > 0) {
    sections.push(
      `\nWarning: ${result.meta.linesSkipped} line(s) skipped due to parse errors.`
    );
  }

  return sections.join("\n");
}
