---
milestone: v1
audited: 2026-03-26T01:58:00Z
re_audited: 2026-03-27T11:43:00Z
status: tech_debt
scores:
  requirements: 35/35
  phases: 11/12 verified (Phase 5 missing VERIFICATION.md)
  integration: 9/9 cross-phase links wired
  flows: 4/4 E2E flows complete
gaps: []
tech_debt:
  - phase: 05-publish-launch
    items:
      - "Missing VERIFICATION.md — 4/4 plan summaries exist but no formal verification was run"
  - phase: 04-cloud-worker
    items:
      - "Placeholder OAuth client ID in login.ts — requires real GitHub OAuth App for production"
      - "Placeholder KV namespace IDs in wrangler.jsonc — requires real Cloudflare KV namespaces"
  - phase: 09-cli-time-series
    items:
      - "userMessages per day hardcoded to 0 in dailyAggregator.ts — global count accurate, per-day deferred"
  - phase: 12-polish-community
    items:
      - "Configurator panel selection for dashboard deferred (scoped out in 12-CONTEXT.md)"
tech_debt_resolved:
  - "MCP shipcard:card tool now returns SVG via renderCard() with full customization params"
  - "deleteToken() orphaned export removed from kv.ts"
  - "REQUIREMENTS.md CLOUD-01 route path corrected to /u/:username"
  - "dateRange local-vs-cloud asymmetry documented in USAGE.md"
---

# ShipCard v1 Milestone Audit (Full — 12 Phases)

**First audit:** 2026-03-26 (Phases 1–8)
**Re-audited:** 2026-03-27 (Full milestone — Phases 1–12)
**Status:** TECH DEBT (no blockers, 5 deferred items across 4 phases)

---

## Scores

| Category | Score | Details |
|----------|-------|---------|
| Requirements | 35/35 | All v1 requirements satisfied |
| Phases Verified | 11/12 | Phase 5 missing formal VERIFICATION.md |
| Cross-Phase Integration | 9/9 | All wiring confirmed by integration checker |
| E2E Flows | 4/4 | First-time user, returning user, community visitor, card embed |

---

## Requirements Coverage: 35/35

| Category | Count | Status |
|----------|-------|--------|
| Parser (PARSE-01–07) | 7 | All satisfied (Phase 1) |
| Analytics (ANLYT-01–06) | 6 | All satisfied (Phase 1) |
| CLI (CLI-01–06) | 6 | All satisfied (Phase 2, CLI-03 completed Phase 3) |
| MCP (MCP-01–05) | 5 | All satisfied (Phase 2, MCP-03 completed Phase 4) |
| Card (CARD-01–05) | 5 | All satisfied (Phase 3) |
| Cloud (CLOUD-01–05) | 5 | All satisfied (Phase 4, enhanced Phase 6) |
| Publishing (PUB-01–04) | 4 | All satisfied (Phase 5, PUB-02 completed Phase 7) |
| **Total** | **35** | **35/35** |

---

## Phase Verification: 11/12

| Phase | Score | Status | Date |
|-------|-------|--------|------|
| 1. Parser + Engine | 5/5 | Passed | 2026-03-25 |
| 2. MCP + CLI | 5/5 | Passed | 2026-03-25 |
| 3. SVG Card | 4/4 | Passed | 2026-03-26 |
| 4. Cloud Worker | 5/5 | Passed | 2026-03-26 |
| 5. Publish + Launch | — | UNVERIFIED | — |
| 6. Worker Card Params | 5/5 | Passed | 2026-03-26 |
| 7. Auth Verify + Docs | 5/5 | Passed | 2026-03-26 |
| 8. Landing Page | 8/8 | Passed | 2026-03-26 |
| 9. CLI Time-Series | 6/6 | Passed | 2026-03-27 |
| 10. Worker v2 API | 5/5 | Passed | 2026-03-27 |
| 11. Dashboard MVP | 5/5 | Passed | 2026-03-27 |
| 12. Polish + Community | 4/4 | Passed | 2026-03-27 |

---

## Cross-Phase Integration: 9/9

| Link | From → To | Status |
|------|-----------|--------|
| Parser → Engine → CLI/MCP | Phase 1 → 2 | WIRED |
| Engine → Local Card | Phase 1 → 3 | WIRED |
| CLI → Worker Auth Exchange | Phase 4 → 7 | WIRED |
| CLI v2 Sync → Worker v2 | Phase 9 → 10 | WIRED |
| Worker API → Dashboard | Phase 10 → 11 | WIRED |
| Landing → KV Community Data | Phase 8 → 12 | WIRED |
| SVG Footer → All Three Layouts | Phase 12 | WIRED |
| Route Ordering (dashboard > api > card) | Phase 11 | CORRECT |
| Privacy Boundary (CLI strip + Worker validate) | Phase 4 → 9 | WIRED |

**Key details:**
- `syncV2Routes` mounted before `syncRoutes` — prevents prefix swallowing
- `dashboardRoutes` mounted before `apiRoutes` and `cardRoutes` — prevents catch-all swallowing
- Two-layer privacy: CLI `toSafeStats()` strips data + Worker `isValidSafeStats()` rejects banned fields

---

## E2E Flows: 4/4

### Flow A: First-time user ✓
`shipcard summary` → engine → table → `shipcard card --local` → SVG file → `shipcard login` → GitHub device flow → token → `shipcard sync --confirm` → POST /sync/v2 → KV → `/u/{username}` → SVG card → `/u/{username}/dashboard` → Alpine dashboard

### Flow B: Returning user ✓
`shipcard sync --confirm` → overwrites KV → invalidates card cache → dashboard picks up fresh data

### Flow C: Community visitor ✓
`shipcard.dev` → landing with community teaser → `/community` → full leaderboard → click username → dashboard

### Flow D: Card embed ✓
GitHub README `![card](https://shipcard.dev/u/{username})` → camo proxy → Worker serves SVG with anti-camo headers → footer "Get yours at shipcard.dev" visible

---

## Tech Debt: 5 items across 4 phases

### Phase 5: Publish + Launch
- Missing VERIFICATION.md — all 4 plan summaries exist but no formal verification was run

### Phase 4: Cloud Worker
- Placeholder OAuth client ID in `login.ts` (`YOUR_GITHUB_OAUTH_APP_CLIENT_ID`) — requires real GitHub OAuth App
- Placeholder KV namespace IDs in `wrangler.jsonc` — requires real Cloudflare KV namespaces

### Phase 9: CLI Time-Series
- `userMessages` per day hardcoded to 0 in `dailyAggregator.ts` — global count accurate; per-day breakdown requires UserEntry timestamp work (documented TODO)

### Phase 12: Polish + Community
- Configurator panel selection for dashboard deferred (explicitly scoped out in 12-CONTEXT.md)

### Previously Resolved (from first audit)
1. ~~MCP card tool returns JSON~~ → `shipcard:card` now calls `renderCard()`, returns SVG
2. ~~`deleteToken()` orphaned export~~ → Removed from `kv.ts`
3. ~~REQUIREMENTS.md route path inconsistency~~ → CLOUD-01 corrected to `GET /u/:username`
4. ~~Cloud cards omit dateRange~~ → Asymmetry documented in USAGE.md

---

*First audit: 2026-03-26 (Phases 1–8)*
*Re-audited: 2026-03-27 (Full milestone — Phases 1–12)*
*Auditor: Claude (milestone audit orchestrator + gsd-integration-checker)*
