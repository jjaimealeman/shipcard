# ShipCard — Full Usage Reference

## CLI Commands

### `shipcard summary`

Show session overview: sessions, tokens, models, cost, tool calls.

```bash
shipcard summary                          # all time
shipcard summary --since 30d              # last 30 days
shipcard summary --since 2026-01-01       # since date
shipcard summary --since 7d --json        # JSON output
shipcard summary --since 2026-01-01 --until 2026-02-01
```

**Flags:**
| Flag | Description |
|------|-------------|
| `--json` | Output raw JSON instead of formatted table |
| `--since <date>` | Start date (ISO: `2026-01-01`, relative: `7d`, `30d`, `today`) |
| `--until <date>` | End date (same format as --since) |
| `--color` | Force ANSI color output |

### `shipcard costs`

Show cost breakdown by project and by model.

```bash
shipcard costs                            # all time
shipcard costs --since 30d                # last 30 days
shipcard costs --json                     # JSON output
```

**Flags:** Same as `summary` (`--json`, `--since`, `--until`, `--color`)

### `shipcard card`

Generate SVG stats card for your README.

```bash
shipcard card --local                     # generate SVG file
shipcard card --local --preview           # generate and open in browser
shipcard card --local --layout compact --style branded --theme light
shipcard card --local --hide cost         # hide cost stat
shipcard card --local -o ~/my-card.svg    # custom output path
```

**Flags:**
| Flag | Description |
|------|-------------|
| `--local` | Generate SVG card file (without this, outputs raw JSON) |
| `--layout <name>` | `classic` (default), `compact`, `hero` |
| `--style <name>` | `github` (default), `branded`, `minimal` |
| `--theme <name>` | `dark` (default), `light` |
| `--hide <stat>` | Hide a stat: `sessions`, `toolCalls`, `models`, `projects`, `cost` |
| `--hero-stat <key>` | Hero stat for hero layout (default: `sessions`) |
| `--preview` | Open card in browser after generation |
| `-o, --output` | Custom output path (default: repo root/shipcard-card.svg) |
| `--since`, `--until` | Date filters (same as summary) |

### `shipcard login`

Authenticate with GitHub using device flow (no browser redirect needed).

```bash
shipcard login
```

Prints a code, you enter it at github.com/login/device, and authentication completes automatically.

### `shipcard sync`

Sync your stats to the cloud and get an embeddable card URL.

```bash
shipcard sync                             # preview payload + open configurator
shipcard sync --confirm                   # sync with defaults
shipcard sync --confirm --show-projects   # sync with project names included
shipcard sync --delete                    # wipe all cloud data
```

**Flags:**
| Flag | Description |
|------|-------------|
| `--confirm` | Non-interactive sync (required to actually upload) |
| `--delete` | Remove all your data from the cloud |
| `--show-projects` | Include project names (last path segment only) |
| `--since`, `--until` | Date filters for the sync payload |

**Important:** `shipcard sync` without `--confirm` only previews — it does NOT upload. You need `--confirm` to actually sync.

---

## MCP Server Tools

### `shipcard:summary`

Returns session overview: total sessions, tokens (input/output/cache), models used, projects, estimated cost.

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `since` | string (optional) | Start date filter |
| `until` | string (optional) | End date filter |

**Example prompt:** "Show me my Claude Code stats for the last 7 days"

### `shipcard:costs`

Returns cost breakdown by project and by model.

**Parameters:** Same as `shipcard:summary`

**Example prompt:** "How much have I spent on Claude Code this month?"

### `shipcard:card`

Generates an SVG stats card with full customization.

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `since` | string (optional) | Start date filter |
| `until` | string (optional) | End date filter |
| `layout` | string (optional) | `classic`, `compact`, `hero` |
| `style` | string (optional) | `github`, `branded`, `minimal` |
| `theme` | string (optional) | `dark`, `light` |
| `hide` | string (optional) | Comma-separated stats to hide |

**Example prompt:** "Generate a dark branded hero card for my README"

---

## Configuration

### Auth config: `~/.shipcard/config.json`

Created automatically by `shipcard login`. Contains:

```json
{
  "username": "your-github-username",
  "token": "your-auth-token"
}
```

### Display config: `~/.shipcard.json`

Optional. Customize default card appearance:

```json
{
  "layout": "hero",
  "style": "branded",
  "theme": "dark"
}
```

---

## Date Filters

Both `--since` and `--until` accept:

| Format | Example | Description |
|--------|---------|-------------|
| ISO date | `2026-01-01` | Specific date |
| Relative days | `7d`, `30d`, `90d` | Days ago from today |
| Keyword | `today` | Current day |

**Range behavior:** `--since` is inclusive (>=), `--until` is exclusive (<). This follows standard analytics conventions.

---

## Cloud Card URL Parameters

Customize your embedded card with query params:

```
https://shipcard.dev/u/USERNAME?theme=dark&layout=hero&style=branded&hide=cost
```

| Param | Values | Default |
|-------|--------|---------|
| `theme` | `dark`, `light` | `dark` |
| `layout` | `classic`, `compact`, `hero` | `classic` |
| `style` | `github`, `branded`, `minimal` | `github` |
| `hide` | `sessions`, `toolCalls`, `models`, `projects`, `cost` | (none) |
