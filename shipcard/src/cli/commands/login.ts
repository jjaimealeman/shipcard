/**
 * `shipcard login` command handler.
 *
 * Authenticates the user via GitHub OAuth device flow, then exchanges
 * the GitHub access token for a Worker-issued bearer token.
 *
 * Flow:
 *   1. Initiate GitHub device flow — print verification URL + user code
 *   2. Open browser to verification URL automatically (best-effort)
 *   3. Poll GitHub until user authorizes the device
 *   4. Fetch GitHub username from api.github.com/user
 *   5. POST to Worker /auth/exchange to get Worker bearer token
 *   6. Save { username, token } to ~/.shipcard/config.json
 *
 * TTY mode: Full Clack walkthrough (intro, step indicators, note box, spinner, outro).
 * Non-TTY mode: Identical plain-text stderr/stdout output to the original implementation.
 */

import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";
import { spawn } from "node:child_process";
import { saveAuthConfig, getWorkerUrl } from "../config.js";
import {
  isTTY,
  intro,
  outro,
  note,
  logStep,
  logSuccess,
  logError,
  logWarn,
  createSpinner,
} from "../clack.js";

// ---------------------------------------------------------------------------
// GitHub OAuth App client ID
// ---------------------------------------------------------------------------

/**
 * Public client ID for the ShipCard GitHub OAuth App.
 * Create your OAuth App at: https://github.com/settings/developers
 * Set Authorization callback URL to: https://shipcard.dev/auth/callback
 * Fill in the actual client ID here before publishing.
 */
const SHIPCARD_GITHUB_CLIENT_ID = "Ov23lijo8A2inPwKNCnx";

// ---------------------------------------------------------------------------
// Browser open helper
// ---------------------------------------------------------------------------

/**
 * Open a URL in the system's default browser (fire-and-forget).
 * Never throws — if the open command fails, we just skip it silently.
 */
function openUrl(url: string): void {
  const platform = process.platform;
  let child;

  try {
    if (platform === "darwin") {
      child = spawn("open", [url], { detached: true, stdio: "ignore" });
    } else if (platform === "win32") {
      child = spawn("cmd", ["/c", "start", "", url], {
        detached: true,
        stdio: "ignore",
        shell: true,
      });
    } else {
      child = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
    }
    child.unref();
  } catch {
    // Best-effort — ignore failures
  }
}

// ---------------------------------------------------------------------------
// Login command
// ---------------------------------------------------------------------------

export interface LoginFlags {
  // No flags for login currently — reserved for future --token flag
}

/**
 * Run the `shipcard login` command.
 *
 * Exit codes:
 *   0 — authenticated successfully
 *   1 — device flow timed out or failed
 *   1 — Worker token exchange failed
 */
