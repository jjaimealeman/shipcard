---
phase: 21-clack-cli
verified: 2026-03-30T03:58:13Z
status: passed
score: 7/7 must-haves verified
re_verification: false
human_verification:
  - test: "Run `shipcard login` in an interactive terminal"
    expected: "Clack intro banner, step indicators, note box with GitHub URL+code, spinner while polling, celebratory outro"
    why_human: "OAuth device flow requires real GitHub interaction; TTY visual rendering cannot be verified structurally"
  - test: "Run `shipcard summary` in a terminal, then pipe it"
    expected: "TTY shows Clack intro/outro framing; pipe produces identical table output to pre-phase-21 behavior"
    why_human: "Visual rendering and byte-identical pipe output require runtime comparison"
  - test: "Run `shipcard sync --delete` in a terminal"
    expected: "Clack confirm prompt appears; answering no exits cleanly; answering yes shows spinner and outro"
    why_human: "Interactive confirm prompt behavior cannot be verified structurally"
  - test: "Run `shipcard sync --confirm` in a terminal"
    expected: "Clack intro, spinner for analysis, spinner for cloud sync, success with card URL and note box with embed snippets, outro"
    why_human: "Requires live network connection and spinner animation verification"
  - test: "Run any command via MCP (e.g. shipcard:summary tool in Claude Code)"
    expected: "Zero Clack output; plain structured data returned to MCP caller"
    why_human: "MCP tools bypass CLI entirely and call engine directly — but the isTTY() guard on CLI should also be verified in a piped context"
---

# Phase 21: Clack CLI Verification Report

**Phase Goal:** Interactive CLI flows use polished prompts in terminal mode while remaining fully compatible with MCP and pipe usage.
**Verified:** 2026-03-30T03:58:13Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All Clack imports in commands come from `cli/clack.ts`, never from `@clack/prompts` directly | VERIFIED | `grep -r "@clack/prompts" shipcard/src/cli/commands/` returns zero results; all 6 commands import from `../clack.js` |
| 2 | `shipcard summary` in TTY shows Clack intro/outro frame; `--json` suppresses all framing | VERIFIED | `summary.ts` lines 47-48 and 91-93: `isTTY() && !flags.json` guards both `intro()` and `outro()` calls |
| 3 | `shipcard costs` and `shipcard card --local` in TTY show Clack framing | VERIFIED | Both files have identical `isTTY() && !flags.json` guards; `card.ts` line 151 shows `isTTY()` guard on `--local` outro |
| 4 | `shipcard login` in TTY shows full Clack walkthrough (intro, step, note, spinner, outro) | VERIFIED | `login.ts` is 302 lines with complete branching: `isTTY()` hoisted at line 94, all 8 Clack exports used, non-TTY path byte-identical |
| 5 | `shipcard sync --confirm` in TTY shows Clack spinners for analysis and cloud sync | VERIFIED | `sync.ts` lines 195-215 (analysis spinner) and 265-337 (sync spinner with v2/v1 fallback) fully implemented |
| 6 | `shipcard sync --delete` in TTY shows Clack confirm prompt; non-TTY skips prompt | VERIFIED | `sync.ts` lines 106-116: `isTTY()` guard, `confirm()` prompt, `outro("Cancelled.")` on false; non-TTY branch at line 150 proceeds directly |
| 7 | Non-TTY / pipe / MCP contexts produce zero Clack output | VERIFIED | `clack.ts` `intro()`/`outro()` are strict no-ops when `isTTY()` is false; MCP tools (`src/mcp/tools/`) bypass CLI entirely and call engine directly via `runEngine()` |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `shipcard/src/cli/clack.ts` | TTY-guard Clack wrappers | VERIFIED | 199 lines; 10 exports: `isTTY`, `intro`, `outro`, `note`, `logSuccess`, `logStep`, `logWarn`, `logError`, `confirm`, `createSpinner`; all guarded with `isTTY()` check |
| `shipcard/src/cli/commands/summary.ts` | Summary with Clack framing | VERIFIED | 96 lines; imports `intro, outro, isTTY` from `../clack.js`; `isTTY() && !flags.json` guards on both intro and outro |
| `shipcard/src/cli/commands/costs.ts` | Costs with Clack framing | VERIFIED | 101 lines; same pattern as summary.ts; imports from `../clack.js` |
| `shipcard/src/cli/commands/card.ts` | Card with Clack framing | VERIFIED | 173 lines; imports `intro, outro, isTTY`; `--local` outro uses plain `isTTY()` guard (correct — `--local` and `--json` are mutually exclusive) |
| `shipcard/src/cli/commands/login.ts` | Login with full Clack walkthrough | VERIFIED | 302 lines; imports 8 Clack helpers; complete TTY/non-TTY branch at every output site; `spinnerStarted` flag guards stop() on catch |
| `shipcard/src/cli/commands/sync.ts` | Sync with Clack spinners and confirm | VERIFIED | 453 lines; full TTY/non-TTY branching for `--delete`, default, and `--confirm` paths; spinner teardown before logError on failure |
| `shipcard/src/cli/commands/slug.ts` | Slug with Clack framing and confirm | VERIFIED | 451 lines; `useClack = isTTY() && !flags.json` local var for list; `isTTY()` guards on create/delete; confirm prompt on delete |
| `shipcard/package.json` | `@clack/prompts` dependency | VERIFIED | `"@clack/prompts": "^1.1.0"` present in dependencies |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `clack.ts` | `@clack/prompts` | `import * as p from "@clack/prompts"` | WIRED | Line 13 of clack.ts; all 10 exports delegate to `p.*` calls |
| `summary.ts` | `cli/clack.ts` | `import { intro, outro, isTTY } from "../clack.js"` | WIRED | Line 10; used at lines 47-49 and 91-93 |
| `costs.ts` | `cli/clack.ts` | `import { intro, outro, isTTY } from "../clack.js"` | WIRED | Line 9; used at lines 46-48 and 96-98 |
| `card.ts` | `cli/clack.ts` | `import { intro, outro, isTTY } from "../clack.js"` | WIRED | Line 17; used at lines 68-70 and 151-153 |
| `login.ts` | `cli/clack.ts` | `import { isTTY, intro, outro, ... } from "../clack.js"` | WIRED | Lines 22-32; `tty = isTTY()` hoisted once, branched throughout |
| `sync.ts` | `cli/clack.ts` | `import { isTTY, intro, outro, ... } from "../clack.js"` | WIRED | Lines 22-31; used across delete, analysis, confirm paths |
| `slug.ts` | `cli/clack.ts` | `import { isTTY, intro, outro, ... } from "../clack.js"` | WIRED | Lines 16-26; `useClack` local var for list; isTTY guards for create/delete |
| MCP tools | engine (not CLI) | `import { runEngine } from "../../index.js"` | WIRED | MCP server at `src/mcp/server.ts` calls engine directly; never imports CLI commands or clack.ts — zero Clack exposure in MCP path |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| CLI-01: `@clack/prompts` used for interactive flows (login, sync, card config) | SATISFIED | All 6 commands use Clack in TTY mode; dependency installed at `^1.1.0` |
| CLI-02: Clack output gated behind `process.stdout.isTTY`; MCP/pipe falls back to plain text | SATISFIED | `isTTY()` wrapper centralizes TTY detection; `intro()`/`outro()` are strict no-ops in non-TTY; MCP tools bypass CLI entirely |
| CLI-03: Existing command interface unchanged (no breaking changes to summary/costs/card) | SATISFIED | All existing flags (`--json`, `--since`, `--until`, `--color`, `--local`, etc.) verified present and unmodified; Clack framing is additive only; `process.stdout.write` data calls untouched |

