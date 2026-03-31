# Phase 21: Clack CLI - Research

**Researched:** 2026-03-29
**Domain:** Interactive CLI prompts with @clack/prompts, TTY detection, non-interactive fallback
**Confidence:** HIGH

---

## Summary

This phase upgrades ShipCard's CLI output from plain `process.stdout.write()` calls to polished Clack-styled terminal UI for interactive sessions, while preserving all existing plain-text behavior for MCP and pipe contexts. The research confirms `@clack/prompts` v1.1.0 is the standard, well-documented choice with a stable API. The library ships spinners, confirm prompts, intro/outro framing, log utilities, and note boxes — everything needed for the tiered approach specified in the context.

**Critical finding:** Clack does NOT have built-in TTY detection. When Clack prompt components (text, confirm, select) are called in a non-TTY environment, they will call `setRawMode()` on stdin which throws or hangs. Spinners and log functions are safer — spinners check `isCI` but not `isTTY`. The safe pattern is to guard all Clack calls behind `process.stdout.isTTY` in the calling code, which matches the existing `shouldUseColor()` pattern in `cli/index.ts`.

**Primary recommendation:** Install `@clack/prompts@^1.1.0`, create a central `cli/clack.ts` TTY-guard module, and wrap all Clack calls behind `isTTY` checks. Never call Clack prompt components (confirm, select, text) in non-TTY paths.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @clack/prompts | ^1.1.0 | Styled terminal prompts, spinners, log | Official high-level API over @clack/core. Includes all needed components. Source: Context7 + npm verified |
| @clack/core | ^1.1.0 | (peer dep, auto-installed) | Unstyled primitives, re-exports `isCancel`, `updateSettings` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | All required components are in @clack/prompts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @clack/prompts | @reliverse/prompts | More CI/non-TTY handling built-in, but niche library and adds dependency weight |
| @clack/prompts | inquirer | Heavier, older API, no native Clack visual style |
| @clack/prompts | @inquirer/prompts | Better TTY handling but loses Clack's visual brand that user wants |

**Installation:**
```bash
npm install @clack/prompts
```

---

## Architecture Patterns

### Recommended Project Structure

The only structural addition is a single TTY-guard helper module:

```
shipcard/src/cli/
├── index.ts           # Entry point — TTY detection here (already has shouldUseColor())
├── clack.ts           # NEW: TTY-aware Clack wrappers (isTTY guard)
├── format.ts          # Unchanged — plain text table formatters
├── args.ts            # Unchanged
├── config.ts          # Unchanged
├── safestats.ts       # Unchanged
└── commands/
    ├── summary.ts     # Add Clack intro/outro framing only
    ├── costs.ts       # Add Clack intro/outro framing only
    ├── card.ts        # Add Clack intro/outro framing only
    ├── login.ts       # Full Clack walkthrough
    ├── sync.ts        # Clack spinner + confirm for --delete
    └── slug.ts        # Clack confirm for delete, light framing for create/list
```

### Pattern 1: Central TTY Guard Module

Create `cli/clack.ts` that exports safe wrappers. All commands import from here, never from `@clack/prompts` directly.

```typescript
// Source: @clack/prompts v1.1.0 + isTTY pattern from cli/index.ts
import * as p from '@clack/prompts';

const isTTY = (): boolean => process.stdout.isTTY === true;

export function intro(title: string): void {
  if (!isTTY()) return;
  p.intro(title);
}

export function outro(message: string): void {
  if (!isTTY()) return;
  p.outro(message);
}

export function logSuccess(msg: string): void {
  if (!isTTY()) { process.stdout.write(msg + '\n'); return; }
  p.log.success(msg);
}

export function logStep(msg: string): void {
  if (!isTTY()) { process.stderr.write(msg + '\n'); return; }
  p.log.step(msg);
}

export function logWarn(msg: string): void {
  if (!isTTY()) { process.stderr.write('Warning: ' + msg + '\n'); return; }
  p.log.warn(msg);
}

export function logError(msg: string): void {
  if (!isTTY()) { process.stderr.write('Error: ' + msg + '\n'); return; }
  p.log.error(msg);
}

// ONLY call in TTY paths — never in fallback branches
export async function confirm(message: string): Promise<boolean> {
  // Guard: must only be called when isTTY() is true
  const result = await p.confirm({ message });
  if (p.isCancel(result)) {
    p.cancel('Operation cancelled.');
    process.exit(0);
  }
  return result as boolean;
}

export function createSpinner() {
  return p.spinner();
}

export { p as clack };
```

