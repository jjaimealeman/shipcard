# ShipCard Usage Reference

Full reference for CLI commands and MCP tools.

---

## CLI Commands

### `shipcard summary`

Shows a terminal overview: total sessions, token counts (input/output/cache), estimated cost, models used, projects touched, and top tool calls.

```sh
shipcard summary
shipcard summary --since 30d
shipcard summary --since 2026-01-01 --until 2026-02-01
shipcard summary --json
```

**Flags:**

| Flag              | Description                                                               |
| ----------------- | ------------------------------------------------------------------------- |
| `--since <date>`  | Filter from this date (inclusive). ISO 8601 or relative: `7d`, `30d`, `today` |
| `--until <date>`  | Filter up to this date (exclusive). ISO 8601 or relative               |
| `--json`          | Output raw JSON instead of formatted table                                |
| `--color`         | Enable ANSI color output (respects `~/.shipcard.json` config too)         |

---

### `shipcard costs`

Shows cost breakdown by project and by model — useful for identifying where spending is concentrated.

```sh
shipcard costs
shipcard costs --since 7d
shipcard costs --json
```

**Flags:**

| Flag              | Description                                                               |
| ----------------- | ------------------------------------------------------------------------- |
| `--since <date>`  | Filter from this date (inclusive)                                         |
| `--until <date>`  | Filter up to this date (exclusive)                                        |
| `--json`          | Output raw JSON instead of formatted table                                |

---

### `shipcard card`

Generates a local SVG stats card and prints a markdown embed snippet. Without `--local`, outputs raw JSON.

```sh
shipcard card --local
shipcard card --local --layout hero --theme light --style minimal
shipcard card --local --hide cost --hide models
shipcard card --local --preview
shipcard card --local -o ./assets/card.svg
shipcard card --json
```

**Flags:**

| Flag                    | Description                                                              |
| ----------------------- | ------------------------------------------------------------------------ |
| `--local`               | Generate SVG file (default output: `./shipcard-card.svg` at git root)   |
| `--layout <name>`       | Card layout: `classic` (default), `compact`, `hero`                     |
| `--style <name>`        | Visual style: `github` (default), `branded`, `minimal`                  |
| `--theme <name>`        | Color theme: `dark` (default), `light`                                  |
| `--hide <stat>`         | Hide a stat row. Repeatable. Values: `sessions`, `toolCalls`, `models`, `projects`, `cost` |
| `--hero-stat <key>`     | Stat to feature in hero layout (default: `sessions`)                    |
| `--preview`             | Open generated SVG in browser after writing                             |
| `-o, --output <path>`   | Custom output path for the SVG file                                     |
| `--json`                | Output raw analytics JSON instead of generating SVG                     |
| `--since <date>`        | Filter from this date                                                    |
| `--until <date>`        | Filter up to this date                                                   |

---

### `shipcard login`

Authenticates with GitHub using the device flow — no password needed. Opens your browser to github.com/login/device, then exchanges the GitHub access token for a ShipCard bearer token.

Saves credentials to `~/.shipcard/config.json`.

```sh
shipcard login
```

After running, you'll see:

```
Open this URL in your browser:
  https://github.com/login/device

Enter this code when prompted:
  ABCD-1234

Logged in as yourname
```

---

### `shipcard sync`

Pushes aggregated stats to shipcard.dev and generates your embeddable card URL.

**Privacy:** Only aggregated stats are uploaded — no file paths, project names, or raw JSONL data.

```sh
shipcard sync             # preview payload + open browser configurator
shipcard sync --confirm   # non-interactive sync with current stats
shipcard sync --delete    # remove all your data from the cloud
```

**Flags:**

| Flag        | Description                                                         |
| ----------- | ------------------------------------------------------------------- |
| `--confirm` | Skip interactive preview, sync immediately                          |
| `--delete`  | Delete all your synced data from the cloud (token is preserved)    |
| `--since`   | Filter stats by start date before syncing                          |
| `--until`   | Filter stats by end date before syncing                            |

