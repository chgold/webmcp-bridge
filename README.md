# webmcp-bridge

MCP bridge for WebMCP-compliant servers — use any WebMCP site as a Claude Desktop MCP server.

This package acts as a client-side MCP server that connects Claude Desktop (or any MCP stdio client) to any WebMCP-compliant REST API server, without requiring any changes to the server side.

## Installation

Install globally:
```bash
npm install -g webmcp-bridge
```

Or use directly with npx:
```bash
npx webmcp-bridge --manifest <url> --token <token>
```

## Usage

```bash
webmcp-bridge --manifest <url> --token <bearer_token> [--name <server_name>]
```

### Options

- `--manifest <url>` — Full URL to WebMCP manifest (required)
- `--token <bearer_token>` — Bearer token for authenticated tool calls (optional — for public tools)
- `--name <server_name>` — Override server name shown in Claude Desktop (optional)

### Example

```bash
webmcp-bridge \
  --manifest https://your-site.com/api/ai-connect/v1/manifest \
  --token "Bearer dpc_your_token_here"
```

## Claude Desktop Configuration

Add to your Claude Desktop config file (`~/.claude_desktop_config.json` on macOS/Linux, or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "my-drupal": {
      "command": "npx",
      "args": [
        "webmcp-bridge",
        "--manifest", "https://your-site.com/api/ai-connect/v1/manifest",
        "--token", "Bearer dpc_your_token_here"
      ]
    }
  }
}
```

Then restart Claude Desktop. The server will appear in the MCP section.

## How It Works

1. **Fetch Manifest** — Retrieves the WebMCP manifest from the provided URL (public, no auth required)
2. **Parse Tools** — Extracts tool definitions from `manifest.usage.tools[]`
3. **Expose as MCP** — Presents tools to Claude Desktop via MCP stdio protocol
4. **Forward Calls** — When a tool is called, forwards the request to `manifest.usage.tools_endpoint/<tool_name>` with Bearer token

## WebMCP Compatibility

Works with any WebMCP-compliant server, including:
- Drupal AI Connect module
- Any custom WebMCP implementation

## Getting a Token

Tokens are typically obtained via OAuth flow at the `/ai-connect` endpoint on your site. For Drupal AI Connect, you can generate a test token via drush:

```bash
drush php:eval "
\$t = \Drupal::service('ai_connect.oauth_service')->createAccessToken('ai-agent-default', 1, ['read','write']);
echo \$t['access_token'];
"
```

## Requirements

- Node.js 18 or higher
- Network access to the WebMCP server

## License

MIT