export async function runLogin(_flags: LoginFlags): Promise<void> {
  const workerUrl = await getWorkerUrl();
  const tty = isTTY();

  // ---------------------------------------------------------------------------
  // TTY: Clack intro banner
  // Non-TTY: plain stderr (same as original)
  // ---------------------------------------------------------------------------
  if (tty) {
    intro("ShipCard -- GitHub Authentication");
    logStep("Starting GitHub device flow...");
  } else {
    process.stderr.write("Authenticating with GitHub...\n\n");
  }

  // ---------------------------------------------------------------------------
  // Device flow setup — onVerification fires synchronously when URL is ready
  // ---------------------------------------------------------------------------

  // Spinner is created before auth but only started after onVerification fires
  // (TTY only). We use a ref-holder pattern to avoid hoisting issues.
  let spinnerStarted = false;
  const spinner = tty ? createSpinner() : null;

  const auth = createOAuthDeviceAuth({
    clientType: "oauth-app",
    clientId: SHIPCARD_GITHUB_CLIENT_ID,
    scopes: ["read:user"],
    onVerification(verification) {
      if (tty) {
        // Clack note box: URL + code in a bordered display
        note(
          `${verification.verification_uri}\n\nCode: ${verification.user_code}`,
          "Open in browser to authorize"
        );
        logStep(
          `Code expires in ${Math.floor(verification.expires_in / 60)} minutes`
        );
      } else {
        // Non-TTY: byte-identical to original implementation
        process.stderr.write(`Open this URL in your browser:\n`);
        process.stderr.write(`  ${verification.verification_uri}\n\n`);
        process.stderr.write(`Enter this code when prompted:\n`);
        process.stderr.write(`  ${verification.user_code}\n\n`);
        process.stderr.write(
          `The code expires in ${Math.floor(verification.expires_in / 60)} minutes.\n\n`
        );
      }

      // Best-effort browser open (both TTY and non-TTY)
      openUrl(verification.verification_uri);

      // Start spinner AFTER showing the note (TTY only)
      if (tty && spinner) {
        spinner.start("Waiting for GitHub authorization...");
        spinnerStarted = true;
      } else {
        process.stderr.write("Waiting for authorization...\n");
      }
    },
  });

  // ---------------------------------------------------------------------------
  // Run device flow — polls GitHub until user authorizes
  // ---------------------------------------------------------------------------
  let githubToken: string;
  try {
    const result = await auth({ type: "oauth" });
    githubToken = result.token;

    // Stop spinner on success (TTY only)
    if (tty && spinner && spinnerStarted) {
      spinner.stop("GitHub authorized");
    }
  } catch (err: unknown) {
    // Stop spinner on failure (TTY only)
    if (tty && spinner && spinnerStarted) {
      spinner.stop("Authorization failed");
    }

    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("timeout") || message.includes("expired")) {
      if (tty) {
        logError("Device code expired.");
        logWarn("Run `shipcard login` again to start a new session.");
      } else {
        process.stderr.write(
          "\nDevice code expired. Run `shipcard login` again to start a new session.\n"
        );
      }
    } else {
      if (tty) {
        logError(`GitHub authentication failed: ${message}`);
      } else {
        process.stderr.write(`\nGitHub authentication failed: ${message}\n`);
      }
    }
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Fetch GitHub username
  // ---------------------------------------------------------------------------
  if (tty) {
    logStep("Verifying GitHub identity...");
  } else {
    process.stderr.write("Verifying GitHub identity...\n");
  }

  let username: string;
  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        "User-Agent": "shipcard-cli/1.0",
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (!userRes.ok) {
      if (tty) {
        logError(`GitHub user fetch failed: HTTP ${userRes.status}`);
      } else {
        process.stderr.write(
          `GitHub user fetch failed: HTTP ${userRes.status}\n`
        );
      }
      process.exit(1);
    }
    const user = (await userRes.json()) as { login: string };
    username = user.login;

    if (tty) {
      logSuccess(`Authenticated as ${username}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (tty) {
      logError(`Failed to fetch GitHub user: ${message}`);
    } else {
      process.stderr.write(`Failed to fetch GitHub user: ${message}\n`);
    }
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Exchange GitHub token for Worker bearer token
  // ---------------------------------------------------------------------------
  if (tty) {
    logStep("Connecting to ShipCard...");
  } else {
    process.stderr.write("Exchanging token with ShipCard...\n");
  }

  let workerToken: string;
  try {
    const exchangeRes = await fetch(`${workerUrl}/auth/exchange`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "shipcard-cli/1.0",
      },
      body: JSON.stringify({ githubToken, username }),
    });
    if (!exchangeRes.ok) {
      let detail = "";
      try {
        const body = (await exchangeRes.json()) as { error?: string };
        if (body.error) detail = `: ${body.error}`;
      } catch {
        // ignore JSON parse error on error body
      }
      if (tty) {
        logError(`Worker token exchange failed: HTTP ${exchangeRes.status}${detail}`);
      } else {
        process.stderr.write(
          `Worker token exchange failed: HTTP ${exchangeRes.status}${detail}\n`
        );
      }
      process.exit(1);
    }
    const exchangeBody = (await exchangeRes.json()) as { token: string };
    workerToken = exchangeBody.token;

    if (tty) {
      logSuccess("ShipCard token saved");
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (tty) {
      logError(`Failed to exchange token: ${message}`);
    } else {
      process.stderr.write(`Failed to exchange token: ${message}\n`);
    }
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Persist to ~/.shipcard/config.json
  // ---------------------------------------------------------------------------
  await saveAuthConfig({ username, token: workerToken });

  // ---------------------------------------------------------------------------
  // Final output
  // ---------------------------------------------------------------------------
  if (tty) {
    outro("You're all set! Run `shipcard sync` to publish your card.");
  } else {
    // Non-TTY: byte-identical to original
    process.stdout.write(`Logged in as ${username}\n`);
  }
}
