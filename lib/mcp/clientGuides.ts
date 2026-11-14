/**
 * How to connect each kind of client to the DegreeIntelligence MCP server.
 * Shared by Settings > Connected apps and the public /connect page, so the two
 * never drift. Client-safe: no server imports.
 *
 * `{url}` in a step or snippet is replaced with the server URL, and `{token}`
 * with a personal access token placeholder.
 */

export type ClientGuide = {
  id: string;
  name: string;
  /** "oauth": the client signs in through our consent screen. "token": paste a personal access token. */
  auth: "oauth" | "token";
  /** One line under the tab name. */
  blurb: string;
  steps: string[];
  snippet?: { label: string; language: string; code: string };
  note?: string;
};

export const CLIENT_GUIDES: ClientGuide[] = [
  {
    id: "claude",
    name: "Claude",
    auth: "oauth",
    blurb: "claude.ai, the Claude desktop and mobile apps, and Claude Duet.",
    steps: [
      "In Claude, open Settings → Connectors and choose Add custom connector.",
      "Name it DegreeIntelligence and paste the server URL: {url}",
      "Choose Connect. You'll land on DegreeIntelligence to sign in and pick read-only or read and write.",
      "In a chat, turn the connector on from the tools menu. Ask something like “what do I still need for my major?”",
    ],
    note: "Custom connectors are available on Claude's paid plans. On a Team or Enterprise plan an owner may need to add it first.",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    auth: "oauth",
    blurb: "ChatGPT on the web, using a custom connector.",
    steps: [
      "In ChatGPT, open Settings → Apps & Connectors → Advanced settings and turn on Developer mode.",
      "Back in Apps & Connectors, choose Create. Name it DegreeIntelligence.",
      "Paste the server URL {url} and pick OAuth as the authentication.",
      "Choose Create, then Connect, and approve on the DegreeIntelligence screen.",
    ],
    note: "OpenAI changes where this lives from time to time. If the menu looks different, search their help for “custom connectors” or “developer mode”.",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    auth: "oauth",
    blurb: "Anthropic's coding agent in the terminal.",
    steps: [
      "Run the command below.",
      "Start Claude Code, type /mcp, pick degree-intelligence and choose Authenticate.",
      "Your browser opens DegreeIntelligence to approve. Then ask Claude about your plan.",
    ],
    snippet: {
      label: "Terminal",
      language: "bash",
      code: "claude mcp add --transport http degree-intelligence {url}",
    },
  },
  {
    id: "cursor",
    name: "Cursor & VS Code",
    auth: "oauth",
    blurb: "Editors that read an mcp.json file.",
    steps: [
      "Add the server to ~/.cursor/mcp.json (Cursor) or .vscode/mcp.json (VS Code) as below.",
      "Reload the editor. It opens DegreeIntelligence in your browser to approve the connection.",
    ],
    snippet: {
      label: "mcp.json",
      language: "json",
      code: '{\n  "mcpServers": {\n    "degree-intelligence": { "url": "{url}" }\n  }\n}',
    },
    note: "VS Code uses a top-level \"servers\" key and wants \"type\": \"http\" next to the URL.",
  },
  {
    id: "token",
    name: "Grok, bots & APIs",
    auth: "token",
    blurb: "Anything that can't sign in through a browser: the xAI, OpenAI or Anthropic APIs, Discord or Telegram bots, scripts.",
    steps: [
      "Create a personal access token below. Give it a name you'll recognise and only the access it needs.",
      "Copy it straight away. It's shown once and DegreeIntelligence keeps only a fingerprint of it.",
      "Give your client the server URL {url} and send the token as a bearer token. The example below uses an API's remote MCP tool.",
      "Disconnect it here whenever you like. It also stops working on its own when it expires.",
    ],
    snippet: {
      label: "Remote MCP tool (xAI / OpenAI Responses API)",
      language: "json",
      code: '{\n  "type": "mcp",\n  "server_label": "degree-intelligence",\n  "server_url": "{url}",\n  "authorization": "{token}"\n}',
    },
    note: "Anthropic's Messages API takes the same URL in mcp_servers with authorization_token. Anything else can send the header Authorization: Bearer <token>.",
  },
];

export function fillGuideText(text: string, url: string, token = "YOUR_TOKEN"): string {
  return text.replaceAll("{url}", url).replaceAll("{token}", token);
}
