# claude-pinterest

Pinterest MCP server with full read and write access to pins, boards, board sections, search, and analytics. Talks to the Pinterest REST API v5 directly over HTTPS, no JDBC driver required.

Supports two auth modes:

* **OAuth with auto refresh (recommended)**: log in once with `npm run auth`, the server keeps the access token fresh on its own.
* **Static token (one shot)**: paste a pre generated token into the env. Quick to start, has to be rotated manually when it expires.

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

### 1. Install and build

```bash
npm install
npm run build
```

### 2. Create a Pinterest app and copy its credentials

1. Open https://developers.pinterest.com/apps/ and create an app (or open an existing one).
2. On the app page, copy the **App ID** (this is `PINTEREST_CLIENT_ID`) and the **App secret key** (this is `PINTEREST_CLIENT_SECRET`).
3. Under **Redirect URIs**, add `http://localhost:8788/callback` (or whatever URI you want to use, see below).

Make sure the app has these scopes enabled: `pins:read`, `pins:write`, `boards:read`, `boards:write`, `user_accounts:read`. Add `pins:read_secret` and `boards:read_secret` if protected content is in scope.

### 3. Authorize the server (OAuth mode)

Create a `.env` in the project root (gitignored):

```bash
cp .env.example .env
```

Fill in `PINTEREST_CLIENT_ID` and `PINTEREST_CLIENT_SECRET`. Then:

```bash
npm run auth
```

The CLI:

1. Opens your browser to Pinterest's authorize page.
2. Listens on `http://localhost:8788/callback` (configurable via `PINTEREST_REDIRECT_URI`).
3. Captures the authorization code, exchanges it for `access_token` + `refresh_token`.
4. Saves them to `~/.config/claude-pinterest/tokens.json` with mode `0600`.

The MCP server reads that file at startup and refreshes the access token automatically when it expires.

To revoke or rotate, either:

* Run `npm run auth` again to re authorize (overwrites the file), or
* Delete `~/.config/claude-pinterest/tokens.json` and revoke access from your Pinterest account settings.

### 4a. Configure Claude Desktop (OAuth mode)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` and add:

```json
{
  "mcpServers": {
    "pinterest": {
      "command": "node",
      "args": [
        "/Users/sophia/projects/pinterest-claude MCP/dist/index.js"
      ],
      "env": {
        "PINTEREST_CLIENT_ID": "your_app_id",
        "PINTEREST_CLIENT_SECRET": "your_app_secret"
      }
    }
  }
}
```

Restart Claude Desktop.

### 4b. Configure Claude Code (OAuth mode)

```bash
claude mcp add pinterest \
  -e PINTEREST_CLIENT_ID=your_app_id \
  -e PINTEREST_CLIENT_SECRET=your_app_secret \
  -- node "/Users/sophia/projects/pinterest-claude MCP/dist/index.js"
```

The server name must come before the `-e` flags. `-e` is variadic and will swallow the name if it appears after.

### Static token mode (alternative, skip OAuth)

If `PINTEREST_ACCESS_TOKEN` is set, the server uses it directly and never refreshes. This is the right mode for the 24 hour trial tokens generated from the Pinterest dev portal's "Generate access token" button, or for any short lived bearer you already have on hand.

```bash
claude mcp add pinterest \
  -e PINTEREST_ACCESS_TOKEN=pina_... \
  -- node "/Users/sophia/projects/pinterest-claude MCP/dist/index.js"
```

When the token expires, generate a new one and update the env. No refresh, no file storage.

## Configuration reference

| Variable | Mode | Purpose |
| --- | --- | --- |
| `PINTEREST_CLIENT_ID` | OAuth | App ID from the Pinterest dev portal. |
| `PINTEREST_CLIENT_SECRET` | OAuth | App secret key from the Pinterest dev portal. |
| `PINTEREST_REDIRECT_URI` | OAuth | Defaults to `http://localhost:8788/callback`. Must match a redirect URI registered on the app. |
| `PINTEREST_TOKEN_PATH` | OAuth | Override token storage location. Defaults to `~/.config/claude-pinterest/tokens.json`. |
| `PINTEREST_ACCESS_TOKEN` | Static | If set, skip OAuth and use this bearer directly. |
| `PINTEREST_API_BASE` | Both | Defaults to `https://api.pinterest.com`. Set to `https://api-sandbox.pinterest.com` to hit the sandbox. |

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

## Secrets hygiene

Never commit any of these. `.gitignore` covers `.env` already; keep it that way.

* `PINTEREST_CLIENT_SECRET` (app secret key)
* `PINTEREST_ACCESS_TOKEN` (begins with `pina_`)
* `refresh_token` (begins with `pinr_`)
* Any `.env` file containing the above
* `~/.config/claude-pinterest/tokens.json` (lives outside the repo, but treat it like a credential)

If a token leaks, rotate it: generate a new app secret in the Pinterest dev portal, or revoke and re authorize. Scrubbing git history is theater once a real token has been pushed to a public repo.

## Notes

* Pinterest's v5 search endpoints scope to the authenticated user's own content. There is no global search via this API.
* `delete_pin` and `delete_board` are irreversible. Treat them as destructive.
* Analytics windows are capped at 90 days and the `start_date` must be within the last 90 days.
* Pinterest rate limits apply per token. The server surfaces non 2xx responses as `PinterestApiError` with the upstream body intact.
* On `401 Unauthorized` in OAuth mode, the server refreshes once and retries the request transparently.
