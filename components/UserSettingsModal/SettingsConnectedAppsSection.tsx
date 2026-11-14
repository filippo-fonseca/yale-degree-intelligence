"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FiAlertTriangle, FiChevronDown, FiExternalLink, FiKey } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import {
  ClientGuideTabs,
  CopyButton,
  ServerUrlRow,
  SnippetTabs,
} from "@/components/ConnectedApps/ClientGuideTabs";
import { CLIENT_GUIDES } from "@/lib/mcp/clientGuides";

type Status = "active" | "idle" | "expired" | "revoked";

type Connection = {
  id: string;
  kind: "oauth" | "personal";
  clientName: string;
  redirectHost: string;
  scopes: string[];
  connectedAt: number;
  lastUsedAt: number | null;
  status: Status;
  revokedAt: number | null;
  expiresAt: number;
};

type Activity = {
  id?: string;
  at: number;
  clientName: string;
  tool: string;
  summary: string;
  connectionId: string;
};

type Data = { serverUrl: string; connections: Connection[]; activity: Activity[] };

const WRITE = "degree:write";
const READ = "degree:read";

const STATUS_STYLE: Record<Status, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  idle: {
    label: "Idle",
    className: "bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20",
  },
  expired: {
    label: "Expired",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  },
  revoked: {
    label: "Disconnected",
    className: "bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20",
  },
};

function ago(t: number): string {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function shortDate(t: number): string {
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const card =
  "rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.06] dark:via-transparent dark:to-black/10 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm px-3 py-2.5";

function ConnectionRow({
  conn,
  onDisconnect,
}: {
  conn: Connection;
  onDisconnect: (id: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const style = STATUS_STYLE[conn.status];
  const canWrite = conn.scopes.includes(WRITE);
  const live = conn.status !== "revoked";

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-gray-900 dark:text-gray-100">
            {conn.clientName}
          </span>
          <span className={`rounded-full border px-1.5 py-px text-[10px] ${style.className}`}>
            {style.label}
          </span>
          <span className="rounded-full border border-black/[0.08] px-1.5 py-px text-[10px] text-gray-600 dark:border-white/[0.1] dark:text-gray-300">
            {canWrite ? "Read & write" : "Read only"}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
          {conn.kind === "personal" ? (
            <>
              <FiKey className="mr-1 inline" size={10} />
              Personal token
            </>
          ) : (
            <>Via {conn.redirectHost || "OAuth"}</>
          )}
          {" · "}
          {conn.lastUsedAt ? `Last used ${ago(conn.lastUsedAt)}` : "Not used yet"}
          {conn.status === "revoked" && conn.revokedAt
            ? ` · Disconnected ${ago(conn.revokedAt)}`
            : conn.status === "expired"
              ? " · Reconnect it from the app to keep using it"
              : conn.kind === "personal"
                ? ` · Expires ${shortDate(conn.expiresAt)}`
                : ""}
        </p>
      </div>
      {live &&
        (confirming ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-600 dark:text-gray-300">Disconnect?</span>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onDisconnect(conn.id);
                setBusy(false);
                setConfirming(false);
              }}
              className="rounded-md bg-red-600 px-2 py-1 text-[11px] text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "…" : "Yes"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="rounded-md border border-black/[0.08] px-2 py-1 text-[11px] text-gray-600 dark:border-white/[0.1] dark:text-gray-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-md border border-black/[0.08] px-2 py-1 text-[11px] text-gray-600 hover:border-red-400/50 hover:text-red-600 dark:border-white/[0.1] dark:text-gray-300 dark:hover:text-red-300"
          >
            Disconnect
          </button>
        ))}
    </li>
  );
}

type CreatedToken = { token: string; name: string };

/**
 * The one moment the student can copy a new token. It lives at the section
 * level, outside the collapsible guide: creating the first token adds a
 * connection, which collapses the guide, and the token used to vanish with it.
 */
