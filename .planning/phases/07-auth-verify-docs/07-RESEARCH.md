# Phase 7: Auth Verify + Docs - Research

**Researched:** 2026-03-26
**Domain:** GitHub OAuth Device Flow verification, npm package naming, CLI documentation
**Confidence:** HIGH (codebase inspection) / HIGH (GitHub official docs) / MEDIUM (npm name change)

---

## Summary

Phase 7 is a verification, fix, and documentation phase — not a feature build. The codebase is
largely correct already. Research focused on three questions: (1) what can go wrong with the
GitHub OAuth device flow and how to test it end-to-end, (2) what changing from a scoped package
name to an unscoped one requires, and (3) what the docs need to say.

The OAuth implementation in `login.ts` + the Worker `POST /auth/exchange` route is technically
correct. The one known risk is the GitHub OAuth App needing "Device Flow" explicitly enabled in
its settings — this is a common gotcha that causes `device_flow_disabled` errors silently. The
`@octokit/auth-oauth-device` library handles all polling/error codes correctly so the CLI itself
needs no changes — just verification and potentially fixing the OAuth App settings.

The npm name change from `@jjaimealeman/shipcard` to `shipcard` is a straightforward package.json
edit plus a publish. The key insight is that npx invocation simplifies from
`npx -p @jjaimealeman/shipcard shipcard <cmd>` to `npx shipcard <cmd>` once unscoped. All docs
referencing the old scoped name need updating.

**Primary recommendation:** Test login locally with `wrangler dev` first. Verify the OAuth App
has "Device Flow" enabled in GitHub settings. Fix whatever breaks. Then claim the unscoped npm
name and update all docs to drop the `@jjaimealeman/` scope prefix.

---

## Standard Stack

This phase uses only already-installed tools. No new installs needed.

### Core (already in place)
| Tool | Version | Purpose |
|------|---------|---------|
| `@octokit/auth-oauth-device` | ^7.1.5 | GitHub device flow polling — handles all OAuth error codes |
| `wrangler` | 4.77.0 | Local Worker dev server for testing OAuth endpoints |
| Node.js fetch | built-in (Node 22) | GitHub API + Worker endpoint HTTP calls in CLI |

### Testing OAuth Locally
The Worker's `.dev.vars` file (gitignored) holds local secrets:
```
GITHUB_CLIENT_ID="Ov23lijo8A2inPwKNCnx"
GITHUB_CLIENT_SECRET="<real-secret>"
TOKEN_SECRET="<32-byte-hex>"
```
The `.dev.vars` is currently only commented-out placeholder values — it must be populated with
the real secrets before `wrangler dev` will work. Wrangler 4.77.0 is installed, which is past
the 4.48 fix where `.dev.vars` loading was broken.

### npm Publish
| Tool | Purpose |
|------|---------|
| `npm publish` | Publish unscoped package (run from `shiplog/` after build) |

**No new installation needed:**
```bash
# From shiplog/ directory
npm run build
npm publish
```

---

## Architecture Patterns

### GitHub OAuth Device Flow — Full Picture

The flow the CLI implements is correct. For reference:

```
1. CLI → POST https://github.com/login/device/code
         { client_id, scope: "read:user" }
   ← { device_code, user_code, verification_uri, expires_in: 900, interval: 5 }

2. CLI prints verification_uri + user_code, opens browser

3. User visits https://github.com/login/device, enters user_code

4. CLI polls POST https://github.com/login/oauth/access_token
   { client_id, device_code, grant_type: "urn:ietf:params:oauth:grant-type:device_code" }
   ← { access_token } on success

5. CLI → GET https://api.github.com/user (Bearer: access_token)
   ← { login: "username" }

6. CLI → POST https://shipcard.dev/auth/exchange
   { githubToken, username }
   ← { token } (Worker-issued opaque UUID)

7. CLI saves { username, token } to ~/.shipcard/config.json
```

The `@octokit/auth-oauth-device` library (already installed) handles steps 1-4 including all
polling, `slow_down` backoff, and error codes. The CLI code wrapping it in `login.ts` is correct.

### Worker Auth Exchange Flow

`POST /auth/exchange` in `routes/auth.ts` is correct:
1. Accepts `{ githubToken, username }` — never stores the GitHub token
2. Verifies GitHub token by calling `api.github.com/user`
3. Case-insensitive username comparison (prevents false mismatches)
4. Issues `crypto.randomUUID()` as Worker-scoped bearer token
5. Stores `token:${token}:username` in KV with 1-year TTL

