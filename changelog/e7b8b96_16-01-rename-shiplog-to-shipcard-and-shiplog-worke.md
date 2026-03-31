# 2026-03-28 - feat(16-01): rename shiplog/ to shipcard/ and shiplog-worker/ to shipcard-worker/

**Keywords:** [feat] [auto-generated]
**Commit:** e7b8b96

## What Changed

 CLAUDE.md                                  |    2 +-
 shipcard-worker/.gitignore                 |    4 +
 shipcard-worker/package-lock.json          | 1524 +++++++++++++++++
 shipcard-worker/package.json               |   18 +
 shipcard-worker/src/auth.ts                |   41 +
 shipcard-worker/src/globals.d.ts           |    2 +
 shipcard-worker/src/index.ts               |   62 +
 shipcard-worker/src/kv.ts                  |  250 +++
 shipcard-worker/src/routes/api.ts          |   68 +
 shipcard-worker/src/routes/auth.ts         |   93 ++
 shipcard-worker/src/routes/card.ts         |   85 +
 shipcard-worker/src/routes/community.ts    |  424 +++++
 shipcard-worker/src/routes/configure.ts    |  752 +++++++++
 shipcard-worker/src/routes/dashboard.ts    | 2442 ++++++++++++++++++++++++++++
 shipcard-worker/src/routes/landing.ts      | 1030 ++++++++++++
 shipcard-worker/src/routes/sync.ts         |  128 ++
 shipcard-worker/src/routes/syncV2.ts       |  126 ++
 shipcard-worker/src/svg/format.ts          |   50 +
 shipcard-worker/src/svg/index.ts           |  216 +++
 shipcard-worker/src/svg/layouts/classic.ts |  118 ++
 shipcard-worker/src/svg/layouts/compact.ts |  114 ++
 shipcard-worker/src/svg/layouts/hero.ts    |  155 ++
 shipcard-worker/src/svg/renderer.ts        |  108 ++
 shipcard-worker/src/svg/themes/branded.ts  |   36 +
 shipcard-worker/src/svg/themes/github.ts   |   30 +
 shipcard-worker/src/svg/themes/index.ts    |   58 +
 shipcard-worker/src/svg/themes/minimal.ts  |   37 +
 shipcard-worker/src/svg/themes/types.ts    |   24 +
 shipcard-worker/src/svg/xml.ts             |   21 +
 shipcard-worker/src/types.ts               |  328 ++++
 shipcard-worker/tsconfig.json              |   13 +
 shipcard-worker/wrangler.jsonc             |   38 +
 shipcard/.gitignore                        |    2 +
 shipcard/LICENSE                           |   21 +
 shipcard/README.md                         |  111 ++
 shipcard/STYLES.md                         |   94 ++
 shipcard/USAGE.md                          |  189 +++
 shipcard/data/pricing-snapshot.json        |  152 ++
 shipcard/docs/mcp-config.md                |   69 +
 shipcard/package-lock.json                 | 1300 +++++++++++++++
 shipcard/package.json                      |   35 +
 shipcard/src/card/format.ts                |   50 +
 shipcard/src/card/git.ts                   |   33 +
 shipcard/src/card/index.ts                 |  149 ++
 shipcard/src/card/layouts/classic.ts       |  118 ++
 shipcard/src/card/layouts/compact.ts       |  114 ++
 shipcard/src/card/layouts/hero.ts          |  155 ++
 shipcard/src/card/preview.ts               |   53 +
 shipcard/src/card/renderer.ts              |  108 ++
 shipcard/src/card/themes/branded.ts        |   37 +
 shipcard/src/card/themes/github.ts         |   30 +
 shipcard/src/card/themes/index.ts          |   58 +
 shipcard/src/card/themes/minimal.ts        |   37 +
 shipcard/src/card/themes/types.ts          |   24 +
 shipcard/src/card/xml.ts                   |   21 +
 shipcard/src/cli/args.ts                   |  104 ++
 shipcard/src/cli/commands/card.ts          |  164 ++
 shipcard/src/cli/commands/costs.ts         |   92 ++
 shipcard/src/cli/commands/login.ts         |  182 +++
 shipcard/src/cli/commands/summary.ts       |   87 +
 shipcard/src/cli/commands/sync.ts          |  278 ++++
 shipcard/src/cli/config.ts                 |  115 ++
 shipcard/src/cli/format.ts                 |  270 +++
 shipcard/src/cli/index.ts                  |  144 ++
 shipcard/src/cli/safestats.ts              |  176 ++
 shipcard/src/engine/aggregator.ts          |  272 ++++
 shipcard/src/engine/cost.ts                |  371 +++++
 shipcard/src/engine/dailyAggregator.ts     |  240 +++
 shipcard/src/engine/filter.ts              |   97 ++
 shipcard/src/engine/index.ts               |   32 +
 shipcard/src/engine/types.ts               |   98 ++
 shipcard/src/index.ts                      |  174 ++
 shipcard/src/mcp/server.ts                 |   31 +
 shipcard/src/mcp/tools/card.ts             |   87 +
 shipcard/src/mcp/tools/costs.ts            |   60 +
 shipcard/src/mcp/tools/summary.ts          |   57 +
 shipcard/src/parser/deduplicator.ts        |  200 +++
 shipcard/src/parser/index.ts               |   16 +
 shipcard/src/parser/reader.ts              |   54 +
 shipcard/src/parser/schema.ts              |  142 ++
 shipcard/tsconfig.json                     |   16 +
 shiplog-worker/.gitignore                  |    4 -
 shiplog-worker/package-lock.json           | 1524 -----------------
 shiplog-worker/package.json                |   18 -
 shiplog-worker/src/auth.ts                 |   41 -
 shiplog-worker/src/globals.d.ts            |    2 -
 shiplog-worker/src/index.ts                |   62 -
 shiplog-worker/src/kv.ts                   |  250 ---
 shiplog-worker/src/routes/api.ts           |   68 -
 shiplog-worker/src/routes/auth.ts          |   93 --
 shiplog-worker/src/routes/card.ts          |   85 -
 shiplog-worker/src/routes/community.ts     |  424 -----
 shiplog-worker/src/routes/configure.ts     |  752 ---------
 shiplog-worker/src/routes/dashboard.ts     | 2442 ----------------------------
 shiplog-worker/src/routes/landing.ts       | 1030 ------------
 shiplog-worker/src/routes/sync.ts          |  128 --
 shiplog-worker/src/routes/syncV2.ts        |  126 --
 shiplog-worker/src/svg/format.ts           |   50 -
 shiplog-worker/src/svg/index.ts            |  216 ---
 shiplog-worker/src/svg/layouts/classic.ts  |  118 --
 shiplog-worker/src/svg/layouts/compact.ts  |  114 --
 shiplog-worker/src/svg/layouts/hero.ts     |  155 --
 shiplog-worker/src/svg/renderer.ts         |  108 --
 shiplog-worker/src/svg/themes/branded.ts   |   36 -
 shiplog-worker/src/svg/themes/github.ts    |   30 -
 shiplog-worker/src/svg/themes/index.ts     |   58 -
 shiplog-worker/src/svg/themes/minimal.ts   |   37 -
 shiplog-worker/src/svg/themes/types.ts     |   24 -
 shiplog-worker/src/svg/xml.ts              |   21 -
 shiplog-worker/src/types.ts                |  328 ----
 shiplog-worker/tsconfig.json               |   13 -
 shiplog-worker/wrangler.jsonc              |   38 -
 shiplog/.gitignore                         |    2 -
 shiplog/LICENSE                            |   21 -
 shiplog/README.md                          |  111 --
 shiplog/STYLES.md                          |   94 --
 shiplog/USAGE.md                           |  189 ---
 shiplog/data/pricing-snapshot.json         |  152 --
 shiplog/docs/mcp-config.md                 |   69 -
 shiplog/package-lock.json                  | 1300 ---------------
 shiplog/package.json                       |   35 -
 shiplog/src/card/format.ts                 |   50 -
 shiplog/src/card/git.ts                    |   33 -
 shiplog/src/card/index.ts                  |  149 --
 shiplog/src/card/layouts/classic.ts        |  118 --
 shiplog/src/card/layouts/compact.ts        |  114 --
 shiplog/src/card/layouts/hero.ts           |  155 --
 shiplog/src/card/preview.ts                |   53 -
 shiplog/src/card/renderer.ts               |  108 --
 shiplog/src/card/themes/branded.ts         |   37 -
 shiplog/src/card/themes/github.ts          |   30 -
 shiplog/src/card/themes/index.ts           |   58 -
 shiplog/src/card/themes/minimal.ts         |   37 -
 shiplog/src/card/themes/types.ts           |   24 -
 shiplog/src/card/xml.ts                    |   21 -
 shiplog/src/cli/args.ts                    |  104 --
 shiplog/src/cli/commands/card.ts           |  164 --
 shiplog/src/cli/commands/costs.ts          |   92 --
 shiplog/src/cli/commands/login.ts          |  182 ---
 shiplog/src/cli/commands/summary.ts        |   87 -
 shiplog/src/cli/commands/sync.ts           |  278 ----
 shiplog/src/cli/config.ts                  |  115 --
 shiplog/src/cli/format.ts                  |  270 ---
 shiplog/src/cli/index.ts                   |  144 --
 shiplog/src/cli/safestats.ts               |  176 --
 shiplog/src/engine/aggregator.ts           |  272 ----
 shiplog/src/engine/cost.ts                 |  371 -----
 shiplog/src/engine/dailyAggregator.ts      |  240 ---
 shiplog/src/engine/filter.ts               |   97 --
 shiplog/src/engine/index.ts                |   32 -
 shiplog/src/engine/types.ts                |   98 --
 shiplog/src/index.ts                       |  174 --
 shiplog/src/mcp/server.ts                  |   31 -
 shiplog/src/mcp/tools/card.ts              |   87 -
 shiplog/src/mcp/tools/costs.ts             |   60 -
 shiplog/src/mcp/tools/summary.ts           |   57 -
 shiplog/src/parser/deduplicator.ts         |  200 ---
 shiplog/src/parser/index.ts                |   16 -
 shiplog/src/parser/reader.ts               |   54 -
 shiplog/src/parser/schema.ts               |  142 --
 shiplog/tsconfig.json                      |   16 -
 161 files changed, 14915 insertions(+), 14915 deletions(-)

