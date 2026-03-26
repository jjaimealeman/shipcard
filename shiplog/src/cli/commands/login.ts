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
 */

import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";
import { spawn } from "node:child_process";
import { saveAuthConfig, getWorkerUrl } from "../config.js";

// ---------------------------------------------------------------------------
// GitHub OAuth App client ID
// ---------------------------------------------------------------------------

/**
 * Public client ID for the ShipCard GitHub OAuth App.
 * Create your OAuth App at: https://github.com/settings/developers
 * Set Authorization callback URL to: https://shipcard.dev/auth/callback
 * Fill in the actual client ID here before publishing.
 */
const SHIPCARD_GITHUB_CLIENT_ID = "YOUR_GITHUB_OAUTH_APP_CLIENT_ID";

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

  process.stderr.write("Authenticating with GitHub...\n\n");

  // Create device flow auth
  const auth = createOAuthDeviceAuth({
    clientType: "oauth-app",
    clientId: SHIPCARD_GITHUB_CLIENT_ID,
    scopes: ["read:user"],
    onVerification(verification) {
      process.stderr.write(`Open this URL in your browser:\n`);
      process.stderr.write(`  ${verification.verification_uri}\n\n`);
      process.stderr.write(`Enter this code when prompted:\n`);
      process.stderr.write(`  ${verification.user_code}\n\n`);
      process.stderr.write(
        `The code expires in ${Math.floor(verification.expires_in / 60)} minutes.\n\n`
      );

      // Best-effort browser open
      openUrl(verification.verification_uri);
    },
  });

  // Run device flow — polls GitHub until user authorizes
  let githubToken: string;
  try {
    process.stderr.write("Waiting for authorization...\n");
    const result = await auth({ type: "oauth" });
    githubToken = result.token;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("timeout") || message.includes("expired")) {
      process.stderr.write(
        "\nDevice code expired. Run `shipcard login` again to start a new session.\n"
      );
    } else {
      process.stderr.write(`\nGitHub authentication failed: ${message}\n`);
    }
    process.exit(1);
  }

  // Fetch GitHub username
  process.stderr.write("Verifying GitHub identity...\n");
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
      process.stderr.write(
        `GitHub user fetch failed: HTTP ${userRes.status}\n`
      );
      process.exit(1);
    }
    const user = (await userRes.json()) as { login: string };
    username = user.login;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Failed to fetch GitHub user: ${message}\n`);
    process.exit(1);
  }

  // Exchange GitHub token for Worker bearer token
  process.stderr.write("Exchanging token with ShipCard...\n");
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
      process.stderr.write(
        `Worker token exchange failed: HTTP ${exchangeRes.status}${detail}\n`
      );
      process.exit(1);
    }
    const exchangeBody = (await exchangeRes.json()) as { token: string };
    workerToken = exchangeBody.token;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Failed to exchange token: ${message}\n`);
    process.exit(1);
  }

  // Persist to ~/.shipcard/config.json
  await saveAuthConfig({ username, token: workerToken });

  process.stdout.write(`Logged in as ${username}\n`);
}
