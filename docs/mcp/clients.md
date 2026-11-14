# Connecting a client

The server URL is `<origin>/mcp`, e.g. `https://degreeint.com/mcp` in
production. Settings > Connected apps shows the exact URL for the deployment
you're on, with a copy button. The same steps live in
`lib/mcp/clientGuides.ts`, which Settings and `/connect` render, so update that
file when a client changes its menus.

Clients that support MCP OAuth (most of them) need only the URL: they discover
the authorization server, register themselves, and open the consent screen.
Clients that can't run a browser sign-in use a personal access token.

## Claude (claude.ai, desktop, mobile, Claude Duet)

1. Settings → Connectors → Add custom connector.
2. Name: `DegreeIntelligence`. URL: the server URL.
3. Connect, then approve on the DegreeIntelligence consent screen.
4. Turn the connector on in a chat from the tools menu.

Custom connectors need a paid Claude plan; on Team and Enterprise an owner may
have to add it first.

## Claude Code

```bash
claude mcp add --transport http degree-intelligence https://degreeint.com/mcp
```

Then `/mcp` → `degree-intelligence` → Authenticate.

## ChatGPT

1. Settings → Apps & Connectors → Advanced settings → turn on Developer mode.
2. Apps & Connectors → Create. Paste the URL, choose OAuth.
3. Create, Connect, approve.

OpenAI moves this around; their help pages call it custom connectors or
developer mode.

## Cursor and VS Code

`~/.cursor/mcp.json`:

```json
{ "mcpServers": { "degree-intelligence": { "url": "https://degreeint.com/mcp" } } }
```

`.vscode/mcp.json`:

```json
{ "servers": { "degree-intelligence": { "type": "http", "url": "https://degreeint.com/mcp" } } }
```

Both open the consent screen in the browser on first use.

## Grok, bots and API agents (personal access token)

Create a token in Settings > Connected apps > Connect a new app > Grok, bots &
APIs. Pick a name, read-only or read and write, and 7, 30 or 90 days. It is
shown once. Then send it as a bearer token.

xAI and OpenAI Responses API, remote MCP tool:

```json
{
  "type": "mcp",
  "server_label": "degree-intelligence",
  "server_url": "https://degreeint.com/mcp",
  "authorization": "dia_…"
}
```

Anthropic Messages API, MCP connector:

```json
{
  "mcp_servers": [
    { "type": "url", "url": "https://degreeint.com/mcp", "name": "degree-intelligence", "authorization_token": "dia_…" }
  ]
}
```

Anything else:

```bash
curl -s https://degreeint.com/mcp \
  -H "Authorization: Bearer $DI_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Check each provider's current docs for the exact field names; the shapes above
are what they documented as of November 2026.

## Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

Choose Streamable HTTP, paste the URL, and use either the OAuth flow or a
personal token in the Authorization header.
