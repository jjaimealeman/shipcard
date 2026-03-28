# Phase 5: Publish + Launch - Research

**Researched:** 2026-03-25
**Domain:** npm publishing, tsup build tooling, Cloudflare Worker custom domain deployment, GitHub camo SVG behavior, README best practices
**Confidence:** HIGH (core npm and Cloudflare docs verified); MEDIUM (tsup/tsdown status, shebang handling); LOW (camo cache behavior)

---

## Summary

Phase 5 has four distinct work streams that must complete in order: (1) full codebase rename from shiplog to shipcard, (2) tsup build configuration for the npm package, (3) Worker deploy to shipcard.dev custom domain, and (4) README + supplementary docs. The rename is a hard prerequisite for everything else — the npm package name, bin entries, config file paths, and Worker name all change.

The npm side is well-understood. The package name `shipcard` is confirmed available on npm. The existing tsc-based build (with chmod 755 applied in the build script) is fully functional; tsup is an optional improvement for smaller output and cleaner config but is not required to ship. The shebangs already exist in the source files (`#!/usr/bin/env node`), so `npm install -g shipcard` will produce working executables regardless of whether tsc or tsup is the compiler. The critical npm publish requirement is: correct `bin`, `files`, `engines`, and `exports` fields, followed by `npm pack --dry-run` verification, then `npm publish --access public`.

The Cloudflare Worker deploy to shipcard.dev requires: creating KV namespaces in production, setting secrets via `wrangler secret put`, adding the `routes` custom domain entry to wrangler.jsonc, and creating the GitHub OAuth App to get a real Client ID. The `wrangler deploy` command handles TLS provisioning automatically when `custom_domain: true` is set. Notably, the Worker name must be updated from `shiplog-worker` to `shipcard` (or similar) before deploy.

The most important launch risk is the camo proxy. GitHub's image proxy (camo.githubusercontent.com) aggressively caches images fetched from external URLs. The Worker already returns `Cache-Control: no-cache, no-store` headers on SVG responses (established in Phase 4), which instructs camo to re-fetch on each page load. This is the correct behavior for a dynamic stats card. However, camo's actual compliance with no-store is inconsistently documented. The README embed must use `![](https://shipcard.dev/u/username)` syntax (img tag via Markdown), not inline `<svg>` or base64 data URIs — both of those fail to render on GitHub.

**Primary recommendation:** Do the rename first (single pass, grep/sed across all files), then build and pack-test, then deploy Worker, then write README. This order eliminates wasted work and allows the README to reference a live card.