### Anti-Patterns Found

None. No TODO/FIXME stubs, no placeholder content, no empty handlers detected across all 7 CLI source files.

### TypeScript Compilation

`cd shipcard && npx tsc --noEmit` exits with zero errors — all types valid across the full codebase including new Clack integrations.

### Human Verification Required

#### 1. Login interactive flow

**Test:** Run `shipcard login` in an interactive terminal (not via MCP).
**Expected:** Clack intro banner "ShipCard -- GitHub Authentication", step indicators, a bordered note box with the GitHub verification URL and user code, a spinner while polling, logSuccess on each milestone, and a celebratory outro with `shipcard sync` hint.
**Why human:** OAuth device flow requires a real GitHub session; spinner animation and visual layout cannot be verified structurally.

#### 2. Summary TTY vs pipe

**Test:** Run `shipcard summary` in a terminal, then run `shipcard summary | cat`.
**Expected:** Terminal shows Clack intro/outro framing around the table. Pipe produces identical table output to pre-Phase-21 behavior — no ANSI escape codes from Clack visible.
**Why human:** Byte-identical pipe behavior requires runtime comparison.

#### 3. Sync delete confirm prompt

**Test:** Run `shipcard sync --delete` in a terminal.
**Expected:** Clack confirm prompt appears. Pressing N or Ctrl+C exits with code 0. Pressing Y shows a spinner and outro.
**Why human:** Interactive confirm prompt behavior cannot be structurally verified.

#### 4. Sync --confirm full flow

**Test:** Run `shipcard sync --confirm` in a terminal.
**Expected:** Intro, spinner for "Analyzing local stats...", preview table, spinner for "Syncing to cloud...", logSuccess with card URL, note box with embed snippets, outro.
**Why human:** Requires live network and spinner animation.

#### 5. MCP context (belt-and-suspenders check)

**Test:** Invoke `shipcard:summary` tool from Claude Code MCP.
**Expected:** Structured JSON data returned; zero Clack output visible in response.
**Why human:** MCP tools already bypass CLI (structurally verified), but visual confirmation in actual MCP context provides additional confidence.

## Summary

Phase 21 goal is fully achieved at the structural level. The `clack.ts` TTY-guard module is the correct central import point — no command imports `@clack/prompts` directly. All 6 CLI commands have proper TTY-guarded Clack framing with `isTTY() && !flags.json` guards (or `isTTY()` alone where `--json` is not applicable). Non-TTY fallback paths preserve the original `process.stderr.write` / `process.stdout.write` conventions throughout. MCP tools bypass the CLI layer entirely and cannot be affected by Clack. TypeScript compiles clean with zero errors.

Five human verification items remain — these are runtime/visual checks that cannot be verified structurally. The automated verification gives high confidence that the implementation is correct.

---

_Verified: 2026-03-30T03:58:13Z_
_Verifier: Claude (gsd-verifier)_
