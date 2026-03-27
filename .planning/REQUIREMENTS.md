# Requirements: ShipCard v1.1 Dashboard Enhancement

**Defined:** 2026-03-27
**Core Value:** Make the dashboard the reason people adopt ShipCard — richer analytics that users screenshot and share.

## v1.1 Requirements

### Hero Section

- [ ] **HERO-01**: Dashboard displays Today's Activity with 4 metrics: messages, sessions, tools, tokens
- [ ] **HERO-02**: Each metric shows individual % change compared to yesterday (calendar day)
- [ ] **HERO-03**: Direction indicators use neutral warm/cool tones (not red/green alarm colors)
- [ ] **HERO-04**: Today's Activity uses calendar day boundaries (00:00–23:59 user timezone)
- [ ] **HERO-05**: Dashboard displays Peak Day card showing date, messages, sessions, project name, and cost
- [ ] **HERO-06**: Peak Day updates when a new day exceeds the previous peak

### Project Activity

- [ ] **PROJ-01**: Project Activity panel has sort toggle: messages | tokens | sessions | cost
- [ ] **PROJ-02**: Bar chart displays the selected metric per project (not just "days active")
- [ ] **PROJ-03**: Project list re-sorts when toggle changes without page reload
- [ ] **PROJ-04**: Default sort is by messages (most familiar metric)

### Data Pipeline

- [ ] **DATA-01**: Daily aggregator computes per-project stats: tokens, sessions, messages, cost per day
- [ ] **DATA-02**: SafeTimeSeries includes per-project breakdown when user syncs with --show-projects
- [ ] **DATA-03**: Worker API accepts and stores per-project stats alongside existing project names
- [ ] **DATA-04**: Privacy layer validates per-project stats (aggregated numbers only, no paths or raw data)
- [ ] **DATA-05**: Existing synced data degrades gracefully (old format without per-project stats still works)

### Cleanup

- [ ] **CLEAN-01**: Slowest Day metric removed from dashboard
- [ ] **CLEAN-02**: "Most Messages" label accurately reflects what it measures (was misleading in v1.0)

## Deferred (post-adoption)

- Additional card themes (tokyonight, dracula, synthwave)
- Custom color parameters via URL query string
- Support Codex CLI / Gemini CLI formats
- Burn rate predictor
- Natural language date parsing
- Team dashboards
- Per-chart export buttons (PNG/JSON/SVG)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Export buttons on charts | Complexity vs value — embeddable SVG cards already serve sharing use case. Deferred to v3. |
| Multi-agent support (Codex, Gemini) | Not dashboard work — separate milestone when user base exists |
| Paid tier / monetization | v2.0 milestone — need users first |
| Rolling 24h window for "today" | Calendar day is cleaner, resets predictably, matches user mental model |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HERO-01 | Phase 14 | Pending |
| HERO-02 | Phase 14 | Pending |
| HERO-03 | Phase 14 | Pending |
| HERO-04 | Phase 14 | Pending |
| HERO-05 | Phase 14 | Pending |
| HERO-06 | Phase 14 | Pending |
| PROJ-01 | Phase 15 | Pending |
| PROJ-02 | Phase 15 | Pending |
| PROJ-03 | Phase 15 | Pending |
| PROJ-04 | Phase 15 | Pending |
| DATA-01 | Phase 13 | Complete |
| DATA-02 | Phase 13 | Complete |
| DATA-03 | Phase 13 | Complete |
| DATA-04 | Phase 13 | Complete |
| DATA-05 | Phase 13 | Complete |
| CLEAN-01 | Phase 13 | Complete |
| CLEAN-02 | Phase 13 | Complete |

**Coverage:**
- v1.1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27 after roadmap creation — all 17 requirements mapped*
