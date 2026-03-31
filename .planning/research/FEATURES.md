# Feature Landscape

**Domain:** Developer analytics / stats card tool (local-first, agentic dev focus)
**Researched:** 2026-03-28
**Project:** ShipCard v2.0 — Themes, Monetization, BYOT, Custom Slugs, AI Insights, PRO Badge
**Scope:** This file covers NEW features being added in v2.0. For v1.0 baseline features (JSONL parsing, CLI, MCP, card layouts), see the original FEATURES.md snapshot at the bottom of this file.

---

## Area 1: Card Theme Ecosystem

### What the ecosystem does

github-readme-stats (67K stars) is the reference implementation. Its theme system works via URL parameter: `?theme=tokyonight`. The theme is a named object with 5 color slots: `titleColor`, `textColor`, `iconColor`, `bgColor`, `borderColor`. New themes are **frozen** (no longer accepted as PRs) because the list grew to 60+. The critical insight: **the theme is just a named preset of 5 hex values, nothing more.**

Official URL params for color overrides (without `#`):
- `title_color` — card title
- `text_color` — body text
- `icon_color` — decorative icons
- `bg_color` — background (supports gradient syntax: `angle,start,end`)
- `border_color` — border stroke

Individual URL params override the selected theme, allowing BYOT without a full theme definition.

### Top 10 developer themes with authoritative hex values

All values verified against official repositories (HIGH confidence).

#### 1. Catppuccin Mocha
The dominant "soft dark" aesthetic in 2024-2026. Four variants (Latte, Frappe, Macchiato, Mocha). Mocha is most popular.
- Background (`base`): `#1e1e2e`
- Surface: `#313244`
- Text: `#cdd6f4`
- Primary accent (`mauve`): `#cba6f7`
- Secondary accent (`blue`): `#89b4fa`
- Green: `#a6e3a1`, Red: `#f38ba8`, Yellow: `#f9e2af`
- Border (`surface1`): `#45475a`

