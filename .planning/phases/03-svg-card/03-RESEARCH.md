# Phase 3: SVG Card - Research

**Researched:** 2026-03-25
**Domain:** SVG template generation, GitHub camo proxy compatibility, dark/light theming, XML injection prevention
**Confidence:** HIGH

---

## Summary

Phase 3 upgrades `shiplog card --local` from JSON dump to a full SVG renderer that writes a committable file to the git repo root and prints a copy-paste markdown snippet. The scope is purely local — no server, no Cloudflare — just a TypeScript module that accepts `AnalyticsResult` and emits an SVG string.

The established approach for GitHub-compatible stats cards (validated by github-readme-stats and the broader readme-stats ecosystem) is: hand-rolled template literals using only `rect`, `text`, `g`, `svg`, `line`, and `defs` elements with inline `fill`/`stroke` styles and a `<style>` block for font/layout concerns. No external SVG libraries are needed or appropriate. The zero-dep constraint holds — no new runtime dependencies are required.

The single biggest research finding concerns dark/light theming. `@media (prefers-color-scheme: dark)` inside `<style>` blocks **does survive GitHub's camo proxy and SVG sanitizer**, but it is unreliable in Safari and fails when GitHub pre-caches the SVG. The production-proven alternative (adopted by github-readme-stats after testing) is explicit user-controlled theming via URL parameters / CLI flags rather than relying on in-SVG media queries. For Phase 3, the `--theme` flag generates the single requested variant; auto-detection via media query is optional but should be documented as "not guaranteed on Safari."

The `--preview` flag needs a cross-platform "open file in default browser" mechanism. The standard Node.js pattern is a 10-line platform dispatcher using `child_process.spawnSync` (no shell injection risk since the file path is not shell-interpolated when passed as a separate argument array). This keeps the zero-dep posture.

**Primary recommendation:** Zero-dep SVG via template literals. Hand-roll XML escape (5 char replacements). Use `spawnSync('git', ['rev-parse', '--show-toplevel'])` to find git root. For `--preview`, hand-roll the platform dispatcher with `spawn`/`spawnSync` and a string[] argument list (not shell string interpolation).

---

## Standard Stack

### Core (zero new runtime deps required)

| Tool | Source | Purpose | Why Standard |
|------|--------|---------|--------------|
| Template literals | TypeScript built-in | SVG string generation | No SVG lib needed for basic elements; github-readme-stats pattern |
| `node:child_process` spawnSync | Node built-in | Git root detection; `--preview` browser open | Safe: args as array, no shell injection |
| `node:fs/promises` | Node built-in | Write SVG to disk | Async, no deps |
| `node:path` | Node built-in | Path joining, filename construction | Cross-platform safe |

### Supporting (optional, adds 1 dep)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `open` | v11.0.0 | Cross-platform file/URL opener | Only if hand-rolled dispatcher is unacceptable; ESM-native, compatible with project's `"type":"module"` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Template literals | `svgson`, `@svgdotjs/svg.js` | External libs add complexity, not needed for 5 element types |
| Hand-rolled XML escape | `he`, `entities` | Libraries are overkill for 5-char substitution |
| `spawnSync` platform dispatcher | `open` npm v11 | `open` is cleaner DX, but adds 1 dep; both approaches work |
| Two SVG files (light/dark) | `@media prefers-color-scheme` in SVG | Media query survives camo but fails Safari — explicit `--theme` flag is simpler and more reliable |

---

## Architecture Patterns

### Recommended File Structure for Phase 3

```
shipcard/src/
├── cli/
│   ├── args.ts              - Add: --layout, --style, --theme, --hide, --hero-stat, --preview, -o/--output
│   └── commands/
│       └── card.ts          - Upgrade: call renderCard(), write file, print markdown snippet
├── card/
│   ├── index.ts             - Public API: renderCard(result, options) -> string
│   ├── renderer.ts          - SVG generation: dispatch to layout module
│   ├── xml.ts               - escapeXml() helper
│   ├── format.ts            - abbreviateNumber(), formatCost()
│   ├── git.ts               - findGitRoot() via spawnSync
│   ├── preview.ts           - openInBrowser() via spawn
│   ├── layouts/
│   │   ├── classic.ts       - Single-column layout (default)
│   │   ├── compact.ts       - Two-column grid layout
│   │   └── hero.ts          - Hero stat + details layout
│   └── themes/
│       ├── index.ts         - Theme registry: resolve(style, theme) -> ThemeColors
│       ├── github.ts        - Muted palette blending into GitHub READMEs
│       ├── branded.ts       - Accent colors with dev tool identity
│       └── minimal.ts       - Typographic, stripped-down aesthetic
```

