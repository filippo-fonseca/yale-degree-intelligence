"use client";

import type { ReactNode } from "react";
import { ModalShell, ModalHeader } from "./ModalShell";
import { ShinyButton } from "./shiny-button";

export type TipModalPoint = {
  /** The action being explained, e.g. "Manual fulfill". */
  term: string;
  body: ReactNode;
};

/**
 * The one-time explainer that opens on My Major and My Certificates.
 *
 * Both pages had their own copy of this dialog, identical apart from the copy
 * and an accent (blue on one, teal on the other), and neither had been through
 * the v3 pass: a coloured icon tile, a semibold sans heading over serif body
 * copy, bulleted text, and a grey "Got it" that did not match any button in the
 * product. It is one component now, on the shared modal window, with the
 * numbered rows the transcript dialog uses and the same primary button as the
 * setup flow.
 */
export function TipModal({
  open,
  onClose,
  label,
  title,
  intro,
  points,
  footnote,
  z,
}: {
  open: boolean;
  onClose: () => void;
  /** Mono text in the window's status bar. */
  label: string;
  title: string;
  intro: ReactNode;
  points: TipModalPoint[];
  footnote: ReactNode;
  z?: string;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      label={label}
      z={z}
    >
      <div className="p-5 sm:p-6">
        <ModalHeader title={title}>{intro}</ModalHeader>

        <div className="mt-5 rounded-xl border border-black/[0.06] bg-[#fafafa] p-4 dark:border-white/[0.07] dark:bg-white/[0.03]">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
            The two ways to tell us
          </p>
          <ol className="mt-3 space-y-3">
            {points.map((point, i) => (
              <li key={point.term} className="flex items-start gap-3">
                <span
                  className="mt-0.5 shrink-0 font-mono text-[11px] text-gray-400 dark:text-gray-500"
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="flex-1 font-sf text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {point.term}
                  </span>
                  : {point.body}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-4 font-sf text-xs leading-relaxed text-gray-400 dark:text-gray-500">
          {footnote}
        </p>

        <div className="mt-5 flex justify-end font-sf">
          <ShinyButton size="sm" onClick={onClose}>
            Got it
          </ShinyButton>
        </div>
      </div>
    </ModalShell>
  );
}

export default TipModal;
