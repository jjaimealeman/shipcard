# Phase 8: Landing Page - Research

**Researched:** 2026-03-26
**Domain:** Vanilla HTML/CSS/JS landing page served by Cloudflare Worker (Hono), inline SVG injection, self-hosted fonts
**Confidence:** HIGH

---

## Summary

Phase 8 replaces the root JSON health check on shipcard.dev with a polished landing page. The decisions are well-locked: vanilla HTML/CSS/JS, no framework, no build step, inline SVG injection for the live card demo, Anthropic brand palette, self-hosted Poppins + Lora fonts. This research focuses on the implementation mechanics — specifically how to serve the HTML page from the existing Hono Worker, how to bundle fonts without a build pipeline, how to structure the inline SVG fetch, and what patterns to reuse from the existing `/configure` route.

The standard approach is: replace the `GET /` health check in `index.ts` with a `c.html(LANDING_HTML)` response (same pattern used by `configureRoutes`), embed font CSS as base64 `@font-face` data URIs inside the style block, and use `fetch('/u/jjaimealeman?...')` plus container DOM injection for the live configurator. No new dependencies are needed.

**Primary recommendation:** Serve the landing page as an inline HTML string via `c.html()`, exactly like the existing `/configure` route does. No static assets directory, no build step, no new dependencies.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hono | ^4.0.0 | HTTP routing + `c.html()` response helper | Already in use; `c.html()` sets correct Content-Type automatically |
| Cloudflare Workers | compat 2026-03-25 | Runtime | Already deployed; landing page is just a new route handler |

### Supporting (no new installs)
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| navigator.clipboard API | Browser native | Copy-to-clipboard for code blocks | Primary method; fallback to `execCommand('copy')` for older browsers |
| fetch() | Browser native | Fetch SVG from `/u/:username` endpoint | Same-origin fetch — no CORS config needed |
| google-webfonts-helper | Web tool | Download self-hostable woff2 files for Poppins/Lora | One-time download, output embedded as base64 |

### No New Installs Needed
The existing Worker has everything required. The landing page is a self-contained HTML string added to a new route handler.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline HTML string | Static assets dir with `"assets": { "directory": "./public/" }` | Static assets adds a public/ folder, changes deployment process, requires wrangler config change — overkill for a single page |
| Base64 font data URIs | Google Fonts CDN link | Context decision: self-hosted. Base64 avoids extra HTTP requests entirely |
| fetch() + DOM injection | img src swap | Decision locked: inline SVG injection for DOM access |

---

## Architecture Patterns

### Recommended Project Structure

No new files beyond one route file:

```
shipcard-worker/src/
├── routes/
│   ├── card.ts           # /u/:username — unchanged
│   ├── auth.ts           # /auth — unchanged
│   ├── configure.ts      # /configure — unchanged
│   ├── sync.ts           # /sync — unchanged
│   └── landing.ts        # NEW — GET / landing page (replaces health check)
├── index.ts              # Replace GET "/" health check with landingRoutes
```

### Pattern 1: Hono `c.html()` for inline HTML pages

The existing configure.ts uses exactly this pattern. The route handler returns the entire HTML string via `c.html()`:

```typescript
// Source: configure.ts pattern (shipcard-worker/src/routes/configure.ts line 519)
import { Hono } from "hono";
import type { AppType } from "../types.js";

export const landingRoutes = new Hono<AppType>();

const LANDING_HTML = `<!DOCTYPE html>...`;

landingRoutes.get("/", (c) => c.html(LANDING_HTML));
```

In `index.ts`, replace:
```typescript
// Remove the health check:
// app.get("/", (c) => c.json({ name: "shipcard", status: "ok", version: "0.1.0" }));

// Add:
import { landingRoutes } from "./routes/landing.js";
app.route("/", landingRoutes);
```

### Pattern 2: Self-hosted fonts as base64 data URIs

Download woff2 files for Poppins (600, 700) and Lora (400) from google-webfonts-helper, convert to base64, embed in the style block as `@font-face` data URIs.

**Why:** No external HTTP requests at render time, zero FOUT, fully self-contained HTML string — consistent with the Worker's zero-external-deps philosophy.

**How (one-time setup):**
```bash
# Download from https://gwfh.mranftl.com/fonts/poppins?subsets=latin
# and https://gwfh.mranftl.com/fonts/lora?subsets=latin
# Then base64 encode each woff2:
base64 -w 0 poppins-v21-latin-600.woff2 > poppins-600.b64
base64 -w 0 lora-v35-latin-regular.woff2 > lora-400.b64
```

```css
/* In the HTML style block */
@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 600;
  src: url('data:font/woff2;base64,AABB...') format('woff2');
}
@font-face {
  font-family: 'Lora';
  font-style: normal;
  font-weight: 400;
  src: url('data:font/woff2;base64,CCDD...') format('woff2');
}
```