### Pattern 1: Template Literal SVG Generation

**What:** Each layout module exports a function that takes `AnalyticsResult + CardOptions + ThemeColors` and returns an SVG string. No string builder, no DOM.

**When to use:** Always — this is the established approach for GitHub-compatible stat cards.

```typescript
// Source: Derived from github-readme-stats Card.js architecture (verified via GitHub source)
export function renderClassic(data: CardData, theme: ThemeColors): string {
  return `<svg
    xmlns="http://www.w3.org/2000/svg"
    width="495"
    height="195"
    viewBox="0 0 495 195"
    role="img"
    aria-labelledby="card-title"
  >
    <title id="card-title">ShipLog Stats</title>
    <style>
      text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif; }
      .label { font-size: 12px; }
      .value { font-size: 13px; font-weight: 600; }
    </style>
    <rect width="495" height="195" rx="4.5"
      fill="${escapeXml(theme.bg)}"
      stroke="${escapeXml(theme.border)}" />
    <g transform="translate(25, 35)">
      <text fill="${escapeXml(theme.title)}" font-size="18" font-weight="600">
        ${escapeXml(data.title)}
      </text>
    </g>
    <text x="248" y="188" text-anchor="middle" font-size="10"
      fill="${escapeXml(theme.footer)}" opacity="0.6">ShipLog</text>
  </svg>`;
}
```

### Pattern 2: XML Escape (Hand-Rolled — No Library)

**What:** Five character substitutions cover all injection vectors in SVG text content and attribute values.

**When to use:** On every user-controlled string before interpolation into the SVG template.

```typescript
// Source: XML spec section 2.4 — the 5 predefined entities
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")   // MUST be first — avoids double-encoding
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
```

**Critical order:** `&` replacement must come first. Replacing `<` before `&` would double-encode the result.

### Pattern 3: Git Root Detection (Injection-Safe)

**What:** Use `spawnSync` with args as an array — never shell-interpolate user input. Fall back to `process.cwd()` if not in a git repo.

```typescript
// Source: git documentation + Node.js child_process docs
import { spawnSync } from "node:child_process";

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
```

Note: args passed as array to `spawnSync` are never shell-expanded — no injection risk.

### Pattern 4: Cross-Platform Browser Open (Zero-Dep, Injection-Safe)

**What:** Platform dispatcher using `spawn` with args as an array.

```typescript
// Source: Derived from open npm package internals + Node.js child_process docs
import { spawn } from "node:child_process";

export function openInBrowser(filePath: string): void {
  const [cmd, shellNeeded] =
    process.platform === "darwin" ? (["open", false] as const)
    : process.platform === "win32" ? (["cmd", true] as const)
    : (["xdg-open", false] as const);

  // Windows: cmd /c start "" "path" — avoids `start` shell builtin issue
  const args = process.platform === "win32"
    ? ["/c", "start", "", filePath]
    : [filePath];

  spawn(cmd, args, {
    detached: true,
    stdio: "ignore",
    shell: shellNeeded,
  }).unref();
}
```

### Pattern 5: Number and Cost Formatting

```typescript
// Source: Standard readme-stats pattern
export function abbreviateNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// AnalyticsResult already formats cost as "~$X.XX" — pass through
export function formatCost(raw: string): string {
  return raw;
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
```

### Pattern 6: Dark/Light Theme Architecture

**What:** The `--theme` flag selects `dark` or `light`. The theme registry resolves `(style, theme)` to a `ThemeColors` object. There is no runtime auto-detection at generation time.