### Pattern 2: Login Full Clack Walkthrough

The login command maps directly to Clack's step-by-step pattern:

```typescript
// Source: @clack/prompts README + Context7
import { intro, outro, logStep, logSuccess, createSpinner } from '../clack.js';

export async function runLogin(_flags: LoginFlags): Promise<void> {
  const isTTY = process.stdout.isTTY === true;

  if (isTTY) {
    intro('ShipCard — GitHub Authentication');
  }

  const auth = createOAuthDeviceAuth({
    clientType: 'oauth-app',
    clientId: SHIPCARD_GITHUB_CLIENT_ID,
    scopes: ['read:user'],
    onVerification(verification) {
      if (isTTY) {
        logStep('Opening browser to authorize...');
        // Show verification URL via log.message for boxed display
        clack.note(
          `${verification.verification_uri}\n\nCode: ${verification.user_code}`,
          'Authorize in browser'
        );
      } else {
        // existing plain-text output
        process.stderr.write(`Open: ${verification.verification_uri}\n`);
        process.stderr.write(`Code: ${verification.user_code}\n`);
      }
      openUrl(verification.verification_uri);
    },
  });

  let githubToken: string;
  if (isTTY) {
    const s = createSpinner();
    s.start('Waiting for authorization...');
    try {
      const result = await auth({ type: 'oauth' });
      githubToken = result.token;
      s.stop('GitHub authorized');
    } catch (err) {
      s.error('Authorization failed');
      // handle error...
    }
  } else {
    // existing plain-text path
  }

  // ... rest of flow ...

  if (isTTY) {
    outro('Authenticated! Run `shipcard sync` to publish your card.');
  } else {
    process.stdout.write(`Logged in as ${username}\n`);
  }
}
```

### Pattern 3: Confirm Prompt for Destructive Actions

For `sync --delete` and `slug delete`:

```typescript
// Source: @clack/prompts confirm API
import { confirm } from '@clack/prompts';
import { isCancel, cancel } from '@clack/prompts';

// Only called when isTTY — never in non-TTY path
async function confirmDelete(slug: string): Promise<boolean> {
  const shouldDelete = await confirm({
    message: `Delete slug "${slug}"? This cannot be undone.`,
  });
  if (isCancel(shouldDelete)) {
    cancel('Cancelled.');
    process.exit(0);
  }
  return shouldDelete as boolean;
}
```

### Pattern 4: Read-Only Command Light Framing

```typescript
// For summary, costs, card commands
export async function runSummary(flags: SummaryFlags): Promise<void> {
  const isTTY = process.stdout.isTTY === true;

  if (isTTY && !flags.json) {
    intro('ShipCard — Summary');
  }

  const result = await runEngine({ since: flags.since, until: flags.until });

  // existing output logic unchanged...
  if (flags.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(formatSummary(result, { color: flags.color }) + '\n');
  }

  if (isTTY && !flags.json) {
    outro('Done.');
  }
}
```

### Pattern 5: Spinner for Sync

```typescript
// Source: @clack/prompts spinner API (Context7 verified)
const s = p.spinner();
s.start('Analyzing local stats...');
const { result, messages, userMessagesByDate } = await runEngineFull({ ... });
s.stop('Stats analyzed');

s.start('Syncing to cloud...');
// ... network call ...
s.stop('Synced!');
```

### Anti-Patterns to Avoid

- **Calling Clack confirm/text/select outside a TTY guard:** Will call `setRawMode()` on non-TTY stdin, causing a crash or hang in MCP/pipe contexts. Always gate with `process.stdout.isTTY`.
- **Importing from @clack/prompts directly in command files:** Forces every caller to remember the TTY guard. Use the central `cli/clack.ts` wrapper instead.
- **Using intro/outro with --json flag:** Clutters JSON output. Always suppress Clack framing when `flags.json` is true.
- **Replacing existing process.stdout.write in non-TTY paths:** The non-TTY fallback must stay identical to current behavior — same strings, same exit codes.
- **Using p.note() for spinner messages:** note() is a static box, not animated. Use `s.start()`/`s.stop()` for progress, `p.note()` only for informational callouts.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Animated spinner | Custom interval + ANSI codes | `p.spinner()` | Handles CI detection, cursor hiding, signal cleanup, timer/dots modes |
| Confirm prompt | Manual readline question | `p.confirm()` | Handles keypress, cancel signal, styled output |
| Step logging | Custom ANSI color wrapping | `p.log.step/success/warn/error` | Consistent symbol + color semantics |
| Intro/outro banners | Custom box-drawing | `p.intro()` / `p.outro()` | Clack's visual language — gray border line, title inset |
| Cancel handling | Manual SIGINT listener | `p.isCancel()` + `p.cancel()` | Idiomatic Clack pattern |
| Progress box | Custom note renderer | `p.note(message, title)` | Renders bordered info box with title |

