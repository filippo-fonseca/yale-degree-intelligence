"use client";

import type React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/utils";

/**
 * Primary CTA for the landing page: a solid pill with an animated
 * conic-gradient border that intensifies on hover and focus.
 *
 * The animation itself lives in app/globals.css under `.shiny-cta`, declared
 * once rather than per instance, since it needs `@property` and `@keyframes`
 * at-rules. This file owns only sizing, layout, and behavior.
 *
 * Renders an anchor when `href` is passed and a button otherwise, mirroring
 * the CTA contract the landing page already uses.
 */

export type ShinyButtonSize = "sm" | "md";

export interface ShinyButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  /** Disables the button and dims it. Callers swap the label themselves. */
  pending?: boolean;
  /** `md` for hero and section primaries, `sm` for the nav. */
  size?: ShinyButtonSize;
  /** Trailing arrow, matching the old brand CTA. Off for compact buttons. */
  withArrow?: boolean;
  "aria-label"?: string;
}

/**
 * Shared size tokens for every landing CTA, shiny or ghost. Exported so the
 * secondary buttons size from the same source: a CTA pair sitting side by side
 * has to agree on padding and type, and two hand-copied class strings drift.
 */
export const CTA_SIZES: Record<ShinyButtonSize, string> = {
  // Matches the padding and type scale the landing page already uses, so
  // swapping the old CTAs for this one doesn't change the page's rhythm.
  sm: "gap-1.5 px-4 py-1.5 text-sm",
  md: "gap-2 px-6 py-3 text-sm",
};

export function ShinyButton({
  children,
  onClick,
  href,
  className = "",
  pending = false,
  size = "md",
  withArrow = false,
  "aria-label": ariaLabel,
}: ShinyButtonProps) {
  const cls = cn(
    "shiny-cta inline-flex items-center justify-center font-medium",
    CTA_SIZES[size],
    className,
  );

  const label = (
    <span className="shiny-cta-label inline-flex items-center gap-[inherit]">
      {children}
      {withArrow && !pending && <span aria-hidden>→</span>}
    </span>
  );

  if (href) {
    return (
      <motion.a
        whileHover={{ y: -1 }}
        href={href}
        className={cls}
        aria-label={ariaLabel}
      >
        {label}
      </motion.a>
    );
  }

  return (
    <motion.button
      whileHover={pending ? undefined : { y: -1 }}
      onClick={onClick}
      disabled={pending}
      aria-busy={pending}
      aria-label={ariaLabel}
      className={cls}
    >
      {label}
    </motion.button>
  );
}

export default ShinyButton;