---

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| `tsc` | ^5.x (existing) | TypeScript compilation for npm package | Already in use; Node16 module resolution; zero additional deps |
| `tsup` | ^8.5.1 | Alternative bundler for smaller output | If switching: ESM-only, handles shebangs from source, banner option; but tsup is now unmaintained (see State of the Art) |
| `npm` CLI | v11+ | Publish to registry | Use `npm login`, `npm pack --dry-run`, `npm publish --access public` |
| `wrangler` | ^4.x (existing) | Worker deploy, secret management, KV create | Already in use; `wrangler deploy` handles custom domain + TLS |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `tsdown` | latest | Replacement for tsup (ESM-first, rolldown-based) | If migrating away from tsc; newer and actively maintained |
| `npm pack` | built-in | Pre-publish verification | Run before every publish to inspect tarball contents |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tsc` (current) | `tsup` | tsup produces smaller bundles and cleaner single-file output; tsc is already working and zero-cost to keep |
| `tsup` | `tsdown` | tsdown is the actively maintained successor to tsup; same config shape with migration codemod available; MEDIUM confidence it handles shebangs correctly in ESM mode |
| `npm publish --access public` | Automated CI publish | CI publish adds complexity; manual first publish with OTP is standard for solo indie projects |

### Installation (if adding tsup)

```bash
cd shipcard   # (renamed from shiplog)
npm install --save-dev tsup
```

---

## Architecture Patterns

### Rename Strategy

The rename from `shiplog` to `shipcard` touches:
- Directory name: `shipcard/` → `shipcard/`
- Directory name: `shipcard-worker/` → `shipcard-worker/` (or keep as-is for Worker infra, just rename `name` field)
- `package.json` name fields
- `bin` entries: `shiplog` → `shipcard`, `shiplog-mcp` → `shipcard-mcp`
- Config file paths: `~/.shipcard/config.json` → `~/.shipcard/config.json`, `~/.shiplog.json` → `~/.shipcard.json`
- Wrangler `name` field: `shiplog-worker` → `shipcard`
- All import references, type names, and variable names in source
- README, USAGE.md, STYLES.md content

**Approach:** One grep pass to identify all `shiplog` occurrences, then a single sed pass or targeted file-by-file edits. Do this before touching build config.

### package.json Final Shape (shipcard)

```json
{
  "name": "shipcard",
  "version": "0.1.0",
  "type": "module",
  "description": "Embeddable stats cards for agentic developers — reads Claude Code JSONL files",
  "main": "./dist/index.js",
  "exports": {
    ".": "./dist/index.js"
  },
  "bin": {
    "shipcard": "./dist/cli/index.js",
    "shipcard-mcp": "./dist/mcp/server.js"
  },
  "files": [
    "dist/",
    "data/"
  ],
  "engines": {
    "node": ">=22.0.0"
  },
  "scripts": {
    "build": "tsc && chmod 755 dist/cli/index.js dist/mcp/server.js",
    "typecheck": "tsc --noEmit"
  },
  "license": "MIT"
}
```

Key points:
- `"type": "module"` — ESM only
- Both `dist/` and `data/` in `files` — pricing snapshot lives in `data/`
- `chmod 755` in the build script — executable bits on bin files
- Shebangs (`#!/usr/bin/env node`) already present in source files, carry through to dist
- `"license": "MIT"` — PUB-03 requirement

### tsup Configuration (if switching from tsc)

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'cli/index': 'src/cli/index.ts',
    'mcp/server': 'src/mcp/server.ts',
    'index': 'src/index.ts',
  },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  dts: true,
  sourcemap: false,
  clean: true,
  // tsup detects #!/usr/bin/env node in source and preserves it
  // no banner needed if shebang already in source
})
```

**Important:** tsup automatically detects and preserves shebangs from source files. The `chmod 755` step is still needed in the build script because tsup does not set executable bits.

### Worker Custom Domain Deploy

```jsonc
// wrangler.jsonc (updated)
{
  "name": "shipcard",
  "main": "src/index.ts",
  "compatibility_date": "2026-03-25",
  "routes": [
    {
      "pattern": "shipcard.dev",
      "custom_domain": true
    }
  ],
  "kv_namespaces": [
    { "binding": "CARDS_KV", "id": "<CARDS_KV_ID>" },
    { "binding": "USER_DATA_KV", "id": "<USER_DATA_KV_ID>" }
  ]
}
```

`wrangler deploy` will provision the TLS certificate automatically when `custom_domain: true`.

### README Structure

```markdown
# shipcard

