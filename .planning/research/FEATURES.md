# Feature Landscape

**Domain:** Developer analytics / stats card tool (local-first, agentic dev focus)
**Researched:** 2026-03-25
**Project:** ShipLog

---

## Competitor Feature Audit

This section documents what the key competitors actually ship, used to define table stakes vs differentiators below.

### ccusage (12K stars, CLI-only, local)

Source: [ccusage.com](https://ccusage.com/) + [GitHub](https://github.com/ryoppippi/ccusage)

Metrics tracked:
- Input / output token counts
- Cache creation and cache read tokens (separately)
- Cost in USD per period
- Model identification (Opus, Sonnet, Haiku)
- Per-model cost breakdowns

Report types:
- `daily` — token usage + cost by date
- `weekly` — weekly aggregation with configurable start day
- `monthly` — monthly periods
- `session` — grouped by conversation session / project directory
- `blocks` — 5-hour Claude billing window tracking

CLI flags: `--since`, `--until`, `--json`, `--breakdown`, `--timezone`, `--locale`, `--instances`, `--project`, `--compact`, `--offline`

MCP server: 4 exposed tools (daily, monthly, session, blocks) with since/until/mode/timezone params.

Integrations: MCP server for Claude Desktop, statusline hook (beta), library mode for embedding.

Output formats: Responsive terminal tables, JSON export.

No sharing, no cards, no visualization beyond terminal tables.

### WakaTime (500K users, editor plugin + SaaS)

Source: [wakatime.com/features](https://wakatime.com/features)

Metrics tracked:
- Time spent per project, file, language, OS, editor
- Branch names, commit/PR data
- Lines added/removed, cursor position
- Activity categories (debugging, building, coding)
- AFK detection (stops tracking when idle)

Dashboard features:
- Goals with email reminders (daily coding targets, language targets)
- Private leaderboards for team competition
- Team dashboards with aggregated views
- Commit/PR overlay on timeline
- Annual "wrapped" reports

Privacy controls:
- Source code never uploaded (metadata only)
- Per-directory whitelist (only log certain paths)
- Opt out of public leaderboards
- Anonymous team dashboard mode (aggregates only, no per-developer breakdown)
- Delete specific tracked durations from dashboard
- No third-party data sharing

Sharing: Public profile pages, embeddable stats card (github-readme-stats integration), API access.

### github-readme-stats (67K stars, embeddable SVG cards)

Source: [GitHub anuraghazra/github-readme-stats](https://github.com/anuraghazra/github-readme-stats)

Card types:
1. Stats Card — stars, commits, PRs, issues, contributions
2. Extra Pins — showcase specific repositories
3. Gist Pins — feature specific gists
4. Top Languages Card — language usage visualization
5. WakaTime Stats Card — time-tracking data integration

Customization (URL parameters):
- Colors: `title_color`, `text_color`, `icon_color`, `border_color`, `bg_color` (hex + gradients)
- Layout: `hide_border`, `border_radius`, `show_icons`, `hide`, `show`
- Themes: 10+ built-in (dark, radical, tokyonight, dracula, synthwave, etc.) — new themes frozen
- Responsive theming: `#gh-dark-mode-only`, `#gh-light-mode-only`, HTML `<picture>` + `prefers-color-scheme`
- Caching: `cache_seconds` parameter
- Locale: 50+ languages

Embed format: `![](https://github-readme-stats.vercel.app/api?username=X&theme=Y)` in Markdown.

Self-hosting: Deploy to Vercel with personal access token for private repo data.

### Claude-Code-Usage-Monitor (terminal dashboard, real-time)

Source: [GitHub Maciek-roboblog](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor)

Features:
- Live dashboard refreshing every 3 seconds
- Predictive burn rate (estimates when session hits token cap)
- Color-coded progress bars for token and time remaining
- View modes: realtime, daily, monthly
- Proactive alerts as limits approach

### Agent Stats (macOS app + CLI)

Source: [agentstats.app](https://www.agentstats.app/)

Features:
- Native macOS app + CLI
- Tracks runs, tokens, spend
- Supports both Codex and Claude Code
- Available via `npx agent-stat@latest`

---

## Table Stakes

Features users expect when discovering this category. Missing any of these and the tool feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Cost in USD by time period (daily/monthly) | Core value prop — ccusage sets this expectation, every user asks "what did I spend?" | Low | Parse `costUSD` from JSONL or calculate from tokens + pricing |
| Per-model cost breakdown | Opus vs Sonnet have 10x cost difference; users need this to optimize | Low | Group by `model` field in JSONL |
| Per-project cost breakdown | Multiple projects on one plan — developers need to understand where spend goes | Low | Group by project directory path |
| Session-level granularity | "What did that 3-hour coding session cost?" — natural unit of thought | Low | Group by JSONL filename/session ID |
| Date range filtering | Can't use a reporting tool without time filtering | Low | `--since` / `--until` flags |
| JSON output | Developer tools must be pipe-friendly; people put this in scripts and hooks | Low | `--json` flag |
| Token count display (input/output/cache) | Cache read tokens are cheap, cache write expensive — users want the split | Low | JSONL has separate token type fields |
| Timezone support | Developers are global; billing windows are timezone-sensitive | Low | ccusage users complain when this is missing |
| Works offline / local-only | Core trust assumption for local JSONL reader — data never leaves machine | None | Architecture decision, not feature flag |
| Human-readable terminal tables | Primary output surface for CLI tools in this space | Low | Responsive width, color coding |
| `npx` / zero-install invocation | ccusage adopted this; developer expectation is "just run it" | Low | Package structure concern |

## Differentiators

Features that create competitive advantage for ShipLog. Not expected by users arriving from ccusage, but valued when discovered.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Embeddable SVG stats card | "Proof of shipping" for vibe coders; GitHub profile flex; no competitor in Claude space does this | High | Requires card renderer (SVG generation), static hosting or local generation |
| MCP server with `shiplog:summary`, `shiplog:costs`, `shiplog:card` tools | Agents can query their own spend mid-session; ShipLog becomes part of the agentic workflow, not just a retrospective reporter | Medium | Follow ccusage MCP pattern, extend with card generation |
| Billing window burn rate / session prediction | "You're 73% through your 5-hour window, estimated $12 remaining" — live ops value | Medium | Needs real-time mode or statusline hook |
| Multi-tool support (Claude Code + Codex CLI + Amp) | ccusage has extensions for this; agentic devs use multiple tools | Medium | Requires per-tool JSONL parser |
| Shareable card URL generation | Static URL that renders current stats; enable social sharing without self-hosting | High | Requires either remote render endpoint or base64-encoded config |
| Card themes matching developer aesthetic | tokyonight, dracula, etc. are cultural signals in this community | Low | CSS variables approach, follow github-readme-stats theme system |
| Annual / period "wrapped" report | WakaTime does this to viral effect; first Claude-native version would get attention | Medium | Aggregate query + layout template |
| Cost anomaly alerts | "Unusually high spend today" — proactive notification vs reactive reporting | Medium | Requires baseline calculation and threshold comparison |
| `--since yesterday` / natural language date parsing | Developer-friendly shortcuts that reduce friction; standard in modern CLIs | Low | Use chrono-node or similar; already expected by power users |
| Statusline output (terminal prompt integration) | Shows cost in terminal prompt while working; live feedback during sessions | Low | ccusage has beta version; ShipLog should match and extend |

## Anti-Features

Things to deliberately NOT build. Common traps in this space.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Cloud sync / account system at v1 | Kills the local-first trust story; adds auth complexity; competing with yourself | Stay 100% local; if sync is needed later, design as opt-in with explicit consent |
| Source code upload or file content tracking | WakaTime gets significant distrust because users worry about this even though WakaTime claims not to; ccusage trust comes from "reads local files only" | Only read JSONL metadata; never touch project files; be explicit in docs |
| Team dashboard / org-level reporting in MVP | Adds multi-user model, permissions, billing complexity; wrong user for v1 | Ship solo experience perfectly; team features are a separate product motion |
| Persistent background daemon | Privacy-sensitive tools should not run as hidden services; creates unease | Run on-demand CLI; opt-in for statusline integration |
| Telemetry without explicit opt-in | Destroys trust in a privacy-focused tool instantly | If telemetry is ever needed, make it opt-in with visible, auditable data |
| Real-time editor plugin (WakaTime-style) | Massive complexity, distribution problem, per-editor maintenance; Claude Code already writes JSONL | Read the JSONL that Claude Code already writes; don't add another tracking layer |
| Gamification / leaderboards | Mismatches solo dev target user; adds social complexity; feels surveillance-y for a cost tool | Focus on individual insight; "your best shipping week" framing vs competitive |
| Cryptocurrency / token gating for card generation | Seen in some developer profile tools; adds friction with zero benefit for target user | Keep card generation free and local |

## Feature Dependencies

```
JSONL Reader (parse ~/.claude/projects/**/*.jsonl)
  └── Cost Calculator (token counts × model pricing)
        ├── Daily Report
        ├── Monthly Report
        ├── Session Report (group by JSONL filename)
        │     └── Per-Project Breakdown (group by directory)
        └── 5-Hour Billing Block Tracker
              └── Burn Rate Predictor

CLI Interface (table output + JSON flag)
  ├── Date filtering (--since / --until)
  ├── Project filtering (--project)
  └── Statusline output (compact mode)

MCP Server
  └── Requires: All report types above (wraps CLI commands as tools)
        └── shiplog:card tool (requires Card Renderer below)

Card Renderer (SVG generation)
  ├── Requires: Cost Calculator (data source)
  ├── Theme system (CSS variables, built-in presets)
  ├── Local SVG file output
  └── (Optional later) Remote render endpoint for shareable URL
        └── Requires: Remote hosting (Cloudflare Workers / Vercel)

Shareable card URL
  └── Requires: Either remote renderer OR base64-config approach
```

Key sequencing constraint: MCP server and card generation are independent features that can ship separately. The MCP server wraps existing report commands. The card renderer adds a new output surface.

## MVP Recommendation

For MVP (v0.1), prioritize:

1. JSONL reader + cost calculator (foundation for everything)
2. `shiplog:summary` and `shiplog:costs` MCP tools (core value, makes tool useful inside Claude Code)
3. CLI `summary` and `costs` commands with table + JSON output
4. Per-project and per-model breakdowns
5. `shiplog:card` MCP tool + `card` CLI command generating local SVG

Defer to post-MVP:

- Shareable card URL (requires remote hosting decisions): complexity without immediate solo-dev payoff
- Burn rate predictor / real-time monitoring: useful but requires different architecture (polling vs on-demand)
- Annual "wrapped" report: high marketing value, low priority for initial utility
- Multi-tool support (Codex, Amp): validate Claude Code market first
- Card themes beyond 2-3 presets: themes are polish, not foundation

## Sources

- [ccusage GitHub](https://github.com/ryoppippi/ccusage) — HIGH confidence (official source)
- [ccusage MCP guide](https://ccusage.com/guide/mcp-server) — HIGH confidence (official docs)
- [github-readme-stats GitHub](https://github.com/anuraghazra/github-readme-stats) — HIGH confidence (official source)
- [WakaTime features](https://wakatime.com/features) — HIGH confidence (official source)
- [Agent Stats](https://www.agentstats.app/) — MEDIUM confidence (sparse official page)
- [Claude Code Usage Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor) — MEDIUM confidence (community tool, may evolve)
- [Evil Martians: CLI UX patterns](https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays) — MEDIUM confidence (engineering blog, well-regarded)
- [eesel.ai ccusage guide](https://www.eesel.ai/blog/usage-analytics-claude-code) — LOW confidence (third-party blog, used for feature inventory only)