**Key insight:** Clack's visual language is a unified system. Hand-rolling any part breaks the consistent look. Use the full suite even if individual pieces seem simple.

---

## Common Pitfalls

### Pitfall 1: Clack Hangs in Non-TTY (Critical)

**What goes wrong:** Calling any Clack interactive prompt (confirm, text, select) when `process.stdout.isTTY` is falsy causes the process to attempt `setRawMode()` on a non-TTY stdin, either throwing `TypeError: setRawMode is not a function` or hanging indefinitely.

**Why it happens:** Clack's core prompt class hardcodes `terminal: true` in its readline interface and unconditionally calls `setRawMode`. It only checks `isCI` (via `process.env.CI === 'true'`) in the spinner, not the interactive prompt components.

**How to avoid:** Every call to `p.confirm()`, `p.text()`, `p.select()` must be wrapped in an `if (process.stdout.isTTY)` guard. Never rely on Clack to self-detect.

**Warning signs:** MCP tool calls returning no output, pipes silently hanging, `TypeError: process.stdin.setRawMode is not a function` in error logs.

### Pitfall 2: Intro/Outro Appearing in JSON Output

**What goes wrong:** `shipcard summary --json` emits Clack's intro banner before the JSON, breaking pipe consumers that expect raw JSON.

**How to avoid:** Always check `!flags.json` before calling `intro()` or `outro()`. Rule: Clack framing is only active when `isTTY && !flags.json`.

### Pitfall 3: Double-Output After Spinner

**What goes wrong:** After `s.stop('Message')`, calling `p.log.success('Message')` prints the same message twice — once from the spinner's stop render and once from the log call.

**How to avoid:** The spinner's `stop(msg)` call IS the success message. Don't follow it with a redundant `log.success()`. Use `s.stop()` for the final spinner state, then use `log.success()` only for separate subsequent messages.

### Pitfall 4: --confirm Flag Bypasses Clack Confirm

**What goes wrong:** `shipcard sync --confirm` is the non-interactive sync path. If the confirm prompt is shown to `--confirm` users, it defeats the purpose of the flag.

**How to avoid:** Check `flags.confirm` before showing the Clack confirm prompt in sync. Rule: `--confirm` flag = skip Clack confirm, proceed directly. The flag already documents this intent.

### Pitfall 5: Clack isCancel Not Checked After Every Prompt

**What goes wrong:** User presses Ctrl+C during a confirm/text prompt. Without the `isCancel` guard, the cancelled Symbol value flows into downstream code as if it were a boolean/string.

**How to avoid:** Always check `isCancel(result)` immediately after every `await p.confirm()`, `await p.text()`, etc. The central `cli/clack.ts` wrapper should enforce this.

---

## Code Examples

Verified patterns from official sources:

### Spinner Basic Usage
```typescript
// Source: @clack/prompts README (Context7 verified, v1.1.0)
import { spinner } from '@clack/prompts';

const s = spinner();
s.start('Installing via npm');
// ... work ...
s.stop('Installed via npm');

// Spinner options
const s2 = spinner({ indicator: 'timer' }); // shows elapsed time instead of dots
```

### Intro / Outro Framing
```typescript
// Source: @clack/prompts README (Context7 verified)
import { intro, outro } from '@clack/prompts';

intro('ShipCard — GitHub Authentication');
// ... prompts and work ...
outro("You're authenticated! Run `shipcard sync` to publish your card.");
```

### Confirm with Cancel Handling
```typescript
// Source: @clack/prompts README (Context7 verified)
import { confirm, isCancel, cancel } from '@clack/prompts';

const shouldDelete = await confirm({
  message: 'Delete all cloud data? This cannot be undone.',
});
if (isCancel(shouldDelete)) {
  cancel('Operation cancelled.');
  process.exit(0);
}
if (shouldDelete) {
  // proceed with delete
}
```

