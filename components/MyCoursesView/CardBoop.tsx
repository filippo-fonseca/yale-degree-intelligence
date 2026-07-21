"use client";

import { motion } from "framer-motion";

/**
 * Scroll-triggered "boop" wrapper for a course card. Gives each card a subtle,
 * springy entrance as it scrolls into the INNER scroll container's viewport
 * (rooted on `scrollRef`, not the window). Transform/opacity only, so it never
 * touches layout and never fights the card's own `whileHover` lift, which lives
 * on the inner CourseCard element.
 */
export function CardBoop({
  scrollRef,
  children,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0.6, scale: 0.96, y: 6 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2, root: scrollRef }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="min-w-0"
    >
      {children}
    </motion.div>
  );
}
