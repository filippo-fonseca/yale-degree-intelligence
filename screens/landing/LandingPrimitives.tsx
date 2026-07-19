"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export function CountUp({
  to,
  inView,
  decimals = 0,
  duration = 0.8,
}: {
  to: number;
  inView: boolean;
  decimals?: number;
  duration?: number;
}) {
  const mv = useMotionValue(0);
  const sp = useSpring(mv, { stiffness: 120, damping: 20, duration });
  const rounded = useTransform(sp, (v) => v.toFixed(decimals));
  // start when visible
  if (inView) mv.set(to);
  return <motion.span>{rounded as any}</motion.span>;
}

export function MajorProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-900/80 rounded-full h-3 overflow-hidden border border-black/[0.05] dark:border-white/[0.05] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="h-3 rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 shadow-[0_0_12px_rgba(139,92,246,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]"
      />
    </div>
  );
}

export function Card({
  children,
  fade,
  delay = 0,
}: {
  children: React.ReactNode;
  fade?: boolean;
  delay?: number;
}) {
  const cardClass =
    "bg-gradient-to-br from-white/[0.08] via-transparent to-black/10 p-4 rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm hover:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.12)]";

  if (!fade) return <div className={cardClass}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className={cardClass}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({
  icon,
  title,
  color = "blue",
}: {
  icon: React.ReactNode;
  title: string;
  color?: "red" | "blue" | "green";
}) {
  const colorMap: Record<string, string> = {
    red: "text-red-400 bg-gradient-to-br from-red-500/25 to-red-600/15 border-red-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(239,68,68,0.2)]",
    blue: "text-blue-400 bg-gradient-to-br from-blue-500/25 to-blue-600/15 border-blue-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(59,130,246,0.2)]",
    green:
      "text-green-400 bg-gradient-to-br from-green-500/25 to-green-600/15 border-green-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(34,197,94,0.2)]",
  };
  return (
    <div className="flex items-center gap-2 mb-3">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center border ${colorMap[color]}`}
      >
        {icon}
      </div>
      <h3 className="text-base font-medium text-gray-900 dark:text-white">{title}</h3>
    </div>
  );
}
