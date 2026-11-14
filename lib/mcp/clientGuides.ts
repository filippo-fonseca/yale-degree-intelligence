/**
 * How to connect each kind of client to the DegreeIntelligence MCP server.
 * Shared by Settings > Connected apps and the public /connect page, so the two
 * never drift. Client-safe: no server imports.
 *
 * `{url}` in a step or snippet is replaced with the server URL, and `{token}`
 * with the student's new personal access token when there is one, else a
 * placeholder. The token never goes in a URL: URLs end up in logs and history.
 */

export type GuideSnippet = { label: string; language: string; code: string };

export type ClientGuide = {
  id: string;
  name: string;
  /** "oauth": the client signs in through our consent screen. "token": paste a personal access token. */
  auth: "oauth" | "token";
  /** One line under the tab name. */
  blurb: string;
  steps: string[];
  /** A page in the client where setup starts, shown as an "Open" button. */
  link?: { label: string; href: string };
  snippets?: GuideSnippet[];
  note?: string;
};

export const CLIENT_GUIDES: ClientGuide[] = [
  {
    id: "claude",
    name: "Claude",
    auth: "oauth",
    blurb: "claude.ai, the Claude desktop and mobile apps, and Claude Duet.",
    link: { label: "Open Claude connector settings", href: "https://claude.ai/settings/connectors" },
    steps: [
      "Open Claude's connector settings (button below, or Settings → Connectors) and choose Add custom connector.",
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
    id: "grok",
    name: "Grok",
    auth: "oauth",
    blurb: "grok.com and the Grok apps, using a custom connector.",
    link: { label: "Open Grok connectors", href: "https://grok.com/connectors" },
    steps: [
      "Open Grok's connectors page (button below) and choose New Connector → Custom.",
      "Paste the server URL: {url}",
      "Grok sends you to DegreeIntelligence to sign in and pick read-only or read and write. Approve, and you're back in Grok.",
      "Ask Grok something like “what do I still need for my major?”",
    ],
    note: "Custom connectors may need a paid Grok plan. To use Grok through the xAI API instead, use the Bots & APIs tab.",
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
    snippets: [
      {
        label: "Terminal",
        language: "bash",
        code: "claude mcp add --transport http degree-intelligence {url}",
      },
    ],
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
    snippets: [
      {
        label: "mcp.json",
        language: "json",
        code: '{\n  "mcpServers": {\n    "degree-intelligence": { "url": "{url}" }\n  }\n}',
      },
    ],
    note: "VS Code uses a top-level \"servers\" key and wants \"type\": \"http\" next to the URL.",
  },
  {
    id: "token",
    name: "Bots & APIs",
    auth: "token",
    blurb: "Anything that can't sign in through a browser: the xAI, OpenAI or Anthropic APIs, Discord or Telegram bots, scripts.",
    steps: [
      "Create a personal access token below. Name it after what will use it (say, Discord bot) and allow changes only if it needs them.",
      "The token appears once, with the setups below already filled in. Copy the one that matches your client.",
      "xAI API (Grok in your own code): send the request below with your own xAI API key, and Grok can call DegreeIntelligence for you.",
      "Anything else: point it at {url} and send the header Authorization: Bearer <your token>.",
      "Disconnect the token here whenever you like. It also stops working on its own when it expires.",
    ],
    snippets: [
      {
        label: "Grok (xAI API)",
        language: "bash",
        code: `curl https://api.x.ai/v1/responses \\
  -H "Authorization: Bearer $XAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "grok-4",
    "input": "What do I still need for my major?",
    "tools": [{
      "type": "mcp",
      "server_label": "degree-intelligence",
      "server_url": "{url}",
      "authorization": "{token}"
    }]
  }'`,
      },
      {
        label: "MCP client config",
        language: "json",
        code: '{\n  "mcpServers": {\n    "degree-intelligence": {\n      "url": "{url}",\n      "headers": { "Authorization": "Bearer {token}" }\n    }\n  }\n}',
      },
      {
        label: "HTTP header",
        language: "text",
        code: "Authorization: Bearer {token}",
      },
    ],
    note: "The OpenAI Responses API takes the same tool object as the Grok example. Anthropic's Messages API takes the URL in mcp_servers with authorization_token set to the token.",
  },
];

export function fillGuideText(text: string, url: string, token = "YOUR_TOKEN"): string {
  return text.replaceAll("{url}", url).replaceAll("{token}", token);
}
