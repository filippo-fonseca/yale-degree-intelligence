"use client";

import { useState } from "react";
import Link from "next/link";
import { FiAlertTriangle, FiCheck, FiLock } from "react-icons/fi";
import LogoIcon from "@/icons/LogoIcon";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import type { AuthorizeParams } from "@/lib/oauth/service";

type ScopeRow = { id: string; description: string };

type Props = {
  params: AuthorizeParams;
  client: { name: string; redirectHost: string; clientUri: string | null };
  scopes: ScopeRow[];
};

const WRITE = "degree:write";

function Frame({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4 py-10 font-sf text-gray-900 dark:bg-[#0a0a0b] dark:text-white">
      <div className="w-full max-w-md rounded-2xl border border-black/[0.07] bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <LogoIcon
            width={20}
            height={20}
            variant={resolvedTheme === "dark" ? undefined : "darkOnLight"}
          />
          <span className="text-sm font-medium">DegreeIntelligence</span>
        </div>
        {children}
      </div>
    </main>
  );
}

export function ConsentError({ message }: { message: string }) {
  return (
    <Frame>
      <h1 className="font-louize text-2xl">Can&apos;t connect this app</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{message}</p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-full border border-black/10 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 dark:border-white/15 dark:text-gray-300 dark:hover:text-white"
      >
        Back to DegreeIntelligence
      </Link>
    </Frame>
  );
}

/**
 * What a student sees when Claude, ChatGPT or another agent asks to connect.
 *
 * The client's name is whatever it registered with, so it is never presented
 * as verified: the page leads with where the student will be sent back to,
 * which is the part that cannot be faked.
 */
export default function ConsentScreen({ params, client, scopes }: Props) {
  const { user, loading, authenticating, signInWithGoogle, logout } = useAuth();
  const [allowWrite, setAllowWrite] = useState(true);
  const [submitting, setSubmitting] = useState<"allow" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: "allow" | "deny") => {
    if (!user) return;
    setSubmitting(decision);
    setError(null);
    try {
      const token = await user.getIdToken();
      const granted = scopes
        .map((s) => s.id)
        .filter((id) => id !== WRITE || allowWrite);
      const res = await fetch("/api/oauth/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ params, decision, scopes: granted }),
      });
      const data = (await res.json()) as { redirectTo?: string; error?: string };
      if (!res.ok || !data.redirectTo) {
        setError(data.error ?? "Something went wrong. Try again.");
        setSubmitting(null);
        return;
      }
      window.location.assign(data.redirectTo);
    } catch {
      setError("Something went wrong. Try again.");
      setSubmitting(null);
    }
  };

  if (loading || authenticating) {
    return (
      <Frame>
        <p className="text-sm text-gray-500 dark:text-gray-400">Checking your sign-in…</p>
      </Frame>
    );
  }

  if (!user) {
    return (
      <Frame>
        <h1 className="font-louize text-2xl leading-snug">
          Sign in to connect <span className="break-words">{client.name}</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          An app wants to connect to your DegreeIntelligence account. Sign in with your Yale
          Google account first, then you can choose what it may do.
        </p>
        <button
          type="button"
          onClick={() => {
            signInWithGoogle().catch((e: unknown) =>
              setError(e instanceof Error ? e.message : "Sign-in failed"),
            );
          }}
          className="mt-6 w-full rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
        >
          Sign in with Google
        </button>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </Frame>
    );
  }

  return (
    <Frame>
      <h1 className="font-louize text-2xl leading-snug">
        <span className="break-words">{client.name}</span> wants to connect to your account
      </h1>

      <div className="mt-4 flex gap-2.5 rounded-xl border border-amber-500/20 bg-amber-50 p-3 text-[13px] leading-relaxed text-amber-900 dark:bg-amber-500/[0.08] dark:text-amber-200">
        <FiAlertTriangle className="mt-0.5 shrink-0" size={14} />
        <span>
          You&apos;ll be sent back to <strong className="font-medium">{client.redirectHost}</strong>.
          DegreeIntelligence can&apos;t verify the app&apos;s name, so only continue if you started
          this from {client.redirectHost}.
        </span>
      </div>

      <p className="mt-5 text-xs font-medium uppercase tracking-wide text-gray-400">
        It will be able to
      </p>
      <ul className="mt-2 space-y-2">
        {scopes.map((scope) => {
          const isWrite = scope.id === WRITE;
          return (
            <li key={scope.id}>
              <label
                className={`flex items-start gap-3 rounded-xl border border-black/[0.07] p-3 text-sm dark:border-white/[0.08] ${
                  isWrite ? "cursor-pointer" : ""
                }`}
              >
                {isWrite ? (
                  <input
                    type="checkbox"
                    checked={allowWrite}
                    onChange={(e) => setAllowWrite(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-gray-900 dark:accent-white"
                  />
                ) : (
                  <FiCheck className="mt-0.5 shrink-0 text-gray-500" size={16} />
                )}
                <span className="leading-snug text-gray-700 dark:text-gray-300">
                  {scope.description}
                  {isWrite && (
                    <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                      Untick for read-only. Every change it makes shows up under Settings &gt;
                      Connected apps.
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        <FiLock className="mt-0.5 shrink-0" size={12} />
        <span>
          It can&apos;t see your password, your friends&apos; data, or delete your account. You can
          disconnect it any time in Settings.
        </span>
      </p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          disabled={submitting !== null}
          onClick={() => decide("deny")}
          className="flex-1 rounded-full border border-black/10 px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 dark:border-white/15 dark:text-gray-300 dark:hover:text-white"
        >
          {submitting === "deny" ? "Cancelling…" : "Cancel"}
        </button>
        <button
          type="button"
          disabled={submitting !== null}
          onClick={() => decide("allow")}
          className="flex-1 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
        >
          {submitting === "allow" ? "Connecting…" : "Allow"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
        Signed in as {user.email}.{" "}
        <button type="button" onClick={() => logout()} className="underline hover:text-gray-700 dark:hover:text-gray-200">
          Not you?
        </button>
      </p>
    </Frame>
  );
}
