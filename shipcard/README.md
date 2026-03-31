<p align="center">
  <img src="https://shipcard.dev/u/jjaimealeman?theme=dark&layout=hero&style=branded" width="495" alt="ShipCard Stats" />
</p>

<h3 align="center">Analytics for Claude Code developers</h3>

<p align="center">
  See what you shipped. See what it cost. Prove it with an embeddable card.
</p>

---

## Quick Start

```bash
npx shipcard summary              # see your stats
npx shipcard card --local         # generate SVG card
npx shipcard login                # authenticate with GitHub
npx shipcard sync --confirm       # sync to cloud, get embeddable URL
```

## Embed Your Card

**Markdown:**
```markdown
![ShipCard Stats](https://shipcard.dev/u/YOUR_USERNAME)
```

**HTML:**
```html
<img src="https://shipcard.dev/u/YOUR_USERNAME" alt="ShipCard Stats" />
```

**Customize with query params:**
```
?theme=dark&layout=hero&style=branded&hide=cost
```

## Dashboard

After syncing, view your full analytics dashboard at:

```
https://shipcard.dev/u/YOUR_USERNAME/dashboard
```

## MCP Server

Add to your Claude Code config (`~/.claude.json`):

```json
{
  "mcpServers": {
    "shipcard": {
      "command": "npx",
      "args": ["-y", "shipcard", "mcp"]
    }
  }
}
```

Tools: `shipcard:summary`, `shipcard:costs`, `shipcard:card`

## CLI Commands

| Command | Description |
|---------|-------------|
| `shipcard summary` | Sessions, tokens, models, cost, tool calls |
| `shipcard costs` | Cost breakdown by project and model |
| `shipcard card` | Generate SVG stats card |
| `shipcard login` | Authenticate with GitHub |
| `shipcard sync` | Sync stats to cloud |

See [USAGE.md](USAGE.md) for full flag reference. See [STYLES.md](STYLES.md) for card style gallery.

## Data Source & Limitations

ShipCard reads Claude Code's local JSONL session files. These files are an internal, undocumented format maintained by Anthropic — the schema has changed over time and may change again.

**What this means:**
- Data only goes back as far as the current JSONL format. Older sessions written in previous formats may not be parseable.
- The parser is designed to be resilient — unknown fields are ignored, not crashed on.
- Token counts and cost estimates are approximate, based on publicly available pricing.

**JSONL file locations:**

| Platform | Path |
|----------|------|
| Linux | `~/.claude/projects/` |
| macOS | `~/.claude/projects/` |
| Windows | `%USERPROFILE%\.claude\projects\` |

You can inspect these files yourself — they're plain JSON Lines, one entry per line.

## Privacy

- **Local-first**: nothing leaves your machine unless you run `shipcard sync`
- **Opt-in cloud**: you choose what to share, and can preview the exact payload before syncing
- **No raw data uploaded**: only aggregated stats (session counts, token totals, cost estimates)
- **Project names hidden by default**: use `--show-projects` to explicitly include them
- **Delete anytime**: `shipcard sync --delete` wipes all your cloud data

## License

MIT

---

<p align="center">
  <a href="https://shipcard.dev">shipcard.dev</a>
</p>
