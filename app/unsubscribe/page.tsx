"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type State = "checking" | "ready" | "working" | "done" | "already" | "invalid";

/**
 * The page behind the unsubscribe link in the campaign emails.
 *
 * It asks before it acts. Mail scanners follow links in messages, so a page
 * that unsubscribed on load would drop people off the list who never clicked
 * anything. Gmail's own one-click button skips this page entirely and posts
 * straight to the API, which is what RFC 8058 asks for.
 */
function UnsubscribeInner() {
  const params = useSearchParams();
  const email = params.get("e") ?? "";
  const token = params.get("t") ?? "";
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    if (!email || !token) {
      setState("invalid");
      return;
    }
    const query = `e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`;
    fetch(`/api/unsubscribe?${query}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setState(data.unsubscribed ? "already" : "ready"))
      .catch(() => setState("invalid"));
  }, [email, token]);

  const confirm = async () => {
    setState("working");
    const res = await fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token }),
    });
    setState(res.ok ? "done" : "invalid");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4 font-louize dark:bg-[#0a0a0b]">
      <div className="w-full max-w-md rounded-2xl border border-black/[0.08] bg-white p-6 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.25)] dark:border-white/[0.09] dark:bg-[#101013] sm:p-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
          degreeintelligence
        </p>

        {state === "checking" && (
          <p className="mt-4 font-sf text-sm text-gray-500 dark:text-gray-400">
            One moment...
          </p>
        )}

        {state === "invalid" && (
          <>
            <h1 className="mt-3 text-[1.35rem]/[1.3] font-medium tracking-[-0.02em] text-gray-900 dark:text-white">
              This link has expired
            </h1>
            <p className="mt-2 font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              We could not read the address in it. Email{" "}
              <a
                className="text-gray-900 underline underline-offset-2 dark:text-white"
                href="mailto:filippo.fonseca@yale.edu?subject=Unsubscribe"
              >
                filippo.fonseca@yale.edu
              </a>{" "}
              and we will take you off the list by hand.
            </p>
          </>
        )}

        {state === "ready" && (
          <>
            <h1 className="mt-3 text-[1.35rem]/[1.3] font-medium tracking-[-0.02em] text-gray-900 dark:text-white">
              Stop these emails?
            </h1>
            <p className="mt-2 font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              We will not email <span className="text-gray-900 dark:text-white">{email}</span>{" "}
              again. Your DegreeIntelligence account, if you have one, is not
              affected.
            </p>
            <button
              type="button"
              onClick={confirm}
              className="mt-5 inline-flex items-center justify-center rounded-full bg-gray-900 px-4 py-2 font-sf text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Unsubscribe
            </button>
          </>
        )}

        {state === "working" && (
          <p className="mt-4 font-sf text-sm text-gray-500 dark:text-gray-400">
            Taking you off the list...
          </p>
        )}

        {(state === "done" || state === "already") && (
          <>
            <h1 className="mt-3 text-[1.35rem]/[1.3] font-medium tracking-[-0.02em] text-gray-900 dark:text-white">
              {state === "done" ? "Done." : "You are already off the list."}
            </h1>
            <p className="mt-2 font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              We will not email {email} again. Sorry for the interruption, and
              good luck this semester.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2 font-sf text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:border-white/15 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:text-white"
            >
              Go to DegreeIntelligence
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeInner />
    </Suspense>
  );
}