### Local Testing Pattern

```bash
# Terminal 1 — start local Worker
cd shiplog-worker
npx wrangler dev

# Terminal 2 — point CLI at local Worker
# Override workerUrl in ~/.shipcard/config.json temporarily:
# { "workerUrl": "http://localhost:8787" }

# Or build and invoke with env override:
cd shiplog && npm run build
WORKER_URL=http://localhost:8787 node dist/cli/index.js login
```

Note: `config.ts` reads `workerUrl` from `~/.shipcard/config.json`. For local testing, set
`"workerUrl": "http://localhost:8787"` in that file before running login.

### npm Unscoped Package Name Change

**What changes in package.json:**
```json
// BEFORE
{ "name": "@jjaimealeman/shipcard", ... }

// AFTER
{ "name": "shipcard", ... }
```

**What else changes:**
- README.md: all `@jjaimealeman/shipcard` references → `shipcard`
- USAGE.md: all MCP config snippets → drop `@jjaimealeman/` prefix
- `docs/mcp-config.md`: same

**What stays the same:**
- `bin` entries in package.json (`"shipcard"` and `"shipcard-mcp"`) — already unscoped
- All source code — no code references the package name at runtime
- Worker code — completely separate package, unaffected

**npx invocation change:**
```bash
# Old (scoped) — requires -p flag because package name ≠ binary name
npx -p @jjaimealeman/shipcard shipcard summary

# New (unscoped) — binary name matches package name, simpler
npx shipcard summary

# MCP config old
{ "command": "npx", "args": ["-y", "-p", "@jjaimealeman/shipcard", "shipcard-mcp"] }

# MCP config new (still needs -p because shipcard-mcp binary ≠ package name "shipcard")
{ "command": "npx", "args": ["-y", "-p", "shipcard", "shipcard-mcp"] }
```

Note: The MCP binary is `shipcard-mcp`, which does NOT match the package name `shipcard`, so
`-p` is still required in MCP config even with the unscoped name. But the CLI binary `shipcard`
DOES match, so `npx shipcard` works without `-p`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth device flow polling | Custom poll loop | `@octokit/auth-oauth-device` (already installed) | Handles slow_down backoff, all error codes, interval timing |
| Device code expiry handling | Custom timer | Library throws with "expired" in message | Already caught correctly in login.ts |

---

## Common Pitfalls

### Pitfall 1: "Device Flow" Not Enabled on the OAuth App
**What goes wrong:** The device flow initiation returns a `device_flow_disabled` error. The CLI's
`@octokit/auth-oauth-device` library will throw with this error code, hitting the catch block in
`login.ts` and printing `GitHub authentication failed: device_flow_disabled`.

**Why it happens:** GitHub OAuth Apps have "Device Flow" as an opt-in feature in their settings.
Creating an OAuth App does not enable it by default.

**How to avoid:** Before testing, go to `https://github.com/settings/developers` → find the
ShipCard OAuth App → check that "Device Flow" is enabled. This is the most likely failure mode.