[live card embed — real data from the author's own usage]

Tagline — one sentence, no jargon.

## Quick Start

4 commands max.

## Card embed

Single `![](https://shipcard.dev/u/username)` line showing the syntax.

## MCP config

Copy-paste block for claude_desktop_config.json / .claude/settings.json.

## CLI

3-4 command examples. Full reference → USAGE.md.

---

More card styles → STYLES.md
Configurator → shipcard.dev
```

### README Embed Syntax (GitHub-safe)

```markdown
![ShipCard](https://shipcard.dev/u/username)
```

Or with HTML img for width control:
```html
<img src="https://shipcard.dev/u/username" alt="ShipCard" width="495" />
```

**Never use:**
- Inline `<svg>` tags — GitHub's Markdown renderer skips them entirely
- `data:image/svg+xml;base64,...` data URIs — renders as empty img src
- Raw SVG file references from `raw.githubusercontent.com` — served as `text/plain`

### Full Dry Run Order of Operations

1. Rename codebase (grep + sed pass)
2. `npm run build` — verify clean compile
3. `npm pack --dry-run` — inspect what would be published
4. `npm pack` — create actual tarball for local test
5. `tar -tzf shipcard-0.1.0.tgz` — verify file list
6. `npm install -g ./shipcard-0.1.0.tgz` — test global install
7. `shipcard --help` and `shipcard-mcp --version` — verify both bin entries
8. `npx shipcard summary` — verify npx path (no global install)
9. Create KV namespaces: `npx wrangler kv namespace create CARDS_KV` and `USER_DATA_KV`
10. Update wrangler.jsonc with real KV namespace IDs
11. Create GitHub OAuth App, copy Client ID
12. `npx wrangler secret put GITHUB_CLIENT_ID`
13. `npx wrangler secret put GITHUB_CLIENT_SECRET`
14. `npx wrangler secret put TOKEN_SECRET`
15. `npx wrangler deploy` — deploys to shipcard.dev
16. Test card URL: `curl https://shipcard.dev/u/username` (before syncing real data)
17. `npm publish --access public` (with OTP from authenticator)
18. `npm install -g shipcard` — test registry install
19. Full end-to-end: `shipcard login` → `shipcard sync` → check live card URL

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shebang injection | Custom banner/wrapper | Put `#!/usr/bin/env node` in source file | tsc and tsup both preserve it; chmod 755 handles executable bit |
| Tarball inspection | Custom file listing script | `npm pack --dry-run` and `tar -tzf` | Built into npm; shows exact what registry would receive |
| TLS for custom domain | Manual cert provisioning | `custom_domain: true` in wrangler.jsonc | Cloudflare handles cert provisioning automatically |
| Cache-busting | Query string tricks | `Cache-Control: no-cache, no-store` header from Worker | Already implemented in Phase 4; avoid URL tricks that break README embed stability |
| KV namespace creation | Cloudflare dashboard | `npx wrangler kv namespace create BINDING_NAME` | CLI returns the namespace ID, paste into wrangler.jsonc |

**Key insight:** The build and publish toolchain is all commodity. Avoid custom scripts for things `npm pack`, `wrangler`, and the existing `build` script already handle.

---

## Common Pitfalls

### Pitfall 1: Rename Incomplete — shiplog References Survive

**What goes wrong:** `shipcard login` stores config at `~/.shipcard/config.json` instead of `~/.shipcard/config.json` because the path string was missed in the rename.
**Why it happens:** Config paths are string literals, not derived from `package.json`. Easy to miss with a naive grep.
**How to avoid:** Grep for all occurrences of `shiplog` (case-insensitive) before declaring rename done. Check: source files, test fixtures, wrangler.jsonc Worker name, wrangler secrets, README examples, USAGE.md, and any hardcoded strings in auth.ts / config.ts.
**Warning signs:** `~/.shipcard/` directory created after install.

### Pitfall 2: KV Namespace IDs Are Placeholders

**What goes wrong:** `wrangler deploy` succeeds but Worker crashes at runtime because KV bindings point to placeholder IDs.
**Why it happens:** wrangler.jsonc was scaffolded with `<REPLACE_WITH_...>` IDs.
**How to avoid:** Run `npx wrangler kv namespace create CARDS_KV` and `npx wrangler kv namespace create USER_DATA_KV`, then paste the returned IDs into wrangler.jsonc before deploying.
**Warning signs:** Wrangler deploy succeeds but GET `/u/username` returns 500.

### Pitfall 3: GitHub OAuth Client ID Is Still a Placeholder

**What goes wrong:** `shipcard login` fails immediately because `SHIPLOG_GITHUB_CLIENT_ID` placeholder was never replaced.
**Why it happens:** The OAuth App must be created manually; it's not automatable.
**How to avoid:** Create GitHub OAuth App at Settings → Developer settings → OAuth Apps. Set callback URL to `https://shipcard.dev/auth/callback`. Copy the Client ID and put it in the Worker's secrets: `npx wrangler secret put GITHUB_CLIENT_ID`.
**Warning signs:** Login command errors with "Bad credentials" or GitHub returns 422 on device flow request.

### Pitfall 4: data/ Directory Missing from npm Package

**What goes wrong:** `shipcard costs` crashes at runtime because `pricing-snapshot.json` is not found.
**Why it happens:** `files` field in package.json only includes `dist/` but the pricing data lives in `data/`.
**How to avoid:** Verify `"files": ["dist/", "data/"]` in package.json. Confirm with `npm pack --dry-run` that `data/pricing-snapshot.json` appears in the file list.
**Warning signs:** `Error: ENOENT: no such file or directory, open '.../data/pricing-snapshot.json'` after global install.

### Pitfall 5: SVG Embed Using Wrong Syntax in README

**What goes wrong:** The card doesn't render on GitHub despite the URL being valid.
**Why it happens:** Using `<svg>` inline or `data:image/svg+xml;base64,...` data URIs — both are stripped by GitHub's Markdown sanitizer.
**How to avoid:** Use Markdown img syntax: `![ShipCard](https://shipcard.dev/u/username)` or `<img src="...">` HTML tag. Never embed raw SVG content.
**Warning signs:** Card shows as broken image or nothing renders where the embed should be.

### Pitfall 6: Worker Name Mismatch After Rename

**What goes wrong:** `wrangler deploy` deploys to `shiplog-worker.workers.dev` instead of `shipcard.workers.dev`.
**Why it happens:** The `name` field in wrangler.jsonc was not updated from `shiplog-worker` to `shipcard`.
**How to avoid:** Update `"name": "shipcard"` in wrangler.jsonc as part of the rename pass.
**Warning signs:** `wrangler deploy` output shows wrong Worker name.

### Pitfall 7: npm 2FA/OTP Required for First Publish

**What goes wrong:** `npm publish` fails with "You must provide a one-time password" even with correct credentials.
**Why it happens:** npm now requires 2FA for all package publishing. First-time publishers must set up 2FA before publish works.
**How to avoid:** Have an authenticator app (Authy, Google Authenticator) linked to npm account. Use `npm publish --access public --otp=<code>`. Alternatively: `npm login --auth-type=web` opens browser for 2FA auth.
**Warning signs:** `402 Payment Required` or `OTP required` error from npm CLI.

---

## Code Examples

### npm pack dry run (verify before publish)

```bash
# Source: https://docs.npmjs.com/cli/v11/commands/npm-publish/
cd shipcard
npm run build
npm pack --dry-run
# Shows: Tarball Contents, package size, file list
# Verify: dist/ files, data/pricing-snapshot.json, no node_modules, no src/
```

### Inspect actual tarball

```bash
npm pack
tar -tzf shipcard-0.1.0.tgz | sort
# Expected:
# package/package.json
# package/dist/cli/index.js
# package/dist/mcp/server.js
# package/dist/index.js
# package/data/pricing-snapshot.json
```

### First-time npm publish

```bash
# Source: https://docs.npmjs.com/cli/v11/commands/npm-publish/
npm login                    # creates/uses ~/.npmrc with token
npm publish --access public  # prompts for OTP if 2FA enabled
# or: npm publish --access public --otp=123456
```

### Create KV namespaces (wrangler CLI)

```bash
# Source: https://developers.cloudflare.com/kv/get-started/
cd shipcard-worker   # (renamed from shiplog-worker)
npx wrangler kv namespace create CARDS_KV
# Output: { binding: 'CARDS_KV', id: 'abc123...' }
npx wrangler kv namespace create USER_DATA_KV
# Output: { binding: 'USER_DATA_KV', id: 'def456...' }
# Paste IDs into wrangler.jsonc kv_namespaces array
```

### Set Worker secrets

```bash
# Source: Cloudflare Workers docs
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put TOKEN_SECRET
# Each prompts for the value interactively (never stored in files)
```

### wrangler.jsonc custom domain entry

```jsonc
// Source: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
{
  "name": "shipcard",
  "routes": [
    {
      "pattern": "shipcard.dev",
      "custom_domain": true
    }
  ]
}
```

### Grep for rename verification

```bash
# Find all remaining shiplog references after rename
grep -r "shiplog" /home/jaime/www/_github/SaaS/shipcard --include="*.ts" --include="*.json" --include="*.md" -l
```

### README card embed (GitHub-safe)

```markdown
![ShipCard](https://shipcard.dev/u/yourusername)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tsc only for library build | tsup (esbuild-based) or tsdown (rolldown-based) | 2022-2024 | Smaller output, cleaner config; not required if tsc already works |
| tsup as the standard bundler | tsdown preferred (tsup unmaintained as of late 2025) | Nov 2025 | tsup v8.5.1 is last release; tsdown is the replacement; automated migration via `npx tsdown-migrate` |
| Dual CJS+ESM builds | ESM-only for Node 22+ tools | 2024-2025 | No CJS needed when `engines.node >= 22.0.0` |
| workers.dev subdomain | Custom domain from day one | Always possible | `custom_domain: true` in routes; Cloudflare provisions TLS automatically |

**Deprecated/outdated:**
- **tsup**: No longer actively maintained. Current recommendation is tsdown. However: tsup v8.5.1 still works; the decision to use it here is acceptable for a Phase 5 ship goal. Migration to tsdown can be a post-launch task.
- **.npmignore**: Superseded by `files` field in package.json for whitelist approach. Use `files` (already in package.json).

---

## Open Questions

1. **tsup vs tsc: is the switch worth it for Phase 5?**
   - What we know: tsc already works; tsup produces cleaner single-file output but is unmaintained; tsdown is the modern choice
   - What's unclear: Whether CONTEXT.md's "tsup for library publishing" decision is firm given tsup's maintenance status
   - Recommendation: **Stay with tsc** for Phase 5. The existing build script works. Add tsup/tsdown as a follow-up if output size is a concern. The CONTEXT.md decision was made before the tsup unmaintained status was surfaced — flag for the user.

2. **Worker name: `shipcard` or `shipcard-worker`?**
   - What we know: Wrangler `name` becomes the workers.dev subdomain (`shipcard.workers.dev`); custom domain overrides this for production
   - What's unclear: User preference for the workers.dev fallback subdomain
   - Recommendation: Use `"name": "shipcard"` — cleaner, and the workers.dev subdomain matters less once shipcard.dev is live

3. **GitHub OAuth App callback URL**
   - What we know: Must be `https://shipcard.dev/auth/callback` for production; the CLI uses device flow (no redirect needed for CLI auth)
   - What's unclear: Whether the existing Worker auth routes use device flow (no callback needed) or web flow (callback needed)
   - Recommendation: Check `shipcard-worker/src/auth.ts` — if using `@octokit/auth-oauth-device` on CLI side only, the OAuth App's callback URL is irrelevant for CLI flow. Still create the OAuth App with a callback URL pointing to shipcard.dev for completeness.

---

## Sources

### Primary (HIGH confidence)
- Cloudflare Workers Custom Domains docs — https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Cloudflare KV Get Started — https://developers.cloudflare.com/kv/get-started/
- npm publish docs — https://docs.npmjs.com/cli/v11/commands/npm-publish/
- npm package.json docs — https://docs.npmjs.com/files/package.json/
- tsdown migration guide — https://tsdown.dev/guide/migrate-from-tsup

### Secondary (MEDIUM confidence)
- tsup GitHub repo (unmaintained notice, v8.5.1) — https://github.com/egoist/tsup
- SVG rendering rules on GitHub (2024) — https://alexwlchan.net/notes/2024/how-to-render-svgs-on-github/
- tsdown shebang/bin discussion — https://github.com/rolldown/tsdown/discussions/589

### Tertiary (LOW confidence)
- GitHub camo cache compliance with no-store headers — multiple community sources agree headers work, but compliance is inconsistently documented
- npm 2FA OTP changes — community reports of npm disabling new OTP key creation for some accounts; `--auth-type=web` is the reliable fallback

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm publish and wrangler deploy are well-documented; tsc build already verified in prior phases
- Architecture (rename strategy): HIGH — grep/sed is straightforward; pitfalls are known and enumerable
- Architecture (Worker custom domain): HIGH — official Cloudflare docs verified the exact config fields
- Architecture (README SVG embed): HIGH — GitHub SVG rendering rules verified with 2024 source
- Pitfalls: MEDIUM — camo cache behavior has some LOW confidence aspects; npm 2FA flow has edge cases
- tsup shebang handling: MEDIUM — confirmed source shebangs are preserved; chmod 755 step still required

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable tooling; re-verify tsdown status if switching from tsc)
