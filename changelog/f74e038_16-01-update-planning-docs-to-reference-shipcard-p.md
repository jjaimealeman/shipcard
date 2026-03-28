# 2026-03-28 - docs(16-01): update planning docs to reference shipcard/ paths

**Keywords:** [docs] [auto-generated]
**Commit:** f74e038

## What Changed

 .planning/ROADMAP.md                               |   2 +-
 .planning/phases/01-parser-engine/01-01-PLAN.md    |  46 +++---
 .planning/phases/01-parser-engine/01-01-SUMMARY.md |  20 +--
 .planning/phases/01-parser-engine/01-02-PLAN.md    |  48 +++----
 .planning/phases/01-parser-engine/01-02-SUMMARY.md |  18 +--
 .planning/phases/01-parser-engine/01-03-PLAN.md    |  40 +++---
 .planning/phases/01-parser-engine/01-03-SUMMARY.md |  22 +--
 .planning/phases/01-parser-engine/01-CONTEXT.md    |   2 +-
 .planning/phases/01-parser-engine/01-RESEARCH.md   |   8 +-
 .../phases/01-parser-engine/01-VERIFICATION.md     |  18 +--
 .planning/phases/02-mcp-cli/02-01-PLAN.md          |  66 ++++-----
 .planning/phases/02-mcp-cli/02-01-SUMMARY.md       |  30 ++--
 .planning/phases/02-mcp-cli/02-02-PLAN.md          |  68 ++++-----
 .planning/phases/02-mcp-cli/02-02-SUMMARY.md       |  28 ++--
 .planning/phases/02-mcp-cli/02-03-PLAN.md          |  44 +++---
 .planning/phases/02-mcp-cli/02-03-SUMMARY.md       |   8 +-
 .planning/phases/02-mcp-cli/02-RESEARCH.md         |   4 +-
 .planning/phases/02-mcp-cli/02-VERIFICATION.md     |  32 ++---
 .planning/phases/03-svg-card/03-01-SUMMARY.md      |  50 +++----
 .planning/phases/03-svg-card/03-02-SUMMARY.md      |  22 +--
 .planning/phases/03-svg-card/03-RESEARCH.md        |   2 +-
 .planning/phases/03-svg-card/03-VERIFICATION.md    |  34 ++---
 .planning/phases/04-cloud-worker/04-01-PLAN.md     | 156 ++++++++++-----------
 .planning/phases/04-cloud-worker/04-01-SUMMARY.md  |  78 +++++------
 .planning/phases/04-cloud-worker/04-02-PLAN.md     |  52 +++----
 .planning/phases/04-cloud-worker/04-02-SUMMARY.md  |  22 +--
 .planning/phases/04-cloud-worker/04-03-PLAN.md     | 118 ++++++++--------
 .planning/phases/04-cloud-worker/04-03-SUMMARY.md  |  56 ++++----
 .planning/phases/04-cloud-worker/04-CONTEXT.md     |   4 +-
 .planning/phases/04-cloud-worker/04-RESEARCH.md    |  14 +-
 .../phases/04-cloud-worker/04-VERIFICATION.md      |  30 ++--
 .planning/phases/05-publish-launch/05-01-PLAN.md   | 134 +++++++++---------
 .../phases/05-publish-launch/05-01-SUMMARY.md      |  90 ++++++------
 .planning/phases/05-publish-launch/05-02-PLAN.md   |  30 ++--
 .../phases/05-publish-launch/05-02-SUMMARY.md      |  26 ++--
 .planning/phases/05-publish-launch/05-03-PLAN.md   |   4 +-
 .planning/phases/05-publish-launch/05-04-PLAN.md   |  16 +--
 .planning/phases/05-publish-launch/05-RESEARCH.md  |  12 +-
 .../phases/06-worker-card-params/06-01-SUMMARY.md  |  12 +-
 .../06-worker-card-params/06-01-VERIFICATION.md    |   8 +-
 .../phases/06-worker-card-params/06-RESEARCH.md    |  22 +--
 .planning/phases/07-auth-verify-docs/07-01-PLAN.md |  30 ++--
 .../phases/07-auth-verify-docs/07-01-SUMMARY.md    |   6 +-
 .../phases/07-auth-verify-docs/07-RESEARCH.md      |  18 +--
 .../phases/07-auth-verify-docs/07-VERIFICATION.md  |  22 +--
 .planning/phases/08-landing-page/08-01-PLAN.md     |  36 ++---
 .planning/phases/08-landing-page/08-01-SUMMARY.md  |  12 +-
 .planning/phases/08-landing-page/08-RESEARCH.md    |  10 +-
 .../phases/08-landing-page/08-VERIFICATION.md      |   4 +-
 .planning/phases/09-cli-time-series/09-01-PLAN.md  |  46 +++---
 .../phases/09-cli-time-series/09-01-SUMMARY.md     |   8 +-
 .planning/phases/09-cli-time-series/09-02-PLAN.md  |  54 +++----
 .../phases/09-cli-time-series/09-02-SUMMARY.md     |  20 +--
 .planning/phases/09-cli-time-series/09-RESEARCH.md |  20 +--
 .../phases/09-cli-time-series/09-VERIFICATION.md   |  16 +--
 .../10-worker-v2-sync-json-api/10-01-PLAN.md       |  62 ++++----
 .../10-worker-v2-sync-json-api/10-01-SUMMARY.md    |  16 +--
 .../10-worker-v2-sync-json-api/10-02-PLAN.md       |  36 ++---
 .../10-worker-v2-sync-json-api/10-02-SUMMARY.md    |  10 +-
 .../10-worker-v2-sync-json-api/10-RESEARCH.md      |  12 +-
 .../10-worker-v2-sync-json-api/10-VERIFICATION.md  |  10 +-
 .planning/phases/11-dashboard-mvp/11-01-PLAN.md    |  44 +++---
 .planning/phases/11-dashboard-mvp/11-01-SUMMARY.md |   8 +-
 .planning/phases/11-dashboard-mvp/11-02-PLAN.md    |  20 +--
 .planning/phases/11-dashboard-mvp/11-02-SUMMARY.md |   4 +-
 .planning/phases/11-dashboard-mvp/11-03-PLAN.md    |  14 +-
 .planning/phases/11-dashboard-mvp/11-03-SUMMARY.md |   6 +-
 .planning/phases/11-dashboard-mvp/11-RESEARCH.md   |  14 +-
 .../phases/11-dashboard-mvp/11-VERIFICATION.md     |   6 +-
 .planning/phases/12-polish-community/12-01-PLAN.md |  52 +++----
 .../phases/12-polish-community/12-01-SUMMARY.md    |  36 ++---
 .planning/phases/12-polish-community/12-02-PLAN.md |   8 +-
 .../phases/12-polish-community/12-02-SUMMARY.md    |   4 +-
 .planning/phases/12-polish-community/12-03-PLAN.md |  22 +--
 .../phases/12-polish-community/12-03-SUMMARY.md    |  16 +--
 .planning/phases/12-polish-community/12-04-PLAN.md |  20 +--
 .../phases/12-polish-community/12-04-SUMMARY.md    |  12 +-
 .../phases/12-polish-community/12-RESEARCH.md      |  14 +-
 .../phases/12-polish-community/12-VERIFICATION.md  |  14 +-
 .../phases/13-data-pipeline-cleanup/13-01-PLAN.md  |  38 ++---
 .../13-data-pipeline-cleanup/13-01-SUMMARY.md      |  20 +--
 .../phases/13-data-pipeline-cleanup/13-02-PLAN.md  |  38 ++---
 .../13-data-pipeline-cleanup/13-02-SUMMARY.md      |  12 +-
 .../phases/13-data-pipeline-cleanup/13-RESEARCH.md |  44 +++---
 .../13-data-pipeline-cleanup/13-VERIFICATION.md    |  14 +-
 .planning/phases/14-hero-section/14-01-PLAN.md     |  16 +--
 .planning/phases/14-hero-section/14-01-SUMMARY.md  |   4 +-
 .planning/phases/14-hero-section/14-02-PLAN.md     |  16 +--
 .planning/phases/14-hero-section/14-02-SUMMARY.md  |   4 +-
 .planning/phases/14-hero-section/14-RESEARCH.md    |   8 +-
 .../phases/14-hero-section/14-VERIFICATION.md      |   2 +-
 .planning/phases/15-project-activity/15-01-PLAN.md |  10 +-
 .../phases/15-project-activity/15-01-SUMMARY.md    |   4 +-
 .../15-project-activity/15-01-VERIFICATION.md      |   2 +-
 .../16-agent-agnostic-architecture/16-01-PLAN.md   |  48 +++----
 .../16-agent-agnostic-architecture/16-CONTEXT.md   |   4 +-
 .../16-agent-agnostic-architecture/16-RESEARCH.md  |  20 +--
 .planning/research/ARCHITECTURE.md                 |  60 ++++----
 .planning/research/STACK.md                        |  38 ++---
 .planning/research/SUMMARY.md                      |   6 +-
 100 files changed, 1333 insertions(+), 1333 deletions(-)