function NewTokenPanel({
  created,
  serverUrl,
  onDismiss,
}: {
  created: CreatedToken;
  serverUrl: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const guide = CLIENT_GUIDES.find((g) => g.auth === "token");
  const snippets = guide?.snippets ?? [];

  return (
    <div
      role="status"
      className="mt-2.5 rounded-lg border border-emerald-500/25 bg-emerald-50 p-2.5 dark:bg-emerald-500/[0.06]"
    >
      <p className="text-[12px] font-medium text-emerald-900 dark:text-emerald-200">
        Your token for {created.name} is ready. Copy it now: you won&apos;t see it again.
      </p>
      <div className="mt-2 flex items-center gap-2 rounded-md border border-black/[0.06] bg-white px-2 py-1.5 dark:border-white/[0.08] dark:bg-black/30">
        <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-gray-800 dark:text-gray-200">
          {created.token}
        </code>
        <CopyButton value={created.token} label="Copy token" onCopied={() => setCopied(true)} />
      </div>

      {snippets.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-medium text-gray-800 dark:text-gray-200">
            Paste-ready setup, with your token already filled in. For Grok Bot, just send it the setup message.
          </p>
          <SnippetTabs snippets={snippets} url={serverUrl} token={created.token} onCopied={() => setCopied(true)} />
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {confirmDismiss ? (
          <>
            <span className="text-[11px] text-amber-800 dark:text-amber-200">
              You haven&apos;t copied it yet. Close anyway?
            </span>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md bg-gray-900 px-2 py-1 text-[11px] text-white dark:bg-white dark:text-gray-900"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => setConfirmDismiss(false)}
              className="text-[11px] text-gray-600 underline dark:text-gray-300"
            >
              Keep it open
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => (copied ? onDismiss() : setConfirmDismiss(true))}
            className="text-[11px] text-gray-600 underline dark:text-gray-300"
          >
            Done, I&apos;ve saved it
          </button>
        )}
      </div>
    </div>
  );
}

function PersonalTokenCreator({ onCreated }: { onCreated: (created: CreatedToken) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [write, setWrite] = useState(false);
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ name: name.trim(), scopes: write ? [READ, WRITE] : [READ], days }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setError(data.error ?? "Couldn't create the token. Try again.");
      } else {
        onCreated({ token: data.token, name: name.trim() });
        setName("");
      }
    } catch {
      setError("Couldn't create the token. Try again.");
    }
    setBusy(false);
  };

  return (
    <div className="rounded-lg border border-black/[0.06] bg-white p-2.5 dark:border-white/[0.08] dark:bg-black/20">
      <p className="text-[12px] font-medium text-gray-800 dark:text-gray-200">Create a personal access token</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name, e.g. Discord bot"
          className="min-w-[10rem] flex-1 rounded-md border border-black/[0.08] bg-transparent px-2 py-1 text-[12px] text-gray-900 outline-none focus:border-gray-400 dark:border-white/[0.1] dark:text-gray-100"
        />
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border border-black/[0.08] bg-transparent px-1.5 py-1 text-[12px] text-gray-700 dark:border-white/[0.1] dark:text-gray-200"
          aria-label="Expires after"
        >
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      </div>
      <label className="mt-2 flex items-center gap-2 text-[12px] text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={write}
          onChange={(e) => setWrite(e.target.checked)}
          className="h-3.5 w-3.5 accent-gray-900 dark:accent-white"
        />
        Allow changes to my courses, profile and plans (otherwise read-only)
      </label>
      <button
        type="button"
        disabled={busy || !name.trim()}
        onClick={submit}
        className="mt-2 rounded-md bg-gray-900 px-2.5 py-1 text-[12px] text-white hover:bg-black disabled:opacity-40 dark:bg-white dark:text-gray-900"
      >
        {busy ? "Creating…" : "Create token"}
      </button>
      {error && <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

/**
 * Settings > Connected apps: the MCP server URL, how to connect each client,
 * every app the student has connected (with status and a way to cut it off),
 * and the latest changes those apps made.
 */
export function SettingsConnectedAppsSection() {
  const { user } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [showGuide, setShowGuide] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [created, setCreated] = useState<CreatedToken | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/connections", {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        cache: "no-store",
      });
      if (res.status === 503) {
        setState("unavailable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      setData((await res.json()) as Data);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const disconnect = async (id: string) => {
    if (!user) return;
    await fetch("/api/connections", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({ id }),
    }).catch(() => {});
    await load();
  };

  const connections = data?.connections ?? [];
  const activeCount = connections.filter((c) => c.status === "active").length;
  const live = connections.filter((c) => c.status !== "revoked").length;
  const names = new Map(connections.map((c) => [c.id, c.clientName]));

  return (
    <div className={`${card} mt-3`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">Connected apps</h3>
        {state === "ready" && live > 0 && (
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-px text-[10px] text-emerald-700 dark:text-emerald-300">
            {activeCount} active
          </span>
        )}
        <Link
          href="/connect"
          target="_blank"
          className="ml-auto inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          Full guide <FiExternalLink size={10} />
        </Link>
      </div>
      <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
        Let Claude, ChatGPT, Grok and other assistants read your degree progress and, if you allow
        it, update your courses and plans.
      </p>

      {state === "loading" && <p className="mt-2 text-[11px] text-gray-500">Loading…</p>}
      {state === "unavailable" && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          <FiAlertTriangle size={11} /> Connecting apps isn&apos;t set up on this server yet.
        </p>
      )}
      {state === "error" && (
        <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">
          Couldn&apos;t load your connected apps.{" "}
          <button type="button" className="underline" onClick={() => void load()}>
            Try again
          </button>
        </p>
      )}

      {state === "ready" && data && (
        <>
          <div className="mt-2.5">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">Server URL</p>
            <ServerUrlRow url={data.serverUrl} />
          </div>

          {created && (
            <NewTokenPanel created={created} serverUrl={data.serverUrl} onDismiss={() => setCreated(null)} />
          )}

          {connections.length > 0 ? (
            <ul className="mt-2 divide-y divide-black/[0.05] dark:divide-white/[0.06]">
              {connections.map((c) => (
                <ConnectionRow key={c.id} conn={c} onDisconnect={disconnect} />
              ))}
            </ul>
          ) : (
            <p className="mt-2.5 text-[12px] text-gray-600 dark:text-gray-300">
              No apps connected yet.
            </p>
          )}

          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="mt-2 flex items-center gap-1 text-[12px] font-medium text-gray-800 dark:text-gray-200"
          >
            <FiChevronDown className={`transition-transform ${showGuide ? "rotate-180" : ""}`} size={12} />
            Connect a new app
          </button>
          {(showGuide || connections.length === 0) && (
            <div className="mt-2">
              <ClientGuideTabs
                url={data.serverUrl}
                tokenPanel={
                  <PersonalTokenCreator
                    onCreated={(token) => {
                      setCreated(token);
                      void load();
                    }}
                  />
                }
              />
            </div>
          )}

          {data.activity.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowActivity((v) => !v)}
                className="mt-3 flex items-center gap-1 text-[12px] font-medium text-gray-800 dark:text-gray-200"
              >
                <FiChevronDown className={`transition-transform ${showActivity ? "rotate-180" : ""}`} size={12} />
                Recent changes by apps
              </button>
              {showActivity && (
                <ul className="mt-1.5 space-y-1">
                  {data.activity.map((a, i) => (
                    <li key={a.id ?? i} className="text-[11px] leading-snug text-gray-600 dark:text-gray-300">
                      <span className="text-gray-400">{ago(a.at)}</span>{" "}
                      <span className="font-medium">{names.get(a.connectionId) ?? a.clientName}</span>: {a.summary}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
