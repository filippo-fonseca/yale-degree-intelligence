"use client";

import { useState } from "react";
import { FiCheck, FiCopy, FiInfo } from "react-icons/fi";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { Skeleton } from "../ui/Skeleton";

export function CopyButton({ profileUrl }: { profileUrl: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 font-semibold text-pink-500 hover:text-pink-600 dark:hover:text-pink-200 underline hover:no-underline transition"
    >
      {copied ? (
        <>
          <span>Copied!</span>
          <FiCheck className="inline-block" />
        </>
      ) : (
        <>
          <span>Click to copy this link</span>
          <FiCopy className="inline-block" />
        </>
      )}
    </button>
  );
}

export const FriendCardSkeleton = () => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border border-gray-200 dark:border-white/[0.06] shadow-neu">
    <div className="flex items-center gap-3">
      <Skeleton className="h-9 w-9" rounded="rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-2.5 w-24" />
      </div>
    </div>
    <Skeleton className="h-7 w-24" />
  </div>
);

export const RequestCardSkeleton = () => (
  <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-100/60 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06]">
    <div className="flex items-center gap-2">
      <Skeleton className="h-6 w-6" rounded="rounded-full" />
      <Skeleton className="h-3 w-28" />
    </div>
    <div className="flex gap-1.5">
      <Skeleton className="h-6 w-6" rounded="rounded-md" />
      <Skeleton className="h-6 w-6" rounded="rounded-md" />
    </div>
  </div>
);

export function FriendStatCard({
  label,
  value,
  color = "text-gray-900 dark:text-white",
  tooltip,
}: {
  label: string;
  value: string | number;
  color?: string;
  tooltip?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12] transition-all relative shadow-neu"
    >
      {tooltip && (
        <div className="absolute top-2 right-2 group">
          <FiInfo className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
          <div className="absolute z-10 right-0 w-44 p-2 text-[11px] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0c0c0e]/95 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-white/[0.08] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            {tooltip}
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-lg font-medium mt-0.5 ${color}`}>{value}</p>
    </motion.div>
  );
}

export function SectionHeading({
  icon,
  label,
  count,
  accent = "text-gray-700 dark:text-gray-300",
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  accent?: string;
}) {
  return (
    <h3
      className={`text-xs font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${accent}`}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 text-[10px] font-medium border border-gray-200 dark:border-white/[0.08]">
          {count}
        </span>
      )}
    </h3>
  );
}
