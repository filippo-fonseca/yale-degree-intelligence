"use client";

import { getDistPillStyle } from "@/lib/constants";
import { ALLOC_REQ_CODES } from "@/lib/distributionalAllocation";

const LANG_LEVELS = ["L1", "L2", "L3", "L4", "L5"] as const;

// Area/skill codes (Hu/So/Sc/QR/WR) plus the language levels (L1-L5).
const DIST_CODES: string[] = [...ALLOC_REQ_CODES, ...LANG_LEVELS];

interface CourseDistributionalControlProps {
  value: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
}

export default function CourseDistributionalControl({
  value,
  onChange,
  disabled = false,
}: CourseDistributionalControlProps) {
  const selected = value ?? [];

  const toggle = (code: string) => {
    if (disabled) return;
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {DIST_CODES.map((code) => {
        const isOn = selected.includes(code);
        return (
          <button
            key={code}
            type="button"
            disabled={disabled}
            onClick={() => toggle(code)}
            aria-pressed={isOn}
            title={`Toggle ${code}`}
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isOn
                ? getDistPillStyle(code)
                : "bg-transparent text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-800/60 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700"
            }`}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
