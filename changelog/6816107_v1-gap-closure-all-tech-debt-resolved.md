# 2026-03-26 - V1 Gap Closure: All Tech Debt Resolved

**Keywords:** [REFACTOR] [DOCUMENTATION] [ENHANCEMENT] [BACKEND]
**Session:** Late night, Duration (~15 minutes)
**Commit:** 6816107

## What Changed

- File: `shiplog/src/mcp/tools/card.ts`
  - Wired `renderCard()` into MCP `shipcard:card` tool — now returns SVG instead of raw JSON
  - Added layout, style, theme, hide, and heroStat input params with zod validation
  - Updated tool title and description to reflect SVG output
- File: `shiplog-worker/src/kv.ts`
  - Removed orphaned `deleteToken()` export (dead code, never imported anywhere)
- File: `.planning/REQUIREMENTS.md`
  - Fixed CLOUD-01 route path from `GET /card/:username` to `GET /u/:username`
- File: `USAGE.md`
  - Updated `shipcard:card` MCP tool docs: new params table, SVG return type, example prompts
  - Added dateRange asymmetry note under card command flags (local shows it, cloud strips it for privacy)
- File: `.planning/v1-MILESTONE-AUDIT.md`
  - Updated scores: integration 19/19, flows 8/8, status: clean
  - Marked all 4 tech debt items as resolved with descriptions

## Why

The v1 milestone audit identified 4 tech debt items — none critical, but all worth closing before archiving the milestone. This commit resolves every one:

1. MCP card tool was the only interface that couldn't produce SVG — now it has full parity with the CLI
2. Dead code (`deleteToken`) removed to keep exports honest
3. Doc/implementation route mismatch corrected
4. Privacy-driven dateRange asymmetry between local and cloud cards now documented for users

## Issues Encountered

No major issues encountered. All changes were straightforward — the audit had already mapped exactly what needed fixing.

## Dependencies

No dependencies added.

## Testing Notes

- Both `tsc --noEmit` pass clean (shiplog + shiplog-worker)
- MCP card tool change is a pure function swap (runEngine → renderCard), same input type
- deleteToken removal verified: no imports found across entire worker codebase

## Next Steps

- [ ] Run `/gsd:complete-milestone v1` to archive the milestone
- [ ] Deploy updated Worker with `wrangler deploy`
- [ ] Publish updated npm package

---

**Branch:** feature/v1-gap-closure
**Issue:** N/A
**Impact:** MEDIUM - closes all v1 tech debt, MCP tool now returns SVG
