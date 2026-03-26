---
phase: 07-auth-verify-docs
verified: 2026-03-26T07:03:40Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 7: Auth, Verify, Docs Verification Report

**Phase Goal:** OAuth login works end-to-end and npx CLI usage is discoverable without global install
**Verified:** 2026-03-26T07:03:40Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | npm package name is 'shipcard' (unscoped) in package.json | VERIFIED | `shiplog/package.json` line 2: `"name": "shipcard"` |
| 2 | All docs reference 'shipcard' not '@jjaimealeman/shipcard' | VERIFIED | grep across all active .md/.json (excluding .planning history) returns zero @jjaimealeman hits |
| 3 | npx shipcard summary works without -p flag (after publish) | VERIFIED | README.md line 25: `npx shipcard summary` under "Or without installing:" block |
| 4 | MCP config docs still use -p shipcard for shipcard-mcp binary | VERIFIED | README.md:61, USAGE.md:159, mcp-config.md:14,29 all show `["-y", "-p", "shipcard", "shipcard-mcp"]` |
| 5 | shipcard login completes GitHub device flow end-to-end | VERIFIED (human) | login.ts is 182 lines with full device flow: verification_url display, user_code prompt, Worker /auth/exchange token swap, saveAuthConfig write. Human-verified per SUMMARY.md — OAuth login → sync → card render completed against local Worker |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `shiplog/package.json` | `"name": "shipcard"` (unscoped) | VERIFIED | Line 2 confirmed; bin entries: `shipcard` → `./dist/cli/index.js`, `shipcard-mcp` → `./dist/mcp/server.js` |
| `README.md` | `npx shipcard summary` present | VERIFIED | Line 25: direct npx command; Line 61: MCP block with `-p shipcard` |
| `USAGE.md` | MCP config with `-p shipcard` | VERIFIED | Line 159: `["-y", "-p", "shipcard", "shipcard-mcp"]` |
| `shiplog/docs/mcp-config.md` | All references updated to `shipcard` | VERIFIED | Lines 14 and 29: both Claude Code and Cursor blocks use `-p shipcard` |
| `shiplog/src/cli/commands/login.ts` | Full device flow implementation | VERIFIED | 182 lines; device_authorization, user_code display, Worker /auth/exchange, saveAuthConfig write — not a stub |
| `shiplog-worker/src/types.ts` | `looksLikeFilePath` uses `~/` not `~` | VERIFIED | Line 92: `value.startsWith("/") \|\| value.startsWith("~/")` — cost strings like `~$3,414` no longer rejected |
| `shiplog/dist/cli/index.js` | Build output present | VERIFIED | File exists at expected path |
| `shiplog/dist/mcp/server.js` | Build output present | VERIFIED | File exists at expected path |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| README.md Quick Start | shiplog/package.json | package name consistency | WIRED | Line 14: `npm install -g shipcard`; Line 25: `npx shipcard summary` — both match unscoped name |
| README.md MCP Config | shiplog/package.json bin entries | `npx -p shipcard shipcard-mcp` | WIRED | Line 61: `["-y", "-p", "shipcard", "shipcard-mcp"]` — `-p` required because binary name differs from package name |
| USAGE.md MCP Setup | shiplog/package.json bin entries | `npx -p shipcard shipcard-mcp` | WIRED | Line 159: same pattern confirmed |
| mcp-config.md | shiplog/package.json bin entries | `-p shipcard` | WIRED | Lines 14+29: Claude Code and Cursor blocks both correct |
| login.ts | Worker /auth/exchange | fetch POST with GitHub token | WIRED | Line 149: `fetch(\`${workerUrl}/auth/exchange\`, ...)` with real token exchange and error handling |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| SC-2: npx CLI invocation documented | SATISFIED | README Quick Start now shows `npx shipcard summary` directly — gap from Phase 5 verification closed |
| OAuth device flow working | SATISFIED | Human-verified end-to-end (login → sync → card rendered) |
| SafeStats validator accepts real cost strings | SATISFIED | `looksLikeFilePath` bug fixed: `~` tightened to `~/` |

### Anti-Patterns Found

None. No TODO/FIXME/placeholder patterns in modified files. login.ts has full implementation. All docs are substantive.

### Human Verification Required

One item was human-verified during execution (cannot verify programmatically):

**OAuth device flow completion**
- Test: Run `node dist/cli/index.js login`, complete GitHub device authorization, then run `sync --confirm` and fetch the card URL
- Expected: CLI prints "Logged in as \<username>", sync returns card URL, curl returns SVG
- Why human: Requires real GitHub OAuth App, live secrets, network round-trip — not verifiable statically
- Result: PASSED — per SUMMARY.md, user completed login → sync → card render against local Worker. Transient "fetch failed" on first attempt resolved on retry. SafeStats validator bug discovered and fixed mid-session.

### Gaps Summary

No gaps. All 5 must-haves verified. The package rename is clean — zero `@jjaimealeman` references in any user-facing .md or .json file. Documentation is consistent: `npx shipcard summary` for CLI, `-p shipcard` for MCP (correctly preserving the `-p` flag since the binary name `shipcard-mcp` does not match the package name `shipcard`). The OAuth login implementation is complete and was human-verified end-to-end.

One item noted for a future phase (not a gap): production Worker deploy needed (`wrangler deploy`) to push the SafeStats `looksLikeFilePath` fix live. Card display improvements (synthetic model name cleanup) also flagged for a near-future phase.

---

_Verified: 2026-03-26T07:03:40Z_
_Verifier: Claude (gsd-verifier)_