After `--confirm`, you'll receive:

```
Card synced! View at:
  https://shipcard.dev/u/yourname

Markdown:
  ![ShipCard Stats](https://shipcard.dev/u/yourname)
```

---

### Global Flags

| Flag             | Description                        |
| ---------------- | ---------------------------------- |
| `--help`, `-h`   | Show help text                     |
| `--version`      | Show version number                |

---

## MCP Tools

Add shipcard to Claude Code and ask about your stats in any conversation.

**Setup** (`.claude/settings.json` or `~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "shipcard": {
      "command": "npx",
      "args": ["-y", "-p", "@jjaimealeman/shipcard", "shipcard-mcp"]
    }
  }
}
```

---

### `shipcard:summary`

Returns session overview: total sessions, token counts, cost, models used, projects touched, and tool call counts. Reads directly from `~/.claude/projects/` on the local machine.

**Parameters:**

| Parameter | Type   | Required | Description                                                      |
| --------- | ------ | -------- | ---------------------------------------------------------------- |
| `since`   | string | No       | Start date (inclusive). ISO 8601 or relative: `7d`, `30d`, `today` |
| `until`   | string | No       | End date (exclusive). ISO 8601 or relative                      |

**Example usage in Claude:**
> "How many sessions have I had this month?"
> "What's my total Claude spend since January?"

**Returns:** JSON with `summary` object (totalSessions, tokenCounts, totalCost, modelsUsed, toolCallCounts, projectsCount).

---

### `shipcard:costs`

Returns cost breakdown by project and by model — useful for identifying which projects or models are driving spend.

**Parameters:**

| Parameter | Type   | Required | Description                          |
| --------- | ------ | -------- | ------------------------------------ |
| `since`   | string | No       | Start date (inclusive)               |
| `until`   | string | No       | End date (exclusive)                 |

**Example usage in Claude:**
> "Which project cost the most last week?"
> "Compare my spending across models."

**Returns:** JSON with `byProject` and `byModel` arrays, each with name and cost fields.

---

### `shipcard:card`

Returns the full analytics result used for card generation — includes summary, per-project costs, per-model costs, and metadata.

**Parameters:**

| Parameter | Type   | Required | Description                          |
| --------- | ------ | -------- | ------------------------------------ |
| `since`   | string | No       | Start date (inclusive)               |
| `until`   | string | No       | End date (exclusive)                 |

**Example usage in Claude:**
> "Generate my stats card data for the last 30 days."

**Returns:** Full `AnalyticsResult` JSON (summary + byProject + byModel + meta).

---

## Configuration

### Display Config: `~/.shipcard.json`

Controls color output mode:

```json
{
  "color": true
}
```

| Field   | Type    | Default | Description                           |
| ------- | ------- | ------- | ------------------------------------- |
| `color` | boolean | `false` | Enable ANSI color in terminal output  |

---

### Auth Config: `~/.shipcard/config.json`

Written by `shipcard login`. Do not edit manually.

```json
{
  "username": "yourname",
  "token": "opaque-bearer-token",
  "workerUrl": "https://shipcard.dev"
}
```

| Field       | Description                                                    |
| ----------- | -------------------------------------------------------------- |
| `username`  | GitHub username (set at login)                                 |
| `token`     | ShipCard bearer token for sync requests                        |
| `workerUrl` | Worker base URL (defaults to `https://shipcard.dev`)           |

---

## Date Filter Reference

Both `--since` / `--until` flags and MCP tool parameters accept:

| Format      | Example         | Meaning                        |
| ----------- | --------------- | ------------------------------ |
| ISO date    | `2026-01-15`    | Specific calendar date          |
| Relative    | `7d`            | Last 7 days                    |
| Relative    | `30d`           | Last 30 days                   |
| Relative    | `today`         | From midnight today            |

`since` is inclusive (>=), `until` is exclusive (<).
