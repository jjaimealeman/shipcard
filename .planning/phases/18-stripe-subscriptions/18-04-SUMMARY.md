---
phase: 18-stripe-subscriptions
plan: 04
subsystem: ui
tags: [alpine, stripe, billing, dashboard, html]

# Dependency graph
requires:
  - phase: 18-03
    provides: billing routes (GET /billing/checkout, /billing/portal) via GitHub OAuth flow
  - phase: 18-01
    provides: D1 subscriptions table, getSubscription() query helper
  - phase: 17-03
    provides: Dashboard HTML with Theme Configurator, Alpine store, BYOT section
provides:
  - Dashboard PRO badge in filter-bar header (Alpine store reactive)
  - Payment-failed banner below filter-bar with update payment link
  - Upgrade card at BYOT lock overlay with feature list and monthly/annual pricing
  - Billing section showing PRO status + next billing date + Manage Subscription link
  - Free user plan indicator with upgrade hint
  - Alpine.store('dashboard') extended with isPro, paymentFailed, subscriptionStatus, periodEnd
  - Server-side injection of subscription placeholders (__SUBSCRIPTION_STATUS__, __PAYMENT_FAILED__, __PERIOD_END__)
affects:
  - phase-19 (custom slugs — will add its own upgrade prompt at the slugs touchpoint)
  - phase-20 (AI insights — will add its own upgrade prompt at insights touchpoint)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server-side placeholder injection for subscription state (no client fetch flash)
    - Alpine.store extension for shared billing state across dashboard sections
    - GET-only billing links — no forms, no POST, OAuth handled by billing route

key-files:
  created: []
  modified:
    - shipcard-worker/src/routes/dashboard.ts

key-decisions:
  - "isPro/paymentFailed/subscriptionStatus/periodEnd added to Alpine.store('dashboard') for shared state"
  - "PRO badge uses x-data on inline span to access $store (filter-bar is outside main x-data scope)"
  - "Payment banner placed outside .page div, directly below filter-bar for maximum visibility"
  - "Billing section uses x-data wrapper + x-if templates for PRO vs free conditional rendering"
  - "All billing links are GET <a> tags — no forms, no POST, OAuth redirect handled by billing route"

patterns-established:
  - "Server-injected billing placeholders: __SUBSCRIPTION_STATUS__, __PAYMENT_FAILED__, __PERIOD_END__"
  - "Store extension pattern: billing state colocated with data-fetching store"

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 18 Plan 04: Dashboard Billing UI Summary

**Dashboard billing UI with PRO badge, payment-failed banner, feature-list upgrade card ($2/mo, $20/yr), and billing section showing subscription status via server-injected Alpine store state**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-29T08:03:50Z
- **Completed:** 2026-03-29T08:06:27Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Extended Alpine.store('dashboard') with subscription state (isPro, paymentFailed, subscriptionStatus, periodEnd) injected server-side via placeholders
- Added PRO badge to filter-bar header, payment-failed banner with "Update Payment" link
- Replaced simple BYOT lock with upgrade-card featuring full feature list and both pricing options as GET links
- Added billing section at bottom of dashboard: PRO users see plan + next billing date + Manage Subscription; free users see "Free" + upgrade hint

## Task Commits

Each task was committed atomically:

1. **Task 1: Add subscription data injection, PRO badge, payment banner, upgrade prompt** - `4eee0c9` (feat)
2. **Task 2: Add billing/settings section to dashboard** - `8b3db31` (feat)

**Plan metadata:** (pending this commit) (docs: complete plan)

## Files Created/Modified

- `shipcard-worker/src/routes/dashboard.ts` - Added getSubscription import, route handler subscription fetch, Alpine store billing fields, PRO badge HTML+CSS, payment banner HTML+CSS, upgrade-card HTML+CSS, billing section HTML+CSS

## Decisions Made

- `isPro` in the Alpine store and `isPro` in the theme configurator's local x-data are separate — the store value drives badge/banner/billing section; the local value drives BYOT field disabling. Both get `__IS_PRO__` injected but in different scopes.
- Payment banner sits outside `.page` div (directly after filter-bar) so it appears above all content even on scroll.
- Billing section uses `<template x-if>` rather than `x-show` to avoid rendering both PRO and free content simultaneously.
- PRO badge uses `x-data` inline span to bridge into `$store.dashboard` since the filter-bar is outside the body's root `x-data` scope.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Dashboard billing UI complete; users can see subscription status and access management
- /billing/checkout and /billing/portal routes (Phase 18-03) are linked from upgrade prompts
- Phase 18-05 (PRO gate enforcement) can now reference the billing section and upgrade paths
- Phases 19/20 should add upgrade prompts at their respective feature touchpoints (custom slugs, AI insights)

---
*Phase: 18-stripe-subscriptions*
*Completed: 2026-03-29*