### Log Utilities
```typescript
// Source: @clack/prompts README (Context7 verified)
import { log } from '@clack/prompts';

log.info('Checking authentication...');
log.step('Opening browser...');
log.success('Authenticated as jaime');
log.warn('No JSONL files found in last 7 days');
log.error('Worker returned HTTP 500');
```

### Note Box (Informational Callout)
```typescript
// Source: @clack/prompts README (Context7 verified)
import { note } from '@clack/prompts';

note(
  `https://github.com/login/device\n\nCode: ABCD-1234`,
  'Open in browser to authorize'
);
```

### TTY Guard Pattern (ShipCard-specific)
```typescript
// Pattern derived from existing shouldUseColor() in cli/index.ts
const isTTY = process.stdout.isTTY === true;

if (isTTY && !flags.json) {
  intro('ShipCard — Summary');
}
// ... command work ...
if (isTTY && !flags.json) {
  outro('Done.');
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manually checking `process.env.CI` | `isCI()` utility built into @clack/core | v1.x | Spinners adapt to CI automatically |
| Custom spinner with setInterval | `p.spinner()` with indicator option | v1.x | Handles cleanup, signals, timer mode |
| Manual `readline.question()` for confirm | `p.confirm()` with isCancel guard | v1.x | Styled, keyboard-navigable |
| No non-TTY guard needed for log | Still no guard needed for `p.log.*` | v1.1.0 | log functions write to stdout safely |

**Deprecated/outdated:**
- Any Clack v0.x patterns: The API stabilized at v1.x; v0.x examples in older blog posts may differ slightly

---

## Open Questions

1. **Does the spinner correctly detect non-TTY vs CI?**
   - What we know: Spinner checks `process.env.CI === 'true'` for simplified output. It does NOT check `isTTY`.
   - What's unclear: If `isTTY` is false but `CI` is not set (e.g., MCP context), spinner may still attempt ANSI cursor manipulation on a non-TTY output stream, potentially garbling output.
   - Recommendation: In the TTY guard module, either skip spinner entirely in non-TTY mode, or use `p.log.step()` as the fallback for progress messages in non-TTY contexts.

2. **Should intro/outro appear on every command or only major ones?**
   - What we know: Context says Claude has discretion here.
   - Recommendation: Show intro/outro for all 6 commands in TTY+non-JSON mode. It adds polish without overhead. The banner can be minimal for read-only commands (e.g., "ShipCard — Summary" vs. full banner for login).

3. **Slug subcommand Clack tier?**
   - What we know: Context gives Claude discretion on slug create/list/delete treatment.
   - Recommendation: `slug delete` gets full confirm prompt (destructive). `slug create` gets light framing + `log.success()` with URL. `slug list` gets light intro/outro framing only — the table output is already clean.

4. **Clack render failure handling?**
   - What we know: Context gives Claude discretion.
   - Recommendation: Silent fallback. Wrap all Clack TTY blocks in try/catch. On error, fall through to the plain-text path with no warning. Clack failures should never surface to the user.

---

## Sources

### Primary (HIGH confidence)
- `/bombshell-dev/clack` (Context7 library ID) — queried: spinner API, confirm, log, intro/outro, isCancel, note, full exports
- https://github.com/bombshell-dev/clack/blob/main/packages/prompts/README.md — spinner options, confirm, full component list
- https://github.com/bombshell-dev/clack/blob/main/packages/prompts/src/common.ts — `isTTY()` and `isCI()` implementation (fetched directly)
- https://github.com/bombshell-dev/clack/blob/main/packages/core/src/prompts/prompt.ts — confirms no built-in non-TTY guard in prompt base class
- `npm view @clack/prompts version` — confirmed v1.1.0 as current release

### Secondary (MEDIUM confidence)
- https://deepwiki.com/bombshell-dev/clack/6-examples-and-usage-patterns — tasks() API, session management patterns
- https://github.com/bombshell-dev/clack/blob/main/packages/core/src/utils/settings.ts — ClackSettings/updateSettings API (no TTY settings)

### Tertiary (LOW confidence)
- WebSearch results on non-TTY handling — confirmed this is a known pain point in the ecosystem; setRawMode crash is well-documented

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm version verified, Context7 docs current
- Architecture: HIGH — based on directly inspected source code (common.ts, prompt.ts) confirming no built-in TTY guard
- Pitfalls: HIGH — setRawMode behavior verified via source inspection; double-output and --confirm patterns derived from reading existing command code

**Research date:** 2026-03-29
**Valid until:** 2026-06-01 (stable library, low churn risk)