## Files

- `CLAUDE.md`
- `shipcard-worker/.gitignore`
- `shipcard-worker/package-lock.json`
- `shipcard-worker/package.json`
- `shipcard-worker/src/auth.ts`
- `shipcard-worker/src/globals.d.ts`
- `shipcard-worker/src/index.ts`
- `shipcard-worker/src/kv.ts`
- `shipcard-worker/src/routes/api.ts`
- `shipcard-worker/src/routes/auth.ts`
- `shipcard-worker/src/routes/card.ts`
- `shipcard-worker/src/routes/community.ts`
- `shipcard-worker/src/routes/configure.ts`
- `shipcard-worker/src/routes/dashboard.ts`
- `shipcard-worker/src/routes/landing.ts`
- `shipcard-worker/src/routes/sync.ts`
- `shipcard-worker/src/routes/syncV2.ts`
- `shipcard-worker/src/svg/format.ts`
- `shipcard-worker/src/svg/index.ts`
- `shipcard-worker/src/svg/layouts/classic.ts`
- `shipcard-worker/src/svg/layouts/compact.ts`
- `shipcard-worker/src/svg/layouts/hero.ts`
- `shipcard-worker/src/svg/renderer.ts`
- `shipcard-worker/src/svg/themes/branded.ts`
- `shipcard-worker/src/svg/themes/github.ts`
- `shipcard-worker/src/svg/themes/index.ts`
- `shipcard-worker/src/svg/themes/minimal.ts`
- `shipcard-worker/src/svg/themes/types.ts`
- `shipcard-worker/src/svg/xml.ts`
- `shipcard-worker/src/types.ts`
- `shipcard-worker/tsconfig.json`
- `shipcard-worker/wrangler.jsonc`
- `shipcard/.gitignore`
- `shipcard/LICENSE`
- `shipcard/README.md`
- `shipcard/STYLES.md`
- `shipcard/USAGE.md`
- `shipcard/data/pricing-snapshot.json`
- `shipcard/docs/mcp-config.md`
- `shipcard/package-lock.json`
- `shipcard/package.json`
- `shipcard/src/card/format.ts`
- `shipcard/src/card/git.ts`
- `shipcard/src/card/index.ts`
- `shipcard/src/card/layouts/classic.ts`
- `shipcard/src/card/layouts/compact.ts`
- `shipcard/src/card/layouts/hero.ts`
- `shipcard/src/card/preview.ts`
- `shipcard/src/card/renderer.ts`
- `shipcard/src/card/themes/branded.ts`
- `shipcard/src/card/themes/github.ts`
- `shipcard/src/card/themes/index.ts`
- `shipcard/src/card/themes/minimal.ts`
- `shipcard/src/card/themes/types.ts`
- `shipcard/src/card/xml.ts`
- `shipcard/src/cli/args.ts`
- `shipcard/src/cli/commands/card.ts`
- `shipcard/src/cli/commands/costs.ts`
- `shipcard/src/cli/commands/login.ts`
- `shipcard/src/cli/commands/summary.ts`
- `shipcard/src/cli/commands/sync.ts`
- `shipcard/src/cli/config.ts`
- `shipcard/src/cli/format.ts`
- `shipcard/src/cli/index.ts`
- `shipcard/src/cli/safestats.ts`
- `shipcard/src/engine/aggregator.ts`
- `shipcard/src/engine/cost.ts`
- `shipcard/src/engine/dailyAggregator.ts`
- `shipcard/src/engine/filter.ts`
- `shipcard/src/engine/index.ts`
- `shipcard/src/engine/types.ts`
- `shipcard/src/index.ts`
- `shipcard/src/mcp/server.ts`
- `shipcard/src/mcp/tools/card.ts`
- `shipcard/src/mcp/tools/costs.ts`
- `shipcard/src/mcp/tools/summary.ts`
- `shipcard/src/parser/deduplicator.ts`
- `shipcard/src/parser/index.ts`
- `shipcard/src/parser/reader.ts`
- `shipcard/src/parser/schema.ts`
- `shipcard/tsconfig.json`
- `shiplog-worker/.gitignore`
- `shiplog-worker/package-lock.json`
- `shiplog-worker/package.json`
- `shiplog-worker/src/auth.ts`
- `shiplog-worker/src/globals.d.ts`
- `shiplog-worker/src/index.ts`
- `shiplog-worker/src/kv.ts`
- `shiplog-worker/src/routes/api.ts`
- `shiplog-worker/src/routes/auth.ts`
- `shiplog-worker/src/routes/card.ts`
- `shiplog-worker/src/routes/community.ts`
- `shiplog-worker/src/routes/configure.ts`
- `shiplog-worker/src/routes/dashboard.ts`
- `shiplog-worker/src/routes/landing.ts`
- `shiplog-worker/src/routes/sync.ts`
- `shiplog-worker/src/routes/syncV2.ts`
- `shiplog-worker/src/svg/format.ts`
- `shiplog-worker/src/svg/index.ts`
- `shiplog-worker/src/svg/layouts/classic.ts`
- `shiplog-worker/src/svg/layouts/compact.ts`
- `shiplog-worker/src/svg/layouts/hero.ts`
- `shiplog-worker/src/svg/renderer.ts`
- `shiplog-worker/src/svg/themes/branded.ts`
- `shiplog-worker/src/svg/themes/github.ts`
- `shiplog-worker/src/svg/themes/index.ts`
- `shiplog-worker/src/svg/themes/minimal.ts`
- `shiplog-worker/src/svg/themes/types.ts`
- `shiplog-worker/src/svg/xml.ts`
- `shiplog-worker/src/types.ts`
- `shiplog-worker/tsconfig.json`
- `shiplog-worker/wrangler.jsonc`
- `shiplog/.gitignore`
- `shiplog/LICENSE`
- `shiplog/README.md`
- `shiplog/STYLES.md`
- `shiplog/USAGE.md`
- `shiplog/data/pricing-snapshot.json`
- `shiplog/docs/mcp-config.md`
- `shiplog/package-lock.json`
- `shiplog/package.json`
- `shiplog/src/card/format.ts`
- `shiplog/src/card/git.ts`
- `shiplog/src/card/index.ts`
- `shiplog/src/card/layouts/classic.ts`
- `shiplog/src/card/layouts/compact.ts`
- `shiplog/src/card/layouts/hero.ts`
- `shiplog/src/card/preview.ts`
- `shiplog/src/card/renderer.ts`
- `shiplog/src/card/themes/branded.ts`
- `shiplog/src/card/themes/github.ts`
- `shiplog/src/card/themes/index.ts`
- `shiplog/src/card/themes/minimal.ts`
- `shiplog/src/card/themes/types.ts`
- `shiplog/src/card/xml.ts`
- `shiplog/src/cli/args.ts`
- `shiplog/src/cli/commands/card.ts`
- `shiplog/src/cli/commands/costs.ts`
- `shiplog/src/cli/commands/login.ts`
- `shiplog/src/cli/commands/summary.ts`
- `shiplog/src/cli/commands/sync.ts`
- `shiplog/src/cli/config.ts`
- `shiplog/src/cli/format.ts`
- `shiplog/src/cli/index.ts`
- `shiplog/src/cli/safestats.ts`
- `shiplog/src/engine/aggregator.ts`
- `shiplog/src/engine/cost.ts`
- `shiplog/src/engine/dailyAggregator.ts`
- `shiplog/src/engine/filter.ts`
- `shiplog/src/engine/index.ts`
- `shiplog/src/engine/types.ts`
- `shiplog/src/index.ts`
- `shiplog/src/mcp/server.ts`
- `shiplog/src/mcp/tools/card.ts`
- `shiplog/src/mcp/tools/costs.ts`
- `shiplog/src/mcp/tools/summary.ts`
- `shiplog/src/parser/deduplicator.ts`
- `shiplog/src/parser/index.ts`
- `shiplog/src/parser/reader.ts`
- `shiplog/src/parser/schema.ts`
- `shiplog/tsconfig.json`

---

**Branch:** develop
**Impact:** HIGH
**Source:** gsd-changelog-hook (auto-generated)
