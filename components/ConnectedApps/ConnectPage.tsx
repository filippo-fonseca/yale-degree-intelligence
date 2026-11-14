"use client";

import Link from "next/link";
import { FiLock, FiRotateCcw, FiShield } from "react-icons/fi";
import {
  Kicker,
  StaticPageFooter,
  StaticPageNav,
  StaticPageShell,
} from "@/components/ui/StaticPageChrome";
import { ClientGuideTabs, ServerUrlRow } from "./ClientGuideTabs";

export type ToolSummary = { name: string; title: string; scope: "read" | "write"; summary: string };

const PROMISES = [
  {
    icon: FiLock,
    title: "You choose the access",
    body: "Every app asks first. Pick read-only, or let it change your courses, profile and saved plans.",
  },
  {
    icon: FiRotateCcw,
    title: "Every change is on record",
    body: "Changes an app makes show up under Settings > Connected apps, and apps can preview a change before making it.",
  },
  {
    icon: FiShield,
    title: "Cut it off any time",
    body: "Disconnect one app or all of them from Settings. Apps never see your password, your friends' data, or your account controls.",
  },
];

/**
 * The public guide to connecting an AI assistant over MCP. Linked from the
 * OAuth metadata as service_documentation and from Settings.
 */
export default function ConnectPage({ url, tools }: { url: string; tools: ToolSummary[] }) {
  const read = tools.filter((t) => t.scope === "read");
  const write = tools.filter((t) => t.scope === "write");

  return (
    <StaticPageShell>
      <StaticPageNav />
      <main className="mx-auto max-w-3xl px-4 pt-14 sm:px-6">
        <Kicker>Connect an AI assistant</Kicker>
        <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">
          Plan your degree from Claude, ChatGPT or Grok.
        </h1>
        <p className="mt-4 max-w-[60ch] font-sf text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
          DegreeIntelligence runs an MCP server, the open standard assistants use to reach other
          apps. Connect one and it can check what you still need, search the catalog, and, if you
          let it, add courses or rearrange a plan in the Simulator. The numbers come from the same
          engine as the app, so the answers match what you see here.
        </p>

        <section className="mt-10 font-sf">
          <p className="mb-1.5 text-[11px] uppercase tracking-wide text-gray-400">Server URL</p>
          <ServerUrlRow url={url} />
        </section>

        <section className="mt-8 rounded-2xl border border-black/[0.07] bg-white p-5 font-sf dark:border-white/[0.08] dark:bg-white/[0.03]">
          <ClientGuideTabs
            url={url}
            tokenPanel={
              <p className="rounded-lg border border-black/[0.06] bg-gray-50 p-3 text-[12px] text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300">
                Create the token in the app under Settings &gt; Connected apps &gt; Connect a new app
                &gt; Grok, bots &amp; APIs.{" "}
                <Link href="/" className="underline">
                  Open DegreeIntelligence
                </Link>
              </p>
            }
          />
        </section>

        <section className="mt-12 grid gap-4 font-sf sm:grid-cols-3">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <Icon className="text-gray-500" size={16} />
              <h2 className="mt-2 text-[14px] font-medium">{title}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-14 font-sf">
          <Kicker>What an assistant can do</Kicker>
          <div className="mt-4 grid gap-8 sm:grid-cols-2">
            {[
              { label: "Read (always)", list: read },
              { label: "Change (only if you allow it)", list: write },
            ].map(({ label, list }) => (
              <div key={label}>
                <h3 className="text-[13px] font-medium">{label}</h3>
                <ul className="mt-2 space-y-2">
                  {list.map((t) => (
                    <li key={t.name} className="text-[13px] leading-snug">
                      <code className="font-mono text-[12px] text-gray-800 dark:text-gray-200">{t.name}</code>
                      <span className="block text-gray-600 dark:text-gray-400">{t.summary}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 font-sf text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
          <Kicker>For developers</Kicker>
          <p className="mt-3">
            Streamable HTTP at <code className="font-mono">{url}</code>, stateless, JSON responses.
            OAuth 2.1 with PKCE (S256) and dynamic client registration; discovery at{" "}
            <code className="font-mono">/.well-known/oauth-protected-resource</code> and{" "}
            <code className="font-mono">/.well-known/oauth-authorization-server</code>. Scopes are{" "}
            <code className="font-mono">degree:read</code> and <code className="font-mono">degree:write</code>.
            Every write tool takes <code className="font-mono">dry_run</code> and is safe to retry.
          </p>
        </section>
      </main>
      <StaticPageFooter />
    </StaticPageShell>
  );
}