**Why not auto-detect:** `@media (prefers-color-scheme: dark)` inside SVG `<style>` blocks technically survives GitHub's camo proxy (the style tag is preserved), but it is evaluated by the viewer's browser at render time — which works in Chrome and Firefox but fails in Safari. github-readme-stats issue #79 documents that the team abandoned this approach and switched to explicit theme parameters. Phase 3 follows the same decision.

**Optional:** Include both `@media prefers-color-scheme` rules in the generated SVG so it adapts where supported. This is a "nice to have" on top of the explicit `--theme` selection.

### Pattern 7: ThemeColors Shape

```typescript
export interface ThemeColors {
  bg: string;       // Card background fill
  border: string;   // Card stroke
  title: string;    // Header text fill
  text: string;     // Label/body text fill
  value: string;    // Stat value fill
  icon: string;     // Icon path fill
  footer: string;   // "ShipLog" footer text fill
}

// Theme registry example entry
export const githubDark: ThemeColors = {
  bg: "#0d1117",
  border: "#30363d",
  title: "#e6edf3",
  text: "#8b949e",
  value: "#e6edf3",
  icon: "#58a6ff",
  footer: "#8b949e",
};
```

### Pattern 8: Inline SVG Icons

**What:** Simple `<path>` elements with `d` data embedded directly in the SVG — no external icon library. Icons are sized to 16x16 with `viewBox="0 0 24 24"` (heroicons/lucide standard).

GitHub's camo proxy preserves `path` elements (all production readme stats cards rely on them). The CARD-04 element list (`rect, text, g, svg, line`) is a minimum floor, not an exclusive ceiling.

**Source for icons:** Heroicons or Lucide icon sets — paths can be copied directly. No npm package needed; just the `d` attribute string.

### Anti-Patterns to Avoid

- **External font via `@import`:** `@import url(fonts.googleapis.com)` is blocked — camo proxy doesn't resolve external URLs from SVG context
- **`<image>` with external href:** External images are blocked by camo; use inline `path` icons instead
- **`<script>` tags:** Stripped by GitHub sanitizer — never include
- **`foreignObject` element:** Stripped by camo proxy — avoid entirely
- **SMIL animations (`<animate>`, `<animateTransform>`):** Chrome deprecated SMIL; use CSS `@keyframes` in `<style>` if animations are desired
- **Shell-interpolated file paths:** Always pass file paths as `spawn(cmd, [path])` array, never `exec(\`open ${path}\`)`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG DOM manipulation | Build a virtual SVG tree | Template literals | 5 SVG element types don't need a DOM abstraction |
| XML escape library | Custom parser | 5-line replace chain | XML has exactly 5 predefined entities |
| Cross-platform file opener | OS detection service | 10-line spawn dispatcher | Platform detection is one `process.platform` switch |

**Key insight:** The SVG spec's constraints (static, no scripting, limited elements) actually simplify the problem. Don't fight the constraints; build to them.

---

## Common Pitfalls

### Pitfall 1: `&` Escape Order in escapeXml

**What goes wrong:** Escaping `<` before `&` causes `&lt;` to become `&amp;lt;` in a second pass.
**Why it happens:** Naive implementation processes characters in wrong order.
**How to avoid:** Always replace `&` first in `escapeXml`.
**Warning signs:** Double-encoded entities visible in rendered SVG text (e.g., `&amp;lt;` shown literally).

### Pitfall 2: Dark Mode Auto-Detection Unreliable

**What goes wrong:** Developer embeds `@media (prefers-color-scheme: dark)` in SVG `<style>`, assumes it works everywhere. Fails in Safari for SVGs in `<img>` context.
**Why it happens:** SVGs as `<img>` are isolated from page CSS cascade; media query is evaluated at render/cache time by the browser rendering the SVG, not the page browser. Safari does not support `prefers-color-scheme` in SVG `<img>` context as of 2024.
**How to avoid:** Use explicit `--theme` flag. Default to `dark`. Document Safari limitation.
**Warning signs:** Safari users report inverted/wrong colors.

### Pitfall 3: External `<image>` References Fail on GitHub

**What goes wrong:** Using `<image href="https://...">` for icons or logos — blank/broken on GitHub README.
**Why it happens:** Camo proxy isolates SVG external requests.
**How to avoid:** Inline all visual content as SVG `path`/`rect`/`circle` elements.
**Warning signs:** Empty icon slots in rendered card.

