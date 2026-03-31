# 2026-03-31 - feat: redesign landing, community, configure pages + CLI fixes

**Keywords:** [feat] [auto-generated]
**Commit:** d4d5bac

## What Changed

 .planning/ideas/sqlite-bridge-v3.md     |   93 +++
 USAGE.md                                |   39 +-
 logo-favicon.svg                        |   10 +
 logo-wordmark.svg                       |    8 +
 shipcard-worker/src/routes/community.ts |  480 +++++------
 shipcard-worker/src/routes/configure.ts |  692 +++++++---------
 shipcard-worker/src/routes/landing.ts   | 1368 +++++++++++--------------------
 shipcard/package.json                   |    2 +-
 shipcard/src/cli/commands/costs.ts      |    5 +-
 shipcard/src/cli/commands/summary.ts    |    7 +-
 shipcard/src/cli/format.ts              |   29 +-
 11 files changed, 1145 insertions(+), 1588 deletions(-)

## Files

- `.planning/ideas/sqlite-bridge-v3.md`
- `USAGE.md`
- `logo-favicon.svg`
- `logo-wordmark.svg`
- `shipcard-worker/src/routes/community.ts`
- `shipcard-worker/src/routes/configure.ts`
- `shipcard-worker/src/routes/landing.ts`
- `shipcard/package.json`
- `shipcard/src/cli/commands/costs.ts`
- `shipcard/src/cli/commands/summary.ts`
- `shipcard/src/cli/format.ts`

---

**Branch:** develop
**Impact:** HIGH
**Source:** gsd-changelog-hook (auto-generated)
