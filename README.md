# shipcard

<img src="https://shipcard.dev/u/jjaimealeman" alt="ShipCard Stats" width="495" />

See what you shipped. Share the proof.

Reads your Claude Code JSONL files, calculates sessions, tokens, cost, and models used — then generates an embeddable SVG stats card for your README.

---

## Quick Start

```sh
npm install -g @jjaimealeman/shipcard

shipcard summary          # terminal overview
shipcard card --local     # generate SVG card
shipcard login            # authenticate with GitHub
shipcard sync             # push stats to shipcard.dev
```

Or without installing:

```sh
npx shipcard summary
```

---

## Embed Your Card

After syncing, add this to your README:

```markdown
![ShipCard](https://shipcard.dev/u/YOUR_USERNAME)
```

Or with HTML for consistent width:

```html
<img src="https://shipcard.dev/u/YOUR_USERNAME" alt="ShipCard" width="495" />
```

Customize layout, theme, and style at [shipcard.dev](https://shipcard.dev) — or pass query params directly:

```
https://shipcard.dev/u/YOUR_USERNAME?layout=hero&theme=light&style=minimal
```

---

## MCP Config

Ask Claude about your coding stats from inside Claude Code:

```json
{
  "mcpServers": {
    "shipcard": {
      "command": "npx",
      "args": ["-y", "-p", "shipcard", "shipcard-mcp"]
    }
  }
}
```

Add to `.claude/settings.json` (project) or `~/.claude/settings.json` (global). Then use tools `shipcard:summary`, `shipcard:costs`, and `shipcard:card` in any conversation.

---

## CLI

| Command            | What it does                                     |
| ------------------ | ------------------------------------------------ |
| `shipcard summary` | Sessions, tokens, cost, models, tool call counts |
| `shipcard costs`   | Cost breakdown by project and model              |
| `shipcard card`    | Generate SVG card (`--local`) or preview JSON    |
| `shipcard login`   | Authenticate via GitHub device flow              |
| `shipcard sync`    | Push stats to cloud, get embeddable URL          |

See [USAGE.md](USAGE.md) for full flag reference.

---

## Card Styles

3 layouts × 3 styles × 2 themes = 18 combinations.

See [STYLES.md](STYLES.md) for the full gallery.

---

MIT License