### Pitfall 4: Font Metrics Mismatch

**What goes wrong:** Text overflows calculated bounds or line-wraps unexpectedly.
**Why it happens:** SVG text is absolutely positioned; font metrics vary by rendering agent. No automatic reflow.
**How to avoid:** Use `'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif` font stack. Truncate project names and model strings. Design to fixed card width with tested string lengths.
**Warning signs:** Text clips the card border or overlaps other elements.

### Pitfall 5: New CLI Flags Not Registered in args.ts

**What goes wrong:** `--layout`, `--style`, `--theme`, `--hide`, `--hero-stat`, `--preview`, `-o` flags silently ignored — never appear in parsed `values` because `parseArgs` only returns what's registered in `options`.
**Why it happens:** `args.ts` uses `strict: false` so unknown flags don't throw, they just disappear.
**How to avoid:** Add every new flag to the `options` map in `parseCliArgs()` before using it in `card.ts`.
**Warning signs:** `--layout compact` has no visible effect.

### Pitfall 6: Output Path When Not in a Git Repo

**What goes wrong:** `git rev-parse --show-toplevel` exits non-zero when cwd is not inside a git repo. `spawnSync` returns non-zero `status` — not an exception, but the output is empty.
**Why it happens:** `spawnSync` doesn't throw on non-zero exit by default (unlike `execSync`).
**How to avoid:** Check `result.status === 0` before using `result.stdout`. Fall back to `process.cwd()`.
**Warning signs:** File written to unexpected location or missing.

### Pitfall 7: SVG Width Too Narrow for Content

**What goes wrong:** Stat values or project names overflow the card boundary.
**Why it happens:** SVG text doesn't reflow — everything is at absolute coordinates.
**How to avoid:** Truncate strings before interpolation. Use `abbreviateNumber()` for counts. Fix card width to 495px (github-readme-stats standard) and design all layouts to that width.

---

## Code Examples

### SVG Root Structure (GitHub-Compatible)

```xml
<!-- Source: github-readme-stats Card.js — verified production pattern -->
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="495"
  height="195"
  viewBox="0 0 495 195"
  role="img"
  aria-labelledby="card-title"
>
  <title id="card-title">ShipLog Stats</title>
  <style>
    text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif; }
    .label { font-size: 12px; }
    .value { font-size: 13px; font-weight: 600; }
  </style>
  <rect x="0.5" y="0.5" width="494" height="194" rx="4.5"
    fill="#0d1117" stroke="#30363d" />
  <!-- content groups -->
  <text x="248" y="188" text-anchor="middle" font-size="10"
    fill="#8b949e" opacity="0.6">ShipLog</text>
</svg>
```

### Stat Row Pattern

```xml
<!-- Fixed-height row with icon, label, value -->
<g transform="translate(0, 45)">
  <!-- inline icon (16x16, heroicons path) -->
  <svg x="0" y="-13" width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="..." stroke="#58a6ff" stroke-width="2" stroke-linecap="round"/>
  </svg>
  <text x="25" y="0" fill="#8b949e" font-size="13">Sessions</text>
  <text x="230" y="0" fill="#e6edf3" font-size="13" font-weight="600"
    text-anchor="end">42</text>
</g>
```

### Markdown Snippet Output

```typescript
// Source: Phase 3 decision — alt text encodes generation date
const isoDate = new Date().toISOString().split("T")[0]; // "2026-03-25"
const mdPath = flags.output ?? "./shiplog-card.svg";
const markdownSnippet = `![ShipLog-${isoDate}](${mdPath})`;
process.stdout.write(`Updated ${outputPath}\n\nEmbed in your README:\n\n${markdownSnippet}\n`);
```

### File Write