**Warning signs:** First login attempt fails immediately (doesn't wait for browser) with an error
containing `device_flow_disabled`.

---

### Pitfall 2: OAuth App Callback URL Mismatch for Device Flow
**What goes wrong:** Some developers configure the callback URL expecting it to matter for device
flow — it doesn't. The device flow does NOT redirect to the callback URL. The callback URL is
irrelevant for device flow, but must still be set to a valid URL for the GitHub OAuth App.

**Why it happens:** Confusion between Authorization Code flow (uses callback) and Device flow (polls).

**How to avoid:** Set the callback URL to `https://shipcard.dev/auth/callback` as planned — it
won't be used for device flow, but must be a valid HTTPS URL.

---

### Pitfall 3: .dev.vars Has Only Commented Placeholders
**What goes wrong:** `wrangler dev` starts successfully, but all environment secrets resolve as
`undefined`. The Worker's `POST /auth/exchange` tries to call GitHub API without credentials.

**Why it happens:** The `.dev.vars` file in `shiplog-worker/` currently has only commented-out
placeholder values. The real secrets must be uncommented and filled in.

**How to avoid:** Before running `wrangler dev`, edit `.dev.vars` to have real (uncommented) values:
```
GITHUB_CLIENT_ID="Ov23lijo8A2inPwKNCnx"
GITHUB_CLIENT_SECRET="<from-github-settings>"
TOKEN_SECRET="<any-32-byte-hex>"
```

---

### Pitfall 4: Testing Against Live Worker Instead of Local First
**What goes wrong:** Bugs become harder to diagnose when testing against the live worker at
`shipcard.dev` — logs aren't visible, errors are harder to trace.

**Why it happens:** It seems faster to just test the real thing.

**How to avoid:** Test the full round-trip locally first:
1. `wrangler dev` in `shiplog-worker/` (Terminal 1)
2. Set `"workerUrl": "http://localhost:8787"` in `~/.shipcard/config.json`
3. Run `shipcard login` and verify full flow
4. Run `shipcard sync --confirm` and verify KV write
5. Fetch `http://localhost:8787/u/<username>` and verify SVG returns

Only after local success, test against `https://shipcard.dev`.

---

### Pitfall 5: npm Publish Fails Because Name Already Taken
**What goes wrong:** `npm publish` fails with "You do not have permission to publish" or "name
already taken" if `shipcard` is claimed between now and when the publish happens.

**Why it happens:** npm package names are first-come, first-served.

**How to avoid:** Claim the name immediately. Check availability first:
```bash
npm view shipcard 2>&1 | grep "404 Not Found" && echo "Available"
```
If available, publish promptly. The CONTEXT.md notes it is currently available.

---

### Pitfall 6: MCP Config Still Needs -p Flag Even After Unscoped Rename
**What goes wrong:** Docs remove all `-p` flags thinking the unscoped rename makes them
unnecessary. But `shipcard-mcp` binary name ≠ package name `shipcard`, so npx can't infer which
package to install from the binary name alone.

**Why it happens:** npx infers package from binary name when they match. `shipcard` (CLI) matches
the package name. `shipcard-mcp` does NOT match the package name.

**How to avoid:**
- `npx shipcard summary` — no -p needed (binary name = package name)
- `npx -p shipcard shipcard-mcp` — still needs -p (binary name ≠ package name)

---

### Pitfall 7: README Still References Old Scoped Name in Quick Start
**What goes wrong:** Users copy the global install command `npm install -g @jjaimealeman/shipcard`
after publish under unscoped name — it works but looks wrong, may fail if scoped package is never
published.

**Why it happens:** README was written before the unscoped rename decision.

**How to avoid:** Update README Quick Start to use `npm install -g shipcard` and
`npx shipcard summary`. Search all `.md` files for `@jjaimealeman` before calling the phase done.

---

## Code Examples

### Checking OAuth App Device Flow Is Enabled
Source: GitHub official documentation (https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)

The `device_flow_disabled` error code is returned when the feature is not enabled:
```
POST https://github.com/login/oauth/access_token
← { "error": "device_flow_disabled", ... }
```
The `@octokit/auth-oauth-device` library surfaces this as a thrown Error with the error code in
the message. It is caught by the existing `catch (err)` block in `runLogin()`.

### Testing the Full Round-Trip Locally
```bash
# 1. Populate .dev.vars (shiplog-worker/.dev.vars)
GITHUB_CLIENT_ID="Ov23lijo8A2inPwKNCnx"
GITHUB_CLIENT_SECRET="your-real-secret"
TOKEN_SECRET="any-32-char-hex-string-here-will-do"

# 2. Start local Worker
cd /path/to/shiplog-worker && npx wrangler dev

# 3. Temporarily point CLI at local Worker
# Edit ~/.shipcard/config.json → add "workerUrl": "http://localhost:8787"

# 4. Build CLI (from shiplog/)
npm run build

# 5. Run login
node dist/cli/index.js login
# Expected: browser opens github.com/login/device, enter code, "Logged in as <username>"

# 6. Run sync
node dist/cli/index.js sync --confirm
# Expected: "Card synced! View at: http://localhost:8787/u/<username>"

# 7. Fetch card directly
curl http://localhost:8787/u/<username>
# Expected: SVG content
```

### npm Publish Checklist
```bash
# 1. Check name availability
npm view shipcard 2>&1

# 2. Update package.json name field (only change needed)
# "name": "shipcard"

# 3. Build
cd shiplog && npm run build

# 4. Dry run to verify what will be published
npm publish --dry-run

# 5. Publish
npm publish

# 6. Verify
npm view shipcard
npx shipcard --version
```

### npx Invocation Patterns (Post-Rename)
```bash
# CLI — no -p needed (binary matches package name)
npx shipcard summary
npx shipcard costs
npx shipcard card --local
npx shipcard login
npx shipcard sync --confirm

# MCP config — still needs -p (shipcard-mcp ≠ shipcard)
{
  "mcpServers": {
    "shipcard": {
      "command": "npx",
      "args": ["-y", "-p", "shipcard", "shipcard-mcp"]
    }
  }
}

# Global install (no change in behavior)
npm install -g shipcard
shipcard summary
shipcard-mcp
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Scoped: `@jjaimealeman/shipcard` | Unscoped: `shipcard` | Simpler npx invocation; CLI binary works without -p flag |
| npx with -p: `npx -p @jjaimealeman/shipcard shipcard summary` | Direct: `npx shipcard summary` | Better DX, matches how successful CLI tools work |
| Placeholder OAuth client ID | Real ID `Ov23lijo8A2inPwKNCnx` (already in code) | login.ts already has real client ID; just needs Device Flow enabled |

---

## What the Docs Need

### README.md (currently at repo root `/home/jaime/www/_github/SaaS/README.md`)
Current state: Uses `@jjaimealeman/shipcard` in global install, `npx -p @jjaimealeman/shipcard`
in npx example, MCP config with `-p @jjaimealeman/shipcard`.

After rename:
- Quick Start: `npm install -g shipcard` + `npx shipcard summary`
- Embed section: no changes needed (uses shipcard.dev URL, not package name)
- MCP Config: `"args": ["-y", "-p", "shipcard", "shipcard-mcp"]`
- CLI table: no changes (shows command names, not install paths)

### USAGE.md (currently at `/home/jaime/www/_github/SaaS/USAGE.md`)
Current state: Has full command reference. MCP setup uses `@jjaimealeman/shipcard`. No npx
invocation section for CLI commands.

Needs:
- MCP Setup section: update to unscoped name
- New "Running without installing" section documenting `npx shipcard <command>` pattern
- All `@jjaimealeman/shipcard` references replaced

### docs/mcp-config.md (at `/home/jaime/www/_github/SaaS/shiplog/docs/mcp-config.md`)
Current state: Uses `@jjaimealeman/shipcard` throughout.
Needs: All occurrences replaced with `shipcard`.

### Files to grep before closing phase:
```bash
grep -r "@jjaimealeman" /path/to/SaaS --include="*.md" --include="*.json" \
  --exclude-dir=node_modules
```

---

## Open Questions

1. **Is the GitHub OAuth App already deployed with Device Flow enabled?**
   - What we know: Client ID `Ov23lijo8A2inPwKNCnx` is real and already hardcoded in `login.ts`.
     Worker secrets (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, TOKEN_SECRET) were noted as deployed
     in Phase 5 actions.
   - What's unclear: Whether the OAuth App's "Device Flow" checkbox was checked at creation time.
   - Recommendation: This is the first thing to verify. Check GitHub settings before any testing.

2. **Is the live Worker currently running at shipcard.dev?**
   - What we know: Phase 5 noted "Run wrangler deploy before end-to-end login/sync testing."
   - What's unclear: Whether deploy was actually executed in Phase 5.
   - Recommendation: Run a health check: `curl https://shipcard.dev/` and verify it returns
     `{"name":"shipcard","status":"ok","version":"0.1.0"}` before testing auth.

3. **Has anyone checked whether `shipcard` npm name is still available?**
   - What we know: CONTEXT.md says it's available as of 2026-03-26.
   - Recommendation: Verify immediately at start of phase with `npm view shipcard`.

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `shiplog/src/cli/commands/login.ts`, `shiplog-worker/src/routes/auth.ts`,
  `shiplog/package.json`, `shiplog-worker/wrangler.jsonc`, `shiplog-worker/src/kv.ts`
- GitHub OAuth Device Flow official docs: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- v1 Milestone Audit: `.planning/v1-MILESTONE-AUDIT.md`

### Secondary (MEDIUM confidence)
- Wrangler .dev.vars fix: https://github.com/cloudflare/workers-sdk/issues/11264 (verified fixed in 4.48+, current install is 4.77.0)
- npm unscoped package publishing: https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/

### Tertiary (LOW confidence)
- npx -p pattern behavior: inferred from npm docs + community pattern; no direct test

---

## Metadata

**Confidence breakdown:**
- OAuth flow correctness: HIGH — code reviewed in detail, matches GitHub docs exactly
- Device Flow enabled requirement: HIGH — documented in GitHub official docs as explicit opt-in
- npm name change mechanics: HIGH — straightforward package.json edit + publish
- .dev.vars local testing: HIGH — wrangler 4.77.0 (past the 4.48 fix), file is gitignored
- npx invocation simplification: MEDIUM — inferred from npm scoping rules, not live-tested

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (stable domain — npm and GitHub OAuth policies don't change often)
