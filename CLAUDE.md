# ShipCard

Analytics layer for agentic developers. Local MCP server + CLI reads Claude Code JSONL files, Cloudflare Worker serves embeddable SVG stats cards.

## Project Structure

```
.planning/          # GSD planning docs (PROJECT, REQUIREMENTS, ROADMAP, STATE)
.planning/research/ # Domain research (STACK, FEATURES, ARCHITECTURE, PITFALLS)
.planning/config.json # Workflow preferences
PRD.md              # Product Requirements Document
```

## Tech Stack

- **Local tool:** Node.js / TypeScript, MCP SDK, published to npm
- **Card endpoint:** Cloudflare Worker + KV, SVG template engine
- **Future platform:** Cloudflare Pages + D1 + KV + R2

## Key Constraints

- Zero external deps beyond MCP SDK for local tool
- Privacy-first: no raw JSONL upload, only aggregated user-approved stats
- MIT licensed
- Alpha scope: 3 MCP tools + 5 CLI commands + 1 card endpoint

## Git

- Git flow: `main` + `develop`
- Commit freely on `develop` during planning and early development
- Feature branches when work gets more complex
- Never push — user handles via lazygit

## Versioning

- All packages (shiplog/, shiplog-worker/) share the same version number
- Bump both package.json files together on every release
- Version reflects the project milestone (v1.0 = 1.0.0, v2.0 = 2.0.0)

## Banned

- Vercel for card endpoint — use Cloudflare Workers
