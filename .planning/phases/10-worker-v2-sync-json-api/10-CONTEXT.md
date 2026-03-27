# Phase 10: Worker v2 Sync + JSON API - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Worker accepts time-series data from the CLI via a v2 sync endpoint, stores it in KV, and serves two public JSON API endpoints for the dashboard. v1 sync and SVG card routes remain unchanged. No dashboard UI (Phase 11), no privacy controls (Phase 12), no user directory.

</domain>

<decisions>
## Implementation Decisions

### API response shape
- Claude's discretion on envelope vs raw — but must include `syncedAt` timestamp in API responses so dashboard can display "Data as of yyyy-mm-dd"
- Time-series filtering (date range vs full dump): Claude's discretion based on expected data volume
- CORS: Claude's discretion based on same-origin architecture

### API authentication
- Public GET routes — no auth required on `/api/stats` or `/api/timeseries`
- Consistent with existing public SVG card model
- Privacy/auth gating deferred to future monetization phase

### Validation & error handling
- Claude's discretion on validation strictness (strict vs lenient) — match existing Worker patterns
- 404 for users who have never synced (no zero-fill fake data)
- Date bounds validation: Claude's discretion — trust CLI-computed data
- "Data as of" timestamp enables users to see data freshness without ambiguity

### Storage & KV design
- KV structure (single blob vs split): Claude's discretion based on data volume projections
- Sync mode (full replace vs merge): Claude's discretion based on CLI behavior
- DELETE /sync wipes everything — stats, time-series, and card. Clean slate. CLI recomputes fresh from JSONL on next sync anyway.

### v1/v2 coexistence
- v1 POST /sync behavior with v2 data present: Claude's discretion (least-surprise principle)
- v1 deprecated after a few versions — not kept forever. CLI shows deprecation nudge.
- v2 sync response includes `apiVersion` field so CLI can detect version and suggest upgrades
- Response format: `{ ok: true, apiVersion: "v2", syncedAt: "..." }`

### Claude's Discretion
- Envelope structure for API responses (must include syncedAt)
- CORS policy (same-origin likely sufficient)
- Validation strictness on v2 payload
- KV key structure and storage strategy
- Time-series date range filtering vs full dump
- v1 sync behavior when v2 data exists

</decisions>

<specifics>
## Specific Ideas

- "Data as of yyyy-mm-dd" — user explicitly wants freshness indicator on dashboard, driven by syncedAt from API response
- v2 response includes apiVersion for CLI version negotiation: `CLI: Synced (API v2)`
- User envisions: install -> sync -> public dashboard. Uninstall -> delete -> clean slate. Reinstall later -> fresh start from JSONL.

</specifics>

<deferred>
## Deferred Ideas

- **Privacy as paid feature** — Public by default, pay for private dashboards. GitHub model. Strong for teams ("keep our velocity data away from competitors"). Future monetization phase.
- **User directory at /u/** — Browsable list of users with pagination. Clickable names from community feed -> user dashboard. Phase 12 scope.
- **Install/uninstall tracking** — Track users who install, sync, then delete/uninstall. Product analytics signal. Separate instrumentation phase. (npm weekly downloads provides some of this for free.)

</deferred>

---

*Phase: 10-worker-v2-sync-json-api*
*Context gathered: 2026-03-27*
