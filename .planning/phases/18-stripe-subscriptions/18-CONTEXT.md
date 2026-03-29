# Phase 18: Stripe Subscriptions - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can subscribe to PRO ($2/mo or $20/year), manage their subscription via Stripe Customer Portal, and the Worker enforces PRO gating consistently across all routes. Free + PRO tiers only — architecture should allow adding tiers later but no need to over-engineer now.

</domain>

<decisions>
## Implementation Decisions

### Pricing & plans
- Two tiers: Free and PRO ($2/month)
- Annual billing option: $20/year (save $4, ~17% discount)
- No free trial — free tier already exists as the "try before you buy"
- Single-tier PRO for now; codebase should be flexible enough to add Teams tier later without major refactor

### Upgrade experience
- Upgrade CTA appears inline where users hit a PRO gate (BYOT, custom slugs, AI insights) — not a persistent nav button
- CTA shows a mini feature card listing 3-4 PRO perks with upgrade button — not just a bare "Upgrade" link
- After successful Stripe Checkout, redirect to a welcome/onboarding page highlighting what they unlocked
- PRO-only features are hidden entirely from free users (not shown as disabled/locked)

### Subscription lifecycle
- 7-day grace period on failed payments — PRO stays active, dashboard shows a "payment failed" banner with countdown
- Stripe also sends its own failure emails, so user gets notified from both sides
- Cancel → downgrade at end of billing period (standard SaaS behavior)
- BYOT custom colors revert to catppuccin (default theme) on downgrade — no stored fallback
- Re-subscribe flow is same as new signup (no special "welcome back" handling)

### Dashboard billing UI
- Separate /settings or /billing page (not inline on main dashboard)
- Minimal billing info: plan status, next billing date, "Manage subscription" link to Stripe Customer Portal
- Stripe Customer Portal handles cancel, payment method updates, invoice history — no custom cancel flow
- PRO badge displayed in dashboard header/nav when user is subscribed

### Claude's Discretion
- Re-subscribe flow (same as new signup vs. welcome back)
- Billing page layout and styling
- Exact banner design for failed payment warnings
- Welcome/onboarding page content and design
- Webhook retry/idempotency implementation details

</decisions>

<specifics>
## Specific Ideas

- Stripe takes 2.9% + $0.30 per transaction — at $2/mo, user keeps $1.64 (82%); at $20/year, keeps $19.12 per year
- This is Jaime's first SaaS — Stripe integration is entirely new territory, so research should cover setup end-to-end
- PRO gate is currently a boolean `isPro(userId)` check — expanding to tiers later means swapping for a plan-level check

</specifics>

<deferred>
## Deferred Ideas

- Teams/org tier with higher pricing — future milestone after traction
- "Welcome back" flow for re-subscribers — revisit if churn becomes an issue

</deferred>

---

*Phase: 18-stripe-subscriptions*
*Context gathered: 2026-03-28*