**Size estimate:** A single woff2 Latin subset is typically 15-25 KB. Three weights total (Poppins 600, Poppins 700, Lora 400) = roughly 45-75 KB base64 uncompressed. Cloudflare Workers compress scripts at deploy time — actual compressed size will be much smaller. Well under the 1 MB Worker script limit.

**Weights to include (minimum):**
- Poppins 600 (nav, labels)
- Poppins 700 (hero headline, section titles)
- Lora 400 (body text)

### Pattern 3: Live SVG configurator — fetch and DOM injection

The landing page fetches the actual rendered SVG from `/u/jjaimealeman?theme=...&layout=...&style=...&hide=...` and injects it into a DOM container.

**Critical detail — same-origin fetch:** The landing page is served from `shipcard.dev/` and fetches `/u/jjaimealeman`. This is same-origin. No CORS headers are needed on the card endpoint. The existing card route serves `image/svg+xml` without CORS headers, and that is correct for same-origin fetch.

**Security note:** The SVG being injected is generated server-side by the Worker's own renderer from controlled inputs — it is trusted content, not user-supplied HTML. This is the same approach used in configure.ts where `document.getElementById('svg-container').innerHTML = renderSvg(stats)` injects Worker-generated SVG.

```javascript
var DEFAULT_USERNAME = 'jjaimealeman';
var debounceTimer = null;

function refreshCard() {
  var username = (document.getElementById('username-input').value.trim()) || DEFAULT_USERNAME;
  var qs = buildQs(getState());
  var url = '/u/' + encodeURIComponent(username) + qs;
  fetch(url)
    .then(function(r) { return r.text(); })
    .then(function(svg) {
      // Safe: svg comes from our own Worker renderer, not user input
      document.getElementById('card-preview').innerHTML = svg;
      updateSnippets(username, qs);
    })
    .catch(function() {
      document.getElementById('card-preview').textContent = 'Could not load card';
    });
}

// Debounce username input to avoid hammering the card endpoint
document.getElementById('username-input').addEventListener('input', function() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(refreshCard, 400);
});
```

**Empty state:** When `/u/:username` returns a placeholder SVG (user not found), the existing placeholder card renderer already returns a valid SVG saying "username hasn't set up ShipCard yet". The landing page injects whatever SVG is returned — the placeholder IS the empty state.

### Pattern 4: Tabbed code snippet block

Two tabs (Markdown | HTML) showing the embed snippet updated live based on configurator state. Tab switching is a CSS class toggle:

```javascript
function buildSnippets(username, qs) {
  var cardUrl = 'https://shipcard.dev/u/' + encodeURIComponent(username) + qs;
  return {
    markdown: '[![ShipCard](' + cardUrl + ')](https://shipcard.dev)',
    html: '<a href="https://shipcard.dev"><img src="' + cardUrl + '" alt="ShipCard" /></a>'
  };
}
```

### Pattern 5: Copy-to-clipboard for terminal code blocks

Same pattern already used in configure.ts (lines 482-495):

```javascript
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(function() {
    btn.textContent = 'Copied!';
    setTimeout(function() { btn.textContent = 'Copy'; }, 1500);
  }).catch(function() {
    // Legacy fallback (Safari, older browsers)
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}
```

### Pattern 6: Anthropic palette as CSS custom properties

```css
:root {
  --bg:    #141413;
  --fg:    #faf9f5;
  --mid:   #b0aea5;
  --light: #e8e6dc;
  --orange:#d97757;
  --blue:  #6a9bcc;
  --green: #788c5d;
}
```

### Anti-Patterns to Avoid

- **Using static assets directory:** Don't add `"assets": { "directory": "..." }` to `wrangler.jsonc`. The inline HTML string approach (already proven with `/configure`) is correct here.
- **External font CDN:** Don't use a Google Fonts link. Privacy concern and external dependency.
- **Using img src for the configurator preview:** Won't support live config updates without page reload.
- **Debouncing username input with too short a delay:** Use >=400ms to avoid hammering the card endpoint.
- **Storing font base64 as JS string variables:** Embed directly in the CSS style block inside the HTML string constant.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG injection | Custom SVG parser | Direct DOM injection of Worker-generated SVG | SVG from our own Worker is trusted content |
| Font loading | Custom font loader | @font-face with base64 URI | Browser handles natively; no JS needed |
| Copy to clipboard | Custom clipboard lib | navigator.clipboard.writeText() | Native browser API; already used in configure.ts |
| Tab switching | Framework component | CSS class toggle | Vanilla JS is sufficient for two-tab state |

