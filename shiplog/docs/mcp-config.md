# MCP Configuration

Add shipcard as an MCP server in Claude Code or Cursor to access your analytics from within any conversation.

## Claude Code

Add to `.mcp.json` in your project root (project-scoped) or `~/.claude.json` (global):

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

## Cursor

Add to `~/.cursor/mcp.json`:

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

## After global install

If you install shipcard globally (`npm install -g @jjaimealeman/shipcard`), you can use the direct binary instead of npx:

```json
{
  "mcpServers": {
    "shipcard": {
      "command": "shipcard-mcp"
    }
  }
}
```

## Why `-y` is required

The `-y` flag tells npx to install the package automatically without prompting. Without it, npx may pause to ask for confirmation, which corrupts the MCP stdio transport — the server and client communicate over stdin/stdout, so any interactive prompt breaks the protocol.

## Available tools

Once configured, the following tools are available to your AI assistant:

| Tool | Description |
|------|-------------|
| `shipcard:summary` | Sessions, tool calls, models used, projects, and estimated cost overview |
| `shipcard:costs` | Cost breakdown by project and by model |
| `shipcard:card` | Raw analytics data for SVG card generation |

## Example usage

After adding the MCP config and restarting your editor, you can ask your assistant:

- "Show me my Claude Code usage for the past 30 days"
- "What's my total cost breakdown by project?"
- "How many tool calls did I make today?"