```typescript
// Source: Node.js fs/promises docs
import { writeFile } from "node:fs/promises";

const outputPath = flags.output ?? join(findGitRoot(), "shiplog-card.svg");
await writeFile(outputPath, svgString, { encoding: "utf-8" });
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@media prefers-color-scheme` auto-detect in SVG | Explicit `--theme` flag | 2020 (github-readme-stats issue #79) | Reliable cross-browser; Safari limitation makes auto-detect unacceptable |
| `<image>` for icons | Inline `<path>` data | ~2014 camo proxy adoption | External images blocked in SVG context on GitHub |
| `@font-face` / external fonts | System font fallback stack | ~2014 | External requests blocked from SVG by camo |
| SMIL animations | CSS `@keyframes` in `<style>` | 2018 Chrome SMIL deprecation | SMIL unreliable; CSS animations preserved in SVG style tag |
| `exec()` with shell string | `spawn(cmd, [args])` array form | Best practice (ongoing) | Eliminates command injection; no shell expansion |

**Deprecated/outdated:**
- SMIL (`<animate>`, `<animateTransform>`): Use CSS animations
- `foreignObject`: Stripped by camo — completely avoid
- `exec()` with user-controlled strings: Use `spawnSync`/`spawn` with array args

---

## Open Questions

1. **`path` element in CARD-04 constraint**
   - What we know: CARD-04 says "rect, text, g, svg, line" — `path` is not listed. GitHub camo preserves `path` (all production readme cards use it).
   - What's unclear: Was `path` intentionally omitted from the requirement, or was it an oversight?
   - Recommendation: Treat the list as a minimum floor. Use `path`, `defs`, `title`, `desc`, `style` freely — they are safe. Planner should note this explicitly.

2. **Default `--theme` when no flag given**
   - What we know: CONTEXT.md says "auto-detects system preference, overridable with `--theme`." But auto-detection at generation time is meaningless — the SVG is static, the viewer's browser determines rendering.
   - What's unclear: Should the default be `dark`, `light`, or include both `@media` variants?
   - Recommendation: Default to generating a `dark` variant (most developer READMEs are dark-mode). Optionally embed both `@media prefers-color-scheme` rule sets so Chrome/Firefox users get adaptive behavior. Planner should decide.

3. **Layout dimensions for compact and hero**
   - What we know: Classic = 495×195 (github-readme-stats standard). Compact = two-column. Hero = one big stat + details.
   - What's unclear: Exact height for compact (more stats, shorter rows?) and hero (taller for the hero stat display?).
   - Recommendation: Claude's discretion at render time. Design to 495px wide, vary height by layout (195 classic, 150 compact, 220 hero — approximate).

---

## Sources

### Primary (HIGH confidence)
- github-readme-stats `src/common/Card.js` (fetched via GitHub) — SVG structure, font stack, theming approach
- github-readme-stats issue #79 (fetched via GitHub) — confirmed `@media prefers-color-scheme` abandoned, URL-param/flag approach adopted
- Node.js v22 docs — `child_process.spawnSync`, `fs/promises.writeFile`, `util.parseArgs`
- XML spec §2.4 — predefined entities, escape order

### Secondary (MEDIUM confidence)
- driesvints.com dark mode SVG investigation — confirmed Safari limitation and camo proxy caching issue
- paul.af GitHub README dark mode — `@media` works in Chrome/Firefox for SVG in `<img>`; `foreignObject` workaround (now deprecated)
- getpublii.com SVG light/dark docs — CSS `@media` in `<defs>` pattern
- alexwlchan.net SVG on GitHub notes — `<img>` tag required; inline `<svg>` in markdown is stripped
- sindresorhus/open v11 README — ESM-only, uses spawn internally, cross-platform file/URL opening

### Tertiary (LOW confidence)
- WebSearch results on GitHub camo SVG element allow-list — no official documentation found; community evidence confirms `script`, `foreignObject`, `animate` are stripped; `rect`, `text`, `g`, `path`, `style`, `defs` are preserved

---

## Metadata

**Confidence breakdown:**
- Standard stack (zero new deps): HIGH — all APIs are Node 22 built-ins or already in use
- SVG architecture: HIGH — directly modeled on github-readme-stats production code (fetched and verified)
- Dark/light theme limitation: HIGH — verified from github-readme-stats issue discussion
- XML escape correctness: HIGH — from XML spec
- GitHub camo exact element allow-list: LOW — no official documentation; community evidence only
- `open` package ESM compatibility: HIGH — fetched README confirms ESM-native, spawn-based

**Research date:** 2026-03-25
**Valid until:** 2026-06-25 (stable domain; GitHub camo behavior changes infrequently)