**Key insight:** configure.ts has already solved most of the hard problems (SVG injection, copy button, code snippet generation). The landing page reuses these patterns with a different visual design and simpler state (no localStorage, no hash-fragment stats).

---

## Common Pitfalls

### Pitfall 1: Template literal escaping in the HTML string constant

**What goes wrong:** `LANDING_HTML` is a JS template literal. Any backtick in the HTML or client-side JS must be escaped. Any `${` in the embedded JS must be escaped as `\${`.
**Why it happens:** The existing configure.ts avoids template literals inside the embedded JS entirely — it uses regular string concatenation (`'` + `'` style). Follow the same convention.
**How to avoid:** Write all client-side JS inside the HTML string using `var`/`function` declarations with single-quoted strings. No template literals inside the embedded script.

### Pitfall 2: `hide` query param duplication

**What goes wrong:** The card URL query string for hidden stats uses multiple params: `?hide=sessions&hide=cost`. `URLSearchParams.toString()` will not duplicate keys correctly.
**How to avoid:** Build the query string manually, same as configure.ts `buildQs()` function (lines 430-441).

### Pitfall 3: Forgetting to encode the username in the fetch URL

**What goes wrong:** GitHub usernames are alphanumeric + hyphens, but defensive coding prevents breakage from unexpected input.
**How to avoid:** Always `encodeURIComponent(username)` in the fetch URL.

### Pitfall 4: Worker script size with base64 fonts

**What goes wrong:** Adding base64 font data can approach Cloudflare's Worker size limits in extreme cases.
**How to avoid:** Include only Latin subset, minimum weights. Check `wrangler deploy` output for size warnings. Cloudflare limit is 1 MB compressed — base64 fonts compress very well.
**Warning signs:** Wrangler deploy error about script size.

### Pitfall 5: Placeholder cards are valid SVGs, not errors

**What goes wrong:** Developer treats a placeholder card response as an error and shows a broken state.
**Why it happens:** The `/u/:username` endpoint returns HTTP 200 with a placeholder SVG for unknown users, not a 404.
**How to avoid:** Always inject the SVG regardless. The placeholder IS the empty state per the CONTEXT.md decision.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Google Fonts CDN link | Self-hosted base64 woff2 | No external requests, no FOUT |
| Static asset files | Inline HTML string in Worker | No build step, no public/ directory |
| img src for SVG preview | fetch() + DOM injection | Full DOM access, real-time updates |

---

## Open Questions

1. **Font file sizes — verify within Worker limits**
   - What we know: Cloudflare's 1 MB compressed Worker limit. Three woff2 Latin subsets estimated at 45-75 KB uncompressed base64.
   - What's unclear: Exact sizes until downloaded and measured.
   - Recommendation: Download fonts as the first task in the plan, measure with `wc -c`, then proceed.

2. **Individual stat toggles vs single "hide all" toggle**
   - What we know: CONTEXT.md says "hide stats" is one of the four params. configure.ts exposes individual toggles per stat key.
   - Recommendation: Follow configure.ts — individual toggles per stat (sessions, toolCalls, models, projects, cost). This gives visitors the full customization experience.

3. **Reset button — localStorage or constants only**
   - What we know: CONTEXT.md says "Reset button to snap back to default settings."
   - Recommendation: Reset resets in-memory state to coded defaults and re-renders. No localStorage on the landing page (unlike /configure which saves per-user preferences).

---

## Sources

### Primary (HIGH confidence)
- `shipcard-worker/src/routes/configure.ts` — direct implementation template; complete pattern reference
- `shipcard-worker/src/routes/card.ts` — card endpoint; confirmed same-origin, no CORS needed
- `shipcard-worker/src/index.ts` — confirmed health check route location to replace
- Cloudflare Workers return-html example: https://developers.cloudflare.com/workers/examples/return-html/
- Cloudflare Workers static assets docs: https://developers.cloudflare.com/workers/static-assets/
- Cloudflare Workers static assets binding: https://developers.cloudflare.com/workers/static-assets/binding/

### Secondary (MEDIUM confidence)
- google-webfonts-helper (gwfh.mranftl.com) — Poppins/Lora self-host download tool; confirmed to provide woff2 + CSS snippets
- Fontsource (fontsource.org) — alternative font source

### Tertiary (LOW confidence)
- Font size estimates (45-75 KB) — derived from typical Google Fonts Latin subset sizes; verify by downloading actual files

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing Worker already uses Hono c.html(), confirmed by codebase
- Architecture: HIGH — configure.ts is a direct template for the landing page approach
- Font bundling: MEDIUM — pattern confirmed (base64 @font-face), exact sizes need download verification
- Pitfalls: HIGH — derived from existing codebase patterns and known Worker constraints

**Research date:** 2026-03-26
**Valid until:** 2026-04-26
