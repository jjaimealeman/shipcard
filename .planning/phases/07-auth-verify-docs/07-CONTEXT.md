# Phase 7: Auth Verify + Docs - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify the GitHub OAuth device flow works end-to-end (login → sync → card appears), fix whatever breaks, claim the unscoped `shipcard` npm name, and document npx CLI usage. No new features — testing, fixing, and documenting what's already built.

</domain>

<decisions>
## Implementation Decisions

### OAuth testing scope
- GitHub OAuth App already created (real client ID + secret)
- All three Worker secrets deployed (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, TOKEN_SECRET)
- Fix whatever breaks during testing — Phase 7 isn't done until login works
- Test locally first (wrangler dev), then verify on live Worker (shipcard.dev)
- Full round-trip verification: login → sync → GET /u/:username returns real card

### npm package name
- Claim `shipcard` as unscoped package name (currently available on npm)
- Change package.json name from `@jjaimealeman/shipcard` to `shipcard`
- Clean break — no mention of old scoped name anywhere in docs
- This simplifies npx to just `npx shipcard summary` (no -p flag)

### Documentation structure
- README stays a 30-second sell: run command, get card, done
- USAGE.md gets the deep content: full command reference, all flags, examples
- npx first, global install as secondary option
- Include MCP config for both npx and global install
- Full command reference table in USAGE.md (summary, costs, card, login, sync — with all flags and examples)
- Show flexibility of available commands and descriptions

### Claude's Discretion
- Error handling UX: follow modern CLI conventions (clear messages, specific errors, no auto-retry on expired device codes)
- Login/sync documentation depth — keep README minimal, detail goes in USAGE.md
- Reference table formatting and example structure

</decisions>

<specifics>
## Specific Ideas

- "README remains minimal — they run the command, get their card, come back for more info later"
- "Document all available commands and descriptions — show how flexible it is"
- npx simplicity was a key driver for claiming unscoped name

</specifics>

<deferred>
## Deferred Ideas

- Landing page for shipcard.dev (replacing JSON health check) — Phase 8

</deferred>

---

*Phase: 07-auth-verify-docs*
*Context gathered: 2026-03-26*
