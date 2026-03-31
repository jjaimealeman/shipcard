/**
 * TTY-guard module for Clack prompt UI.
 *
 * ALL commands import Clack wrappers from here, NEVER from @clack/prompts directly.
 *
 * Design rules:
 *   - Every export checks isTTY() before calling any Clack API
 *   - Non-TTY paths produce identical output to existing behavior (stderr/stdout conventions)
 *   - All Clack calls are wrapped in try/catch; errors silently fall through to non-TTY path
 *   - confirm() and createSpinner() REQUIRE caller to guard with isTTY() before calling
 */

import * as p from "@clack/prompts";

// ---------------------------------------------------------------------------
// TTY detection
// ---------------------------------------------------------------------------

/**
 * Returns true if stdout is an interactive terminal.
 * Non-TTY contexts: pipes, MCP server, CI, redirected output.
 */
export function isTTY(): boolean {
  return process.stdout.isTTY === true;
}

// ---------------------------------------------------------------------------
// Framing: intro / outro
// ---------------------------------------------------------------------------

/**
 * Display a Clack intro banner.
 * No-op in non-TTY mode (pipe/MCP contexts must not see UI chrome).
 */
export function intro(title: string): void {
  if (!isTTY()) return;
  try {
    p.intro(title);
  } catch {
    // Silent fallback — non-TTY path is already a no-op
  }
}

/**
 * Display a Clack outro message.
 * No-op in non-TTY mode.
 */
export function outro(message: string): void {
  if (!isTTY()) return;
  try {
    p.outro(message);
  } catch {
    // Silent fallback
  }
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

/**
 * Display a Clack note box in TTY mode.
 * In non-TTY mode, writes plain text to stderr.
 */
export function note(message: string, title?: string): void {
  if (isTTY()) {
    try {
      p.note(message, title);
      return;
    } catch {
      // Fall through to non-TTY path
    }
  }
  const prefix = title !== undefined ? `${title}: ` : "";
  process.stderr.write(`${prefix}${message}\n`);
}

// ---------------------------------------------------------------------------
// Log helpers
// ---------------------------------------------------------------------------

/**
 * Log a success message.
 * TTY: Clack log.success() with green checkmark.
 * Non-TTY: plain stdout write (data stays on stdout, status stays on stderr).
 */
export function logSuccess(msg: string): void {
  if (isTTY()) {
    try {
      p.log.success(msg);
      return;
    } catch {
      // Fall through
    }
  }
  process.stdout.write(`${msg}\n`);
}

/**
 * Log a step/progress message.
 * TTY: Clack log.step() with bullet indicator.
 * Non-TTY: stderr write (status messages go to stderr in non-TTY).
 */
export function logStep(msg: string): void {
  if (isTTY()) {
    try {
      p.log.step(msg);
      return;
    } catch {
      // Fall through
    }
  }
  process.stderr.write(`${msg}\n`);
}

/**
 * Log a warning message.
 * TTY: Clack log.warn() with warning indicator.
 * Non-TTY: stderr write with "Warning: " prefix (matches existing warn convention).
 */
export function logWarn(msg: string): void {
  if (isTTY()) {
    try {
      p.log.warn(msg);
      return;
    } catch {
      // Fall through
    }
  }
  process.stderr.write(`Warning: ${msg}\n`);
}

/**
 * Log an error message.
 * TTY: Clack log.error() with error indicator.
 * Non-TTY: stderr write with "Error: " prefix.
 */
export function logError(msg: string): void {
  if (isTTY()) {
    try {
      p.log.error(msg);
      return;
    } catch {
      // Fall through
    }
  }
  process.stderr.write(`Error: ${msg}\n`);
}

// ---------------------------------------------------------------------------
// Interactive: confirm
// ---------------------------------------------------------------------------

/**
 * Prompt the user for a yes/no confirmation.
 *
 * IMPORTANT: Caller MUST guard with isTTY() before calling this function.
 * This function is only safe to call in interactive TTY mode.
 *
 * On cancel (Ctrl+C): exits the process with code 0.
 *
 * @example
 * if (isTTY()) {
 *   const ok = await confirm('Deploy now?');
 *   if (!ok) process.exit(0);
 * }
 */
export async function confirm(message: string): Promise<boolean> {
  const result = await p.confirm({ message });
  if (p.isCancel(result)) {
    process.exit(0);
  }
  return result as boolean;
}

// ---------------------------------------------------------------------------
// Interactive: spinner
// ---------------------------------------------------------------------------

/**
 * Create a Clack spinner instance.
 *
 * IMPORTANT: Caller MUST guard with isTTY() before calling this function.
 * In non-TTY contexts, use logStep() for progress messages instead.
 *
 * @example
 * if (isTTY()) {
 *   const s = createSpinner();
 *   s.start('Loading...');
 *   await doWork();
 *   s.stop('Done!');
 * } else {
 *   logStep('Loading...');
 *   await doWork();
 * }
 */
export function createSpinner(): ReturnType<typeof p.spinner> {
  return p.spinner();
}
