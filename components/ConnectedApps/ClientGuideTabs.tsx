"use client";

import { useState, type ReactNode } from "react";
import { FiCheck, FiCopy, FiExternalLink, FiKey, FiLogIn } from "react-icons/fi";
import { CLIENT_GUIDES, fillGuideText, type GuideSnippet } from "@/lib/mcp/clientGuides";

export function CopyButton({
  value,
  label = "Copy",
  onCopied,
}: {
  value: string;
  label?: string;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          ?.writeText(value)
          .then(() => {
            setCopied(true);
            onCopied?.();
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => {});
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-black/[0.08] px-2 py-1 text-[11px] text-gray-600 transition-colors hover:bg-black/[0.04] hover:text-gray-900 dark:border-white/[0.1] dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
    >
      {copied ? <FiCheck size={11} /> : <FiCopy size={11} />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function ServerUrlRow({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-black/[0.06] bg-white px-2.5 py-1.5 dark:border-white/[0.08] dark:bg-black/20">
      <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-gray-800 dark:text-gray-200">
        {url}
      </code>
      <CopyButton value={url} />
    </div>
  );
}

/**
 * One or more copy-ready snippets, tabbed when there are several. `token`
 * fills `{token}`; without one the snippet shows a placeholder.
 */
export function SnippetTabs({
  snippets,
  url,
  token,
  onCopied,
}: {
  snippets: GuideSnippet[];
  url: string;
  token?: string;
  onCopied?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const snippet = snippets[Math.min(index, snippets.length - 1)];
  if (!snippet) return null;
  const code = fillGuideText(snippet.code, url, token);

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-black/[0.06] dark:border-white/[0.08]">
      <div className="flex items-center gap-2 border-b border-black/[0.06] bg-gray-50 px-2.5 py-1 dark:border-white/[0.08] dark:bg-white/[0.03]">
        {snippets.length > 1 ? (
          <div role="tablist" className="flex min-w-0 flex-1 flex-wrap gap-1">
            {snippets.map((s, i) => (
              <button
                key={s.label}
                type="button"
                role="tab"
                aria-selected={i === index}
                onClick={() => setIndex(i)}
                className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide transition-colors ${
                  i === index
                    ? "bg-black/[0.07] text-gray-900 dark:bg-white/[0.1] dark:text-white"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="min-w-0 flex-1 text-[10px] uppercase tracking-wide text-gray-500">{snippet.label}</span>
        )}
        <CopyButton value={code} onCopied={onCopied} />
      </div>
      <pre
        className={`bg-white px-2.5 py-2 font-mono ${
          snippet.language === "text" ? "whitespace-pre-wrap break-words" : "overflow-x-auto"
        } text-[11px] leading-relaxed text-gray-800 dark:bg-black/30 dark:text-gray-200`}
      >
        {code}
      </pre>
    </div>
  );
}

/**
 * Tabs with step-by-step instructions for each client. `tokenPanel` renders
 * inside the tab for clients that use a personal access token (Settings passes
 * the token creator; the public page passes a pointer to Settings).
 */
export function ClientGuideTabs({ url, tokenPanel }: { url: string; tokenPanel?: ReactNode }) {
  const [active, setActive] = useState(CLIENT_GUIDES[0].id);
  const guide = CLIENT_GUIDES.find((g) => g.id === active) ?? CLIENT_GUIDES[0];

  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-1">
        {CLIENT_GUIDES.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={g.id === active}
            onClick={() => setActive(g.id)}
            className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
              g.id === active
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "border border-black/[0.08] text-gray-600 hover:text-gray-900 dark:border-white/[0.1] dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-3">
        <p className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
          {guide.auth === "oauth" ? <FiLogIn size={11} /> : <FiKey size={11} />}
          {guide.auth === "oauth" ? "Signs in through DegreeIntelligence" : "Uses a personal access token"}
          <span aria-hidden>·</span>
          <span>{guide.blurb}</span>
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-[12px] leading-relaxed text-gray-700 dark:text-gray-300">
          {guide.steps.map((step) => (
            <li key={step} className="break-words">
              {fillGuideText(step, url)}
            </li>
          ))}
        </ol>
        {guide.link && (
          <a
            href={guide.link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-2.5 py-1 text-[12px] text-white hover:bg-black dark:bg-white dark:text-gray-900"
          >
            {guide.link.label} <FiExternalLink size={11} />
          </a>
        )}
        {guide.snippets && guide.snippets.length > 0 && <SnippetTabs snippets={guide.snippets} url={url} />}
        {guide.note && (
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">{guide.note}</p>
        )}
        {guide.auth === "token" && tokenPanel && <div className="mt-3">{tokenPanel}</div>}
      </div>
    </div>
  );
}