## Files

- `.planning/ROADMAP.md`
- `.planning/phases/01-parser-engine/01-01-PLAN.md`
- `.planning/phases/01-parser-engine/01-01-SUMMARY.md`
- `.planning/phases/01-parser-engine/01-02-PLAN.md`
- `.planning/phases/01-parser-engine/01-02-SUMMARY.md`
- `.planning/phases/01-parser-engine/01-03-PLAN.md`
- `.planning/phases/01-parser-engine/01-03-SUMMARY.md`
- `.planning/phases/01-parser-engine/01-CONTEXT.md`
- `.planning/phases/01-parser-engine/01-RESEARCH.md`
- `.planning/phases/01-parser-engine/01-VERIFICATION.md`
- `.planning/phases/02-mcp-cli/02-01-PLAN.md`
- `.planning/phases/02-mcp-cli/02-01-SUMMARY.md`
- `.planning/phases/02-mcp-cli/02-02-PLAN.md`
- `.planning/phases/02-mcp-cli/02-02-SUMMARY.md`
- `.planning/phases/02-mcp-cli/02-03-PLAN.md`
- `.planning/phases/02-mcp-cli/02-03-SUMMARY.md`
- `.planning/phases/02-mcp-cli/02-RESEARCH.md`
- `.planning/phases/02-mcp-cli/02-VERIFICATION.md`
- `.planning/phases/03-svg-card/03-01-SUMMARY.md`
- `.planning/phases/03-svg-card/03-02-SUMMARY.md`
- `.planning/phases/03-svg-card/03-RESEARCH.md`
- `.planning/phases/03-svg-card/03-VERIFICATION.md`
- `.planning/phases/04-cloud-worker/04-01-PLAN.md`
- `.planning/phases/04-cloud-worker/04-01-SUMMARY.md`
- `.planning/phases/04-cloud-worker/04-02-PLAN.md`
- `.planning/phases/04-cloud-worker/04-02-SUMMARY.md`
- `.planning/phases/04-cloud-worker/04-03-PLAN.md`
- `.planning/phases/04-cloud-worker/04-03-SUMMARY.md`
- `.planning/phases/04-cloud-worker/04-CONTEXT.md`
- `.planning/phases/04-cloud-worker/04-RESEARCH.md`
- `.planning/phases/04-cloud-worker/04-VERIFICATION.md`
- `.planning/phases/05-publish-launch/05-01-PLAN.md`
- `.planning/phases/05-publish-launch/05-01-SUMMARY.md`
- `.planning/phases/05-publish-launch/05-02-PLAN.md`
- `.planning/phases/05-publish-launch/05-02-SUMMARY.md`
- `.planning/phases/05-publish-launch/05-03-PLAN.md`
- `.planning/phases/05-publish-launch/05-04-PLAN.md`
- `.planning/phases/05-publish-launch/05-RESEARCH.md`
- `.planning/phases/06-worker-card-params/06-01-SUMMARY.md`
- `.planning/phases/06-worker-card-params/06-01-VERIFICATION.md`
- `.planning/phases/06-worker-card-params/06-RESEARCH.md`
- `.planning/phases/07-auth-verify-docs/07-01-PLAN.md`
- `.planning/phases/07-auth-verify-docs/07-01-SUMMARY.md`
- `.planning/phases/07-auth-verify-docs/07-RESEARCH.md`
- `.planning/phases/07-auth-verify-docs/07-VERIFICATION.md`
- `.planning/phases/08-landing-page/08-01-PLAN.md`
- `.planning/phases/08-landing-page/08-01-SUMMARY.md`
- `.planning/phases/08-landing-page/08-RESEARCH.md`
- `.planning/phases/08-landing-page/08-VERIFICATION.md`
- `.planning/phases/09-cli-time-series/09-01-PLAN.md`
- `.planning/phases/09-cli-time-series/09-01-SUMMARY.md`
- `.planning/phases/09-cli-time-series/09-02-PLAN.md`
- `.planning/phases/09-cli-time-series/09-02-SUMMARY.md`
- `.planning/phases/09-cli-time-series/09-RESEARCH.md`
- `.planning/phases/09-cli-time-series/09-VERIFICATION.md`
- `.planning/phases/10-worker-v2-sync-json-api/10-01-PLAN.md`
- `.planning/phases/10-worker-v2-sync-json-api/10-01-SUMMARY.md`
- `.planning/phases/10-worker-v2-sync-json-api/10-02-PLAN.md`
- `.planning/phases/10-worker-v2-sync-json-api/10-02-SUMMARY.md`
- `.planning/phases/10-worker-v2-sync-json-api/10-RESEARCH.md`
- `.planning/phases/10-worker-v2-sync-json-api/10-VERIFICATION.md`
- `.planning/phases/11-dashboard-mvp/11-01-PLAN.md`
- `.planning/phases/11-dashboard-mvp/11-01-SUMMARY.md`
- `.planning/phases/11-dashboard-mvp/11-02-PLAN.md`
- `.planning/phases/11-dashboard-mvp/11-02-SUMMARY.md`
- `.planning/phases/11-dashboard-mvp/11-03-PLAN.md`
- `.planning/phases/11-dashboard-mvp/11-03-SUMMARY.md`
- `.planning/phases/11-dashboard-mvp/11-RESEARCH.md`
- `.planning/phases/11-dashboard-mvp/11-VERIFICATION.md`
- `.planning/phases/12-polish-community/12-01-PLAN.md`
- `.planning/phases/12-polish-community/12-01-SUMMARY.md`
- `.planning/phases/12-polish-community/12-02-PLAN.md`
- `.planning/phases/12-polish-community/12-02-SUMMARY.md`
- `.planning/phases/12-polish-community/12-03-PLAN.md`
- `.planning/phases/12-polish-community/12-03-SUMMARY.md`
- `.planning/phases/12-polish-community/12-04-PLAN.md`
- `.planning/phases/12-polish-community/12-04-SUMMARY.md`
- `.planning/phases/12-polish-community/12-RESEARCH.md`
- `.planning/phases/12-polish-community/12-VERIFICATION.md`
- `.planning/phases/13-data-pipeline-cleanup/13-01-PLAN.md`
- `.planning/phases/13-data-pipeline-cleanup/13-01-SUMMARY.md`
- `.planning/phases/13-data-pipeline-cleanup/13-02-PLAN.md`
- `.planning/phases/13-data-pipeline-cleanup/13-02-SUMMARY.md`
- `.planning/phases/13-data-pipeline-cleanup/13-RESEARCH.md`
- `.planning/phases/13-data-pipeline-cleanup/13-VERIFICATION.md`
- `.planning/phases/14-hero-section/14-01-PLAN.md`
- `.planning/phases/14-hero-section/14-01-SUMMARY.md`
- `.planning/phases/14-hero-section/14-02-PLAN.md`
- `.planning/phases/14-hero-section/14-02-SUMMARY.md`
- `.planning/phases/14-hero-section/14-RESEARCH.md`
- `.planning/phases/14-hero-section/14-VERIFICATION.md`
- `.planning/phases/15-project-activity/15-01-PLAN.md`
- `.planning/phases/15-project-activity/15-01-SUMMARY.md`
- `.planning/phases/15-project-activity/15-01-VERIFICATION.md`
- `.planning/phases/16-agent-agnostic-architecture/16-01-PLAN.md`
- `.planning/phases/16-agent-agnostic-architecture/16-CONTEXT.md`
- `.planning/phases/16-agent-agnostic-architecture/16-RESEARCH.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/STACK.md`
- `.planning/research/SUMMARY.md`

---

**Branch:** develop
**Impact:** HIGH
**Source:** gsd-changelog-hook (auto-generated)
