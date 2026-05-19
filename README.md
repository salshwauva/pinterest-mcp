# claude-pinterest

Pinterest MCP server with full read and write access to pins, boards, board sections, search, and analytics. Talks to the Pinterest REST API v5 directly over HTTPS, no JDBC driver required.

## Tools

### Pins
`create_pin`, `get_pin`, `list_pins`, `update_pin`, `delete_pin`

### Boards and sections
`create_board`, `get_board`, `list_boards`, `update_board`, `delete_board`, `list_board_pins`, `create_board_section`, `list_board_sections`, `update_board_section`, `delete_board_section`, `list_board_section_pins`

### Search
`search_user_pins`, `search_user_boards`

### Analytics and account
`get_pin_analytics`, `get_user_analytics`, `get_user_account`

## Setup

### 1. Build

```bash
npm install
npm run build
```

### 2. Get a Pinterest access token

1. Go to https://developers.pinterest.com/apps/ and create an app (or open an existing one).
2. Under the app's settings, generate an access token with the scopes:
   `pins:read`, `pins:write`, `boards:read`, `boards:write`, `user_accounts:read`.
3. For analytics, also request `pins:read_secret` and `boards:read_secret` if you need to inspect protected content.
4. Copy the token. Pinterest access tokens last 30 days; refresh tokens last 1 year. When the token expires, generate a new one.

### 3. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) and add:

```json
{
  "mcpServers": {
    "pinterest": {
      "command": "node",
      "args": [
        "/Users/sophia/projects/pinterest-claude MCP/dist/index.js"
      ],
      "env": {
        "PINTEREST_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

Restart Claude Desktop. The `pinterest` server should show as connected in the MCP settings panel.

### 4. Configure Claude Code

```bash
claude mcp add pinterest \
  --env PINTEREST_ACCESS_TOKEN=your_token_here \
  -- node "/Users/sophia/projects/pinterest-claude MCP/dist/index.js"
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `PINTEREST_ACCESS_TOKEN` | Required. Bearer token for the Pinterest v5 API. |
| `PINTEREST_API_BASE` | Optional. Defaults to `https://api.pinterest.com`. Set to `https://api-sandbox.pinterest.com` to hit the sandbox. |

## Example tool calls

Create a board:

```json
{
  "name": "create_board",
  "arguments": {
    "name": "Living room mood board",
    "description": "Mid century modern, warm wood, plants",
    "privacy": "SECRET"
  }
}
```

Create a pin from an image URL:

```json
{
  "name": "create_pin",
  "arguments": {
    "board_id": "1234567890",
    "title": "Walnut credenza",
    "description": "Inspiration for the new credenza",
    "link": "https://example.com/credenza",
    "media_source": {
      "source_type": "image_url",
      "url": "https://example.com/credenza.jpg"
    }
  }
}
```

Pull analytics for a pin over the last 30 days:

```json
{
  "name": "get_pin_analytics",
  "arguments": {
    "pin_id": "9876543210",
    "start_date": "2026-04-19",
    "end_date": "2026-05-19",
    "metric_types": ["IMPRESSION", "SAVE", "PIN_CLICK", "OUTBOUND_CLICK"]
  }
}
```

## Notes

* Pinterest's v5 search endpoints scope to the authenticated user's own content. There is no global search via this API.
* `delete_pin` and `delete_board` are irreversible. Treat them as destructive.
* Analytics windows are capped at 90 days and the `start_date` must be within the last 90 days.
* Pinterest rate limits apply per token. The server surfaces 429 responses as `PinterestApiError` with the upstream body intact.
