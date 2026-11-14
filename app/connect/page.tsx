import type { Metadata } from "next";
import { headers } from "next/headers";
import { ALL_TOOLS } from "@/lib/mcp/tools";
import ConnectPage, { type ToolSummary } from "@/components/ConnectedApps/ConnectPage";

export const metadata: Metadata = {
  title: "Connect an AI assistant | DegreeIntelligence",
  description:
    "Connect Claude, ChatGPT, Grok or any MCP client to your DegreeIntelligence account to read your degree progress and update your plans.",
};

function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](\s|$)/s);
  return (match ? match[0] : text).trim();
}

/** Same origin rule as the OAuth issuer: PUBLIC_BASE_URL, else this request's host. */
async function serverUrl(): Promise<string> {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) return `${configured.replace(/\/+$/, "")}/mcp`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/mcp`;
}

export default async function Page() {
  const tools: ToolSummary[] = ALL_TOOLS.map((t) => ({
    name: t.name,
    title: t.title,
    scope: t.scope,
    summary: firstSentence(t.description),
  }));
  return <ConnectPage url={await serverUrl()} tools={tools} />;
}
