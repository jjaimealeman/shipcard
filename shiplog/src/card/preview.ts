/**
 * Cross-platform browser preview for ShipLog SVG cards.
 *
 * `openInBrowser(filePath)` opens a file in the user's default browser.
 * The call is fire-and-forget — it never blocks the CLI process.
 */

import { spawn } from "node:child_process";

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Open a local file in the system's default browser.
 *
 * Platform dispatch:
 *   - macOS (darwin): `open <file>`
 *   - Windows (win32): `cmd /c start "" <file>` with shell: true
 *   - Linux/other: `xdg-open <file>`
 *
 * All spawn calls use `{ detached: true, stdio: "ignore" }` and `.unref()` so
 * the CLI exits immediately without waiting for the browser to close.
 *
 * No shell string interpolation — the file path is always passed as an array
 * argument, never concatenated into a command string.
 */
export function openInBrowser(filePath: string): void {
  const platform = process.platform;

  let child;

  if (platform === "darwin") {
    child = spawn("open", [filePath], {
      detached: true,
      stdio: "ignore",
    });
  } else if (platform === "win32") {
    child = spawn("cmd", ["/c", "start", "", filePath], {
      detached: true,
      stdio: "ignore",
      shell: true,
    });
  } else {
    // Linux and other POSIX systems
    child = spawn("xdg-open", [filePath], {
      detached: true,
      stdio: "ignore",
    });
  }

  child.unref();
}
