/**
 * Git root detection for ShipCard card output path.
 *
 * `findGitRoot()` returns the repository root directory so generated SVG cards
 * are written to the project root by default.
 */

import { spawnSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Locate the nearest git repository root by running `git rev-parse --show-toplevel`.
 *
 * Falls back to `process.cwd()` if the current directory is not inside a git
 * repository (or git is not installed).
 *
 * No shell injection risk — args are passed as an array, never interpolated.
 */
export function findGitRoot(): string {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (result.status === 0 && result.stdout) {
    return result.stdout.trim();
  }

  return process.cwd();
}