Source: [catppuccin/palette JSON](https://github.com/catppuccin/palette/blob/main/palette.json) — HIGH confidence

#### 2. Dracula
The canonical purple dark theme. Wide adoption 2015-present. Cultural default for "hacker aesthetic."
- Background: `#282A36`
- Text (`foreground`): `#F8F8F2`
- Primary accent (`purple`): `#BD93F9`
- Pink: `#FF79C6`
- Green: `#50FA7B`
- Cyan: `#8BE9FD`
- Red: `#FF5555`
- Orange: `#FFB86C`
- Selection: `#44475A`
- Comment: `#6272A4`

Source: [draculatheme.com/contribute](https://draculatheme.com/contribute) — HIGH confidence

#### 3. Tokyo Night (Night variant)
Neovim-popularized deep navy with purple/blue accents. Strong community following.
- Background: `#1a1b26`
- Text: `#c0caf5`
- Primary accent (`blue`): `#7aa2f7`
- Magenta: `#bb9af7`
- Cyan: `#7dcfff`
- Green: `#9ece6a`
- Yellow: `#e0af68`
- Red: `#f7768e`
- Orange: `#ff9e64`
- Comment: `#565f89`
- Border: `#15161e`

Source: [folke/tokyonight.nvim](https://github.com/folke/tokyonight.nvim/blob/main/extras/lua/tokyonight_night.lua) — HIGH confidence

#### 4. Nord
Arctic blue-grey palette. Two-tone approach (4 dark + 4 light neutrals + 8 accent).
- Background (`Nord0`): `#2e3440`
- Surface1 (`Nord1`): `#3b4252`
- Surface2 (`Nord2`): `#434c5e`
- Surface3 (`Nord3`): `#4c566a`
- Text (`Nord6`): `#eceff4`
- Dim text (`Nord4`): `#d8dee9`
- Teal (`Nord7`): `#8fbcbb`
- Accent blue (`Nord8`): `#88c0d0`
- Blue2 (`Nord9`): `#81a1c1`
- Indigo (`Nord10`): `#5e81ac`
- Red (`Nord11`): `#bf616a`
- Orange (`Nord12`): `#d08770`
- Yellow (`Nord13`): `#ebcb8b`
- Green (`Nord14`): `#a3be8c`
- Purple (`Nord15`): `#b48ead`

Source: [nordtheme.com/docs/colors-and-palettes](https://www.nordtheme.com/docs/colors-and-palettes) — HIGH confidence

#### 5. Gruvbox Dark
Retro warm-toned dark theme. Brown/orange palette with muted accents.
- Background (`dark0`): `#282828`
- Text (`light1`): `#ebdbb2`
- Bright red: `#fb4934` / neutral red: `#cc241d`
- Bright green: `#b8bb26` / neutral green: `#98971a`
- Bright yellow: `#fabd2f` / neutral yellow: `#d79921`
- Bright blue: `#83a598` / neutral blue: `#458588`
- Bright purple: `#d3869b` / neutral purple: `#b16286`
- Bright aqua: `#8ec07c` / neutral aqua: `#689d6a`
- Bright orange: `#fe8019` / neutral orange: `#d65d0e`

Source: [morhetz/gruvbox-contrib color.table](https://github.com/morhetz/gruvbox-contrib/blob/master/color.table) — HIGH confidence

#### 6. Solarized Dark
Precision-designed 16-color palette. Both dark and light modes share the same 8 accent colors.
- Background (`base03`): `#002b36`
- Background2 (`base02`): `#073642`
- Text (`base0`): `#839496`
- Bright text (`base1`): `#93a1a1`
- Yellow: `#b58900`
- Orange: `#cb4b16`
- Red: `#dc322f`
- Magenta: `#d33682`
- Violet: `#6c71c4`
- Blue: `#268bd2`
- Cyan: `#2aa198`
- Green: `#859900`

Source: [ethanschoonover.com/solarized](https://ethanschoonover.com/solarized/) — HIGH confidence

#### 7. One Dark (Atom / VS Code)
The VSCode default dark theme flavor. Neutral grey background with blue accent.
- Background: `#282c34`
- Text: `#abb2bf`
- Accent blue: `#528bff`
- Surface/selection: `#3e4451`

Source: [joshdick/onedark.vim](https://github.com/joshdick/onedark.vim), color-hex.com — MEDIUM confidence (aggregate)

#### 8. Monokai (Sublime Text canonical)
The original Sublime Text palette. High saturation accents on near-black background.
- Background: `#272822`
- Text: `#F8F8F2`
- Yellow: `#E6DB74`
- Green: `#A6E22E`
- Orange: `#FD971F`
- Purple: `#AE81FF`
- Pink (`red`): `#F92672`
- Blue (`cyan`): `#66D9EF`

Source: [gist r-malon (corrected by Waqar144)](https://gist.github.com/r-malon/8fc669332215c8028697a0bbfbfbb32a) — MEDIUM confidence (multiple gist sources agree on corrected values)

#### 9. Rose Pine
Newer entry (2021-present), gaining fast adoption in Neovim community. Soft lavender-on-dark.
- Background: `#191724`
- Surface: `#1f1d2e`
- Text: `#e0def4`
- Love (red): `#eb6f92`
- Gold (yellow): `#f6c177`
- Rose (pink): `#ebbcba`
- Pine (green): `#31748f`
- Foam (cyan): `#9ccfd8`
- Iris (purple): `#c4a7e7`

Source: github-readme-stats theme list (catppuccin_mocha, rose_pine are both listed as built-in themes) — MEDIUM confidence

#### 10. GitHub Dark (GitHub native)
The actual GitHub dark mode palette. High familiarity for README embed context.
- Background: `#0d1117`
- Canvas default: `#161b22`
- Border: `#30363d`
- Text primary: `#e6edf3`
- Accent blue: `#58a6ff`
- Success green: `#3fb950`
- Warning yellow: `#d29922`
- Danger red: `#f85149`

Source: github-readme-stats has `github_dark` and `github_dark_dimmed` as built-in themes — HIGH confidence that these values are correct GitHub palette

### Mapping to ShipCard's 5-slot theme model

ShipCard needs a consistent schema. The minimal 5-slot model (matching github-readme-stats) maps cleanly:

| Slot | ShipCard Key | Description |
|------|-------------|-------------|
| Background | `bg` | Card background |
| Text | `text` | Stats values, labels |
| Accent | `accent` | Highlights, icons, chart bars |
| Border | `border` | Card stroke |
| Title | `title` | Card heading text |

An extended 7-slot model adds `subtext` (dim labels) and `surface` (inner panels) for richer cards.

---

## Area 2: BYOT (Bring Your Own Theme)

### How the reference implementation works (github-readme-stats)

URL parameter approach — no registration, no config file, immediate:

```
?bg_color=1e1e2e&title_color=cba6f7&text_color=cdd6f4&icon_color=89b4fa&border_color=45475a
```

Rules:
- 3 or 6 hex characters, no `#` prefix
- Unspecified params inherit from the selected `?theme=X`
- `bg_color` supports gradient syntax: `deg,color1,color2,...`

This is the de facto standard. Users copy-paste from theme docs and build their own.

### What fields users want to customize

Based on community requests in github-readme-stats issues (Issue #744 has 500+ reactions):

| Field | Priority | Notes |
|-------|----------|-------|
| Background (`bg`) | Critical | Most requested |
| Accent/icon color | Critical | Brand color expression |
| Text | High | Readability tuning |
| Title | High | Often different from body text |
| Border | Medium | Often matches bg for borderless look |
| Chart bar color | Medium | ShipCard-specific — timeline bars |
| Gradient background | Low | Decorative, nice to have |

### Implementation options

**Option A: URL params only (simplest)**
- `?bg=1e1e2e&text=cdd6f4&accent=cba6f7&border=45475a&title=cba6f7`
- ShipCard can define shorter param names than github-readme-stats
- No server storage needed — params are the theme definition
- Shareable by design: copy URL = share theme

**Option B: Named theme + override params**
- `?theme=catppuccin&accent=ff0000` (override just the accent)
- Most flexible for power users
- Already how github-readme-stats works

**Option C: Dashboard builder + saved presets (PRO)**
- Color picker in dashboard, save as named custom theme
- Requires KV storage per user
- PRO feature gate candidate

Recommendation: Ship Option B at launch (named theme + URL override). Add Option C dashboard builder as PRO.

---

## Area 3: Stripe SaaS Patterns for $1/mo Developer Tools

### Standard free vs paid split for developer analytics tools

Based on research across Railway, Render, WakaTime, github-readme-stats, and general SaaS patterns:

**What stays FREE (must stay free):**
- Core functionality — if the free tier doesn't work, no one converts
- The feature that drives the JSONL adoption moment (card generation, dashboard)
- Community leaderboard visibility
- CLI / local tool (always free — it's the top-of-funnel)
- Standard card layouts and 5-10 built-in themes
- Public card URL at default slug

**What gets GATED (typical PRO features for dev tools):**
- Visual customization (extra themes, BYOT saved presets, dashboard builder)
- Vanity/custom slugs (e.g. `shipcard.dev/yourname` instead of `/u/abc123`)
- Data export (CSV, JSON download from dashboard)
- Priority CDN / faster cache refresh
- Profile badges / PRO indicator on card
- AI-generated insights / weekly digest email
- Longer data history or higher-resolution analytics
- Removal of "Powered by ShipCard" attribution

### What Railway/Render/Vercel actually gate

Railway: Free → $5 Hobby → $20 Pro. Free has sleeping containers and resource caps. Hobby unlocks "always-on." Pro adds team features, higher limits.

Vercel: Free → $20/user/month Pro. Free gates: team members >1, preview comments, analytics, password protection, custom domains beyond 1, bandwidth beyond 100GB.

WakaTime: Free → $9/mo Premium. Premium gates: goals tracking, private leaderboards, code review stats, longer history (1 year → unlimited), CSV export.

Pattern: **The free tier must be genuinely useful.** The PRO tier adds polish, history depth, and social features — not core functionality.

### Stripe implementation on Cloudflare Workers

Stripe has official native support for Cloudflare Workers (announced 2024, blog post exists). Key notes:
- Use `constructEventAsync` not `constructEvent` for webhook validation in Workers
- Official template: `stripe-samples/stripe-node-cloudflare-worker-template`
- KV stores subscription status by user ID for fast edge-side gating
- Webhook events: `customer.subscription.created`, `customer.subscription.deleted`, `invoice.payment_failed`

For $1/mo pricing: Stripe's minimum charge is $0.50, so $1/mo is achievable. Processing fee is ~$0.33 on $1 (33%), which is acceptable at this price point for volume plays.

### Upgrade flow UX patterns that convert

1. **In-context gate** — User tries to use PRO feature (BYOT color picker, custom slug), sees "PRO feature — upgrade for $1/mo" with one-click Stripe Checkout. No separate pricing page required.
2. **Trial the PRO experience** — Show PRO badge on card but greyed-out, with tooltip "Unlock with PRO"
3. **Feature preview** — Let user build a custom theme in the dashboard but blur/lock the save/apply until PRO
4. **Frictionless checkout** — Stripe Checkout handles PCI, no custom form needed; redirect back to dashboard after success
5. **Instant activation** — Webhook confirms payment → KV updated → next card render has PRO features. No waiting.

---

## Area 4: Custom URL Slugs

### How link shorteners and card services handle this

The pattern across Bitly, Rebrandly, dev.to, and similar services:

**Slug format constraints:**
- 3-30 characters
- Lowercase alphanumeric + hyphens only (no underscores in most impls)
- Cannot start/end with hyphen
- Case-insensitive (normalize to lowercase on write)

**Collision avoidance:**
- Check KV/D1 before accepting: `slug → user_id` lookup
- If slug exists: return 409 with "already taken" message
- No auto-suffix strategy (avoid `yourname-2` — confusing)
- First come, first served is the standard

**Reserved words (implement a blocklist):**
Categories to block:
- Route segments used by the app itself: `api`, `admin`, `dashboard`, `login`, `logout`, `settings`, `billing`, `card`, `u`, `user`, `profile`, `public`, `static`, `assets`, `health`, `status`
- Generic profanity: use `bad-words` npm package (maintained) or embed a compact list (~400 words covers 95% of cases)
- Brand terms: `shipcard`, `shiplog`, the project name variations

**Slug availability check UX:**
- Debounced real-time availability check while user types (500ms)
- Green checkmark / red X inline, not on submit
- This is the table stakes UX expectation (Bitly, Rebrandly both do this)

**Profanity filtering approach for slugs:**
The "Scunthorpe problem" (false positives) matters for slugs more than chat. A slug like `classicdev` would be falsely flagged by naive filters. Recommendation: maintain a short explicit blocklist (~50 truly unacceptable words) rather than a regex-based substring matcher. The `bad-words` npm package (last updated 2024) includes an allow-list override mechanism to handle false positives.

### Slug storage in Cloudflare KV

Two KV namespaces needed:
- `SLUGS` → `slug:yourname` = `user_id` (forward lookup for routing)
- `USERS` → `user:abc123:slug` = `yourname` (reverse lookup for profile)

KV is ideal here: slug routing is read-heavy, globally distributed, and slugs rarely change.

---

## Area 5: PRO Badges on Cards and Profiles

### How established platforms do it

**GitHub PRO**: A text-based `PRO` label badge displayed inline next to the username on the profile page. Simple pill/badge shape with the platform's brand color. Opt-out available in settings. Not present in SVG cards — profile-UI only.

**npm**: No paid tier badge (npm is free). Not applicable.

**dev.to**: No PRO badge displayed on posts or profiles in a visual SVG sense. PRO is primarily a billing relationship.

**Shields.io pattern**: Static SVG badges are flat rectangles with a label + value format (e.g., `[ PRO | ✓ ]`). Generated dynamically via URL, cacheable, embeddable anywhere.

### SVG badge patterns for embedding in stats cards

For ShipCard's context, the PRO badge appears **inside the SVG card** — not as a separate badge image.

Two approaches:

**Option A: Inline SVG element**
A small `<rect>` + `<text>` group overlaid on the card, typically top-right corner.
```xml
<g transform="translate(card_width - 50, 10)">
  <rect rx="4" width="40" height="16" fill="#f6c177" opacity="0.2"/>
  <text x="20" y="12" text-anchor="middle" fill="#f6c177" font-size="10">PRO</text>
</g>
```
This is the correct approach for SVG cards — renders correctly in GitHub READMEs, Markdown embeds, everywhere SVG renders.

**Option B: Crown/star icon**
A `<path>` drawing a small crown symbol. More visual than text. Requires baking in the path data or loading an icon font (avoid external font loading in SVGs for GitHub embed contexts).

Recommendation: Option A (text badge with accent color fill) is simpler, faster to implement, universally compatible. Add Option B as enhancement later.

### What "PRO badge on profile" means

Beyond the card SVG, a PRO badge also appears on:
- The public profile page (`/u/yourname`) — styled HTML badge
- The leaderboard entry — small indicator next to username

Both are HTML/CSS — straightforward styled `<span>` with a class.

---

## Area 6: AI Coding Insights

### What WakaTime and Copilot analytics actually show

**WakaTime's insight dimensions** (verified from API docs):
- Activity patterns: `weekday` (Mon-Sun distribution), `days` (calendar heatmap), `best_day` (peak day stats), `daily_average`
- Project breakdown: time by project + percentage
- Language breakdown: time by language
- Editor/tool: time by IDE/tool
- Categories: coding vs debugging vs building vs documentation
- Time ranges: last 7 days, 30 days, 6 months, year, all time

**GitHub Copilot metrics** (generally available Feb 2026):
- Lines of code suggested
- Lines of code accepted
- Acceptance rate (accepted/suggested)
- Completions used
- Chat interactions
- Model + language breakdown
- Trend over time (adoption curves)

**AI coding analytics patterns emerging in 2026:**
- "AI-authored code percentage" — what % of merged code came from AI
- Lines written manually vs AI-generated (WakaTime VS Code extension)
- Time-to-accept (how long before user accepts a suggestion)
- Agent session duration vs human coding session duration

### Pre-computed analytics patterns for weekly digests

WakaTime's weekly digest format (Readme README stats tool shows):
- Top language this week (with % of time)
- Total coding time
- Best day of the week (day name + hours)
- Daily average
- Project with most activity

For ShipCard context (Claude Code JSONL data), equivalent pre-computed insights:

| Insight | Derivation | Complexity |
|---------|-----------|-----------|
| Total spend this week | Sum `costUSD` for last 7 days | Low |
| Most expensive project | Group by project, sort desc | Low |
| Daily average spend | Total / active days | Low |
| Best day (most productive) | Day with highest session count OR highest token usage | Low |
| Streak (consecutive coding days) | Count days with any JSONL activity | Low |
| Peak hour (most active hour) | Extract hour from session timestamps | Medium |
| Spend vs prior week | Compare this week total to last week total | Low |
| Model mix | % of tokens per model (Opus/Sonnet/Haiku) | Low |
| Longest session | Max duration across all sessions | Low |
| AI efficiency score | Output tokens / input tokens ratio (higher = more efficient prompting) | Medium |

**Weekly digest email format** (standard pattern across WakaTime, GitHub wrapped):
```
Subject: Your ShipCard weekly wrap: $X spent, N sessions

Week of [DATE]

Highlights:
- Total spend: $X.XX
- Sessions: N
- Best day: Thursday ($X in N sessions)
- Top project: your-project-name

Compared to last week: +X% spend / -X% sessions

[View full dashboard] [button]
```

Sending platform: Resend or Cloudflare Email Workers. Both work from Cloudflare Workers. Resend has better developer experience (REST API, simple SDK).

---

## Table Stakes for v2.0

Features users expect once themes/monetization/insights are announced. Missing = incomplete release.

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| 10 built-in themes (free) | github-readme-stats set this expectation; developer tool without themes feels dated | Low | Theme schema must be defined |
| `?theme=X` URL param | Universal pattern — everyone who uses stats cards knows this | Low | Theme registry |
| PRO checkout via Stripe | Any monetization announcement needs working payment | Medium | Stripe SDK + webhook handler + KV status |
| PRO gating in Worker | Card/API must check PRO status and gate features | Low | KV subscription state |
| Custom slug (PRO) | Announced feature must work at launch | Medium | KV slug store + blocklist |
| Slug availability check | Real-time inline check is the standard UX (Bitly, Rebrandly) | Low | KV lookup + debounce |
| PRO badge on SVG card | Must appear on card if user is PRO — table stakes for $1 value prop | Low | SVG template addition |
| BYOT via URL params | github-readme-stats does this; users will try `?bg=1e1e2e` immediately | Low | URL param parser in Worker |

## Differentiators for v2.0

Features that make ShipCard the reference implementation in the Claude Code space.

| Feature | Value Proposition | Complexity | Dependencies |
|---------|-------------------|------------|--------------|
| Catppuccin Mocha as default/hero theme | Catppuccin is culturally dominant in 2025-2026 Neovim/terminal community; ship it first and well | Low | Theme palette from Area 1 |
| BYOT dashboard builder with color picker (PRO) | Better DX than URL params — visual, save as named preset | High | Dashboard UI + KV for saved themes |
| Weekly digest email (PRO) | WakaTime's most-loved feature; no Claude Code equivalent exists | Medium | Email provider (Resend), pre-computed stats query |
| AI efficiency score | Novel metric unique to Claude Code context — "output/input ratio as prompting skill measure" | Medium | Token data already in JSONL |
| Streak tracking | Universal motivational mechanic; Duolingo, GitHub contributions, WakaTime all use it | Low | Session date aggregation |
| "Coding wrapped" annual summary | WakaTime viral annual feature; first Claude-native version gets attention | High | All stats + good layout template |
| Custom slug with redirect | `/yourname` routing to full dashboard feels professional for social sharing | Medium | KV routing + Worker routing layer |
| Priority CDN (PRO) | Lower cache TTL (e.g. 60s vs 300s) means card refreshes faster after sync | Low | `cache-control` header + KV TTL parameter |

## Anti-Features for v2.0

Deliberate decisions about what not to build, with rationale.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Unlimited custom themes storage (free) | KV costs scale with entries; theme storage is cheap but sets precedent for unlimited free storage | Free: URL params BYOT (stateless). PRO: saved named custom themes (max 5) |
| Emoji or icon font in SVG cards | External font loading breaks in GitHub README embed context; emoji rendering is OS-dependent | Use plain Unicode text or bake SVG paths for icons |
| Email digest for free tier | Email sending has real cost ($0.001/email × volume); also reduces PRO value prop | Weekly digest is PRO-only; free tier gets dashboard only |
| Real-time card refresh (<10s TTL) | Cloudflare KV/CDN has costs; <10s TTL defeats edge caching entirely | Free: 300s TTL. PRO: 60s TTL ("priority CDN" is just a shorter TTL) |
| Social auth (GitHub OAuth) in v2.0 | Auth adds scope, liability, and complexity; the existing CLI token system works | Keep CLI token auth; add OAuth only if user research proves it blocks growth |
| Stripe monthly vs annual billing complexity | Annual billing adds proration, upgrade flows, refund logic; $1/mo is too cheap for annual to matter | Monthly only at $1/mo. Revisit annual at higher price points |
| Team/org billing | Wrong user for v2.0; adds multi-seat, admin roles, invoice management | Individual billing only; team is a separate product motion for v3+ |
| AI-generated code review feedback | Copilot/Claude territory — not a stats card feature; scope creep | Surface metrics only; let the user draw conclusions from data |
| Vanity metrics (random "you're in top X% of developers!") | Users see through hollow comparisons; damages trust | Show actual data, let users compare against their own history |

## Feature Dependencies

```
EXISTING (v1.0)
  └── JSONL Parser → Cost Calculator → Stats Data

v2.0 ADDITIONS

Theme System
  └── Theme Registry (10 presets with 5-slot color schema)
        ├── ?theme=X URL param (Worker)
        ├── ?bg=X&text=X BYOT URL params (Worker)
        └── [PRO] Saved custom themes → KV(user:themes) → Dashboard builder

Stripe Monetization
  ├── Stripe Checkout session → webhook → KV(user:pro_status)
  ├── PRO gate middleware in Worker (checks KV on every card render)
  └── PRO badge → SVG template addition

Custom Slugs [PRO]
  ├── Requires: Stripe PRO status
  ├── Slug input → availability check (KV lookup) → profanity check → save to KV(slug→user_id)
  └── Worker routing: /:slug → redirect or render card for user_id

AI Insights / Weekly Digest [PRO]
  ├── Requires: Stripe PRO status + email on file
  ├── Pre-computed analytics from synced stats in KV/D1
  └── Resend email worker (cron trigger or manual)

PRO Badge
  └── Requires: Stripe PRO status
        ├── SVG card template (inline badge element)
        └── HTML profile page (styled span)

Priority CDN [PRO]
  └── Requires: Stripe PRO status
        └── cache-control TTL logic in Worker (60s vs 300s)
```

## MVP for v2.0

What must ship to call v2.0 "complete":

1. Theme system (10 presets + URL params) — free
2. BYOT via URL params — free
3. Stripe PRO checkout + webhook + KV status — infrastructure
4. PRO badge on card — first visible PRO value
5. Custom slug (PRO) — high-perceived-value PRO feature
6. Priority CDN via shorter TTL (PRO) — low-effort PRO win

Defer to v2.1:
- BYOT dashboard builder with color picker (high complexity)
- Weekly digest email (email infra setup + template complexity)
- AI efficiency score (needs UX design to explain well)
- Annual wrapped (high effort, seasonal)

---

## Sources

| Source | Confidence | Used For |
|--------|-----------|---------|
| [catppuccin/palette JSON](https://github.com/catppuccin/palette/blob/main/palette.json) | HIGH | Catppuccin Mocha hex values |
| [draculatheme.com/contribute](https://draculatheme.com/contribute) | HIGH | Dracula hex values |
| [folke/tokyonight.nvim Lua](https://github.com/folke/tokyonight.nvim/blob/main/extras/lua/tokyonight_night.lua) | HIGH | Tokyo Night hex values |
| [nordtheme.com/docs/colors-and-palettes](https://www.nordtheme.com/docs/colors-and-palettes) | HIGH | Nord hex values |
| [morhetz/gruvbox-contrib color.table](https://github.com/morhetz/gruvbox-contrib/blob/master/color.table) | HIGH | Gruvbox hex values |
| [ethanschoonover.com/solarized](https://ethanschoonover.com/solarized/) | HIGH | Solarized hex values |
| [github-readme-stats themes/README.md](https://github.com/anuraghazra/github-readme-stats/blob/master/themes/README.md) | HIGH | Theme system implementation pattern, URL params |
| [github-readme-stats Issue #744](https://github.com/anuraghazra/github-readme-stats/issues/744) | HIGH | BYOT URL params spec (community demand) |
| [WakaTime API Docs](https://wakatime.com/developers) | HIGH | Insight categories, analytics dimensions |
| [Cloudflare Stripe announcement](https://blog.cloudflare.com/announcing-stripe-support-in-workers/) | HIGH | Stripe + Workers integration |
| [stripe-samples/stripe-node-cloudflare-worker-template](https://github.com/stripe-samples/stripe-node-cloudflare-worker-template) | HIGH | Stripe webhook pattern for Workers |
| [GitHub Copilot metrics GA](https://github.blog/changelog/2026-02-27-copilot-metrics-is-now-generally-available/) | HIGH | AI coding insight dimensions |
| [athul/waka-readme](https://github.com/athul/waka-readme) | MEDIUM | Weekly digest format patterns |
| GitHub community discussion #23345 | MEDIUM | GitHub PRO badge appearance |
| One Dark hex values (color-hex.com + joshdick/onedark.vim) | MEDIUM | One Dark palette |
| Monokai hex values (corrected gist) | MEDIUM | Monokai palette |
| Stripe SaaS pricing patterns (getmonetizely.com articles) | MEDIUM | Feature gating strategy |
| Railway/Vercel/Render pricing research | MEDIUM | Free vs PRO tier structure |
