"use client";

import { cn } from "@/lib/utils/utils";

interface ProductFrameProps {
  children: React.ReactNode;
  title?: string;
  showChrome?: boolean;
  className?: string;
}

/** Floating product window — glass + hairline, echoes app modal/sidebar chrome. */
export default function ProductFrame({
  children,
  title,
  showChrome = true,
  className,
}: ProductFrameProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.35rem] border border-black/[0.06] bg-white/90 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.35),0_0_0_1px_rgba(255,255,255,0.4)_inset] backdrop-blur-xl dark:border-white/[0.08] dark:bg-gradient-to-br dark:from-gray-900/80 dark:via-gray-900/55 dark:to-gray-950/90 dark:shadow-[0_28px_90px_-20px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.08)]",
        className,
      )}
    >
      {showChrome && (
        <div className="flex items-center gap-2 border-b border-black/[0.05] px-4 py-2.5 dark:border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          </div>
          {title && (
            <span className="ml-1 font-sf text-[10px] font-medium tracking-wide text-gray-400 dark:text-gray-500">
              {title}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
