"use client";

// Yale College publishes a one-page "Distributional Requirements" milestone
// chart: four stacked-bar columns (first-year, sophomore, junior, senior), each
// taller than the last, one short bar per required credit. This is that chart,
// rendered live from the student's own courses: every bar is filled, planned, or
// still open, and every column carries its credit target and a verdict.
//
// The layout follows the original (bottoms aligned, slots top to bottom in
// `spec.slots` order, italic caption under each column, legend on the left).
// The palette is ours: each bar takes the accent color the rest of the app uses
// for that distributional.

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiClock, FiAlertTriangle, FiXCircle } from "react-icons/fi";
import type {
  DistReqKey,
  MilestoneEvaluation,
  MilestoneResult,
  MilestoneSlotResult,
  MilestoneStatus,
} from "@/lib/distributionalMilestones";

/* -------------------------------------------------------------------------- */
/* Palette                                                                    */
/* -------------------------------------------------------------------------- */

// Matches DIST_PIE_COLORS / CARD_COLORS in ./constants. Language has no card
// color of its own, so it takes indigo, which reads as a skill without
// colliding with QR (red) or WR (orange).
const REQ_COLOR: Record<DistReqKey, string> = {
  Hu: "#a855f7",
  Sc: "#34d399",
  So: "#38bdf8",
  QR: "#f87171",
  WR: "#fb923c",
  L: "#818cf8",
};

// The "QR, WR, or L" bars in the first-year column: navy/slate until we can
// tell which skill actually filled them.
const ANY_SKILL_COLOR = "#64748b";

const REQ_NAME: Record<DistReqKey, string> = {
  Hu: "Humanities & Arts",
  Sc: "Sciences",
  So: "Social Sciences",
  QR: "Quantitative Reasoning",
  WR: "Writing",
  L: "Foreign Language",
};

function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/* -------------------------------------------------------------------------- */
/* Any-skill resolution                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The engine reports an "ANY_SKILL" slot with the course that filled it but not
 * which skill that course counted as. The later columns do name their skills, so
 * a course code that fills the sophomore QR slot tells us the first-year bar it
 * also fills is a QR bar. Anything we cannot resolve stays slate.
 */
function buildSkillBySource(evaluation: MilestoneEvaluation): Map<string, DistReqKey> {
  const map = new Map<string, DistReqKey>();
  evaluation.milestones.forEach((m) => {
    m.slots.forEach((slot) => {
      if (slot.req === "ANY_SKILL" || slot.kind !== "skill") return;
      if (!slot.source || map.has(slot.source)) return;
      map.set(slot.source, slot.req);
    });
  });
  return map;
}

function slotColor(
  slot: MilestoneSlotResult,
  skillBySource: Map<string, DistReqKey>,
): string {
  if (slot.req !== "ANY_SKILL") return REQ_COLOR[slot.req];
  const resolved = slot.source ? skillBySource.get(slot.source) : undefined;
  return resolved ? REQ_COLOR[resolved] : ANY_SKILL_COLOR;
}

function slotLabel(slot: MilestoneSlotResult): string {
  return slot.req === "ANY_SKILL" ? "QR, WR, or L" : slot.req;
}

function slotTitle(slot: MilestoneSlotResult): string {
  const what =
    slot.req === "ANY_SKILL"
      ? "One credit in quantitative reasoning, writing, or a foreign language"
      : REQ_NAME[slot.req];
  if (slot.fill === "done") return `${what} — filled by ${slot.source ?? "a completed course"}`;
  if (slot.fill === "projected")
    return `${what} — planned: ${slot.source ?? "in-progress or planned coursework"}`;
  return `${what} — not yet fulfilled`;
}

/* -------------------------------------------------------------------------- */
/* Status chips                                                               */
/* -------------------------------------------------------------------------- */

const STATUS_CHIP: Record<
  MilestoneStatus,
  { className: string; icon: typeof FiCheck; label: string }
> = {
  met: {
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40",
    icon: FiCheck,
    label: "Met",
  },
  projected: {
    className:
      "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700/40",
    icon: FiClock,
    label: "On track",
  },
  "at-risk": {
    className:
      "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40",
    icon: FiAlertTriangle,
    label: "At risk",
  },
  missed: {
    className:
      "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700/40",
    icon: FiXCircle,
    label: "Missed",
  },
  upcoming: {
    className:
      "bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-800/60 dark:text-gray-400 dark:border-gray-700/50",
    icon: FiClock,
    label: "Upcoming",
  },
};

function chipText(milestone: MilestoneResult): string {
  const base = STATUS_CHIP[milestone.status].label;
  if (milestone.status === "at-risk" && milestone.deadlineTerm) {
    return `Due ${milestone.deadlineTerm}`;
  }
  return base;
}

function StatusChip({ milestone, compact }: { milestone: MilestoneResult; compact: boolean }) {
  const chip = STATUS_CHIP[milestone.status];
  const Icon = chip.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-medium whitespace-nowrap ${
        compact ? "px-1 py-[1px] text-[9px]" : "px-1.5 py-0.5 text-[10px]"
      } ${chip.className}`}
    >
      <Icon size={compact ? 8 : 10} strokeWidth={2.5} />
      {chipText(milestone)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Bars                                                                       */
/* -------------------------------------------------------------------------- */

function SlotBar({
  slot,
  color,
  height,
  delay,
  compact,
}: {
  slot: MilestoneSlotResult;
  color: string;
  height: number;
  delay: number;
  compact: boolean;
}) {
  const label = slotLabel(slot);
  const title = slotTitle(slot);
  const fontSize = compact ? 9 : 11;

  const common =
    "relative flex items-center justify-center rounded-md border w-full overflow-hidden select-none";

  let style: React.CSSProperties;
  let className: string;

  if (slot.fill === "done") {
    style = {
      height,
      backgroundColor: color,
      borderColor: rgba(color, 0.85),
      color: "#ffffff",
      fontSize,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 3px ${rgba(color, 0.35)}`,
    };
    className = `${common} font-semibold`;
  } else if (slot.fill === "projected") {
    style = {
      height,
      backgroundColor: rgba(color, 0.2),
      backgroundImage: `repeating-linear-gradient(135deg, ${rgba(color, 0.42)} 0px, ${rgba(
        color,
        0.42,
      )} 4px, transparent 4px, transparent 9px)`,
      borderColor: rgba(color, 0.6),
      borderStyle: "dashed",
      color,
      fontSize,
    };
    className = `${common} font-semibold`;
  } else {
    style = { height, fontSize };
    className = `${common} border-dashed border-gray-300 dark:border-gray-700/70 bg-gray-100/60 dark:bg-gray-800/30 text-gray-400 dark:text-gray-500 font-medium`;
  }

  return (
    <motion.div
      title={title}
      aria-label={title}
      initial={{ scaleY: 0, opacity: 0 }}
      animate={{ scaleY: 1, opacity: 1 }}
      transition={{ duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ ...style, transformOrigin: "bottom" }}
      className={className}
    >
      <span className="truncate px-1 leading-none tracking-wide">{label}</span>
      {slot.fill === "projected" && !compact && (
        <span className="sr-only">planned</span>
      )}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Credits meter                                                              */
/* -------------------------------------------------------------------------- */

function CreditsMeter({
  milestone,
  compact,
}: {
  milestone: MilestoneResult;
  compact: boolean;
}) {
  const { earned, projected, required } = milestone.credits;
  const earnedPct = Math.min(100, (earned / required) * 100);
  const projectedPct = Math.min(100, (Math.max(projected, earned) / required) * 100);
  const label =
    milestone.spec.key === "senior"
      ? `Credits for graduation: ${required}`
      : `Credits for promotion: ${required}`;
  const round = (n: number) => Math.round(n * 100) / 100;

  return (
    <div className="mt-1">
      {compact ? (
        // Narrow panes cannot hold "Credits for promotion: 8" without
        // truncating it, so compact says the same thing in four words.
        <div className="flex items-baseline gap-1 text-[9px] whitespace-nowrap">
          <span className="text-gray-500 dark:text-gray-400">{required} cr</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="font-mono text-gray-700 dark:text-gray-300">
            {round(earned)}/{required}
          </span>
        </div>
      ) : (
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
            {label}
          </span>
          <span className="text-[10px] font-mono text-gray-700 dark:text-gray-300 shrink-0">
            {round(earned)}/{required}
          </span>
        </div>
      )}
      <div
        className="relative mt-1 w-full rounded-full bg-gray-200 dark:bg-gray-800/70 overflow-hidden"
        style={{ height: compact ? 3 : 5 }}
        title={`${round(earned)} credits earned, ${round(projected)} with planned coursework, ${required} required`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${projectedPct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 rounded-full bg-sky-300/50 dark:bg-sky-500/25"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(56,189,248,0.55) 0px, rgba(56,189,248,0.55) 3px, transparent 3px, transparent 7px)",
          }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${earnedPct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={`absolute inset-y-0 left-0 rounded-full ${
            milestone.credits.met
              ? "bg-emerald-500 dark:bg-emerald-400"
              : "bg-gradient-to-r from-blue-500 to-violet-500"
          }`}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Column                                                                     */
/* -------------------------------------------------------------------------- */

function columnAriaLabel(milestone: MilestoneResult): string {
  const filled = milestone.slots.filter((s) => s.fill === "done").length;
  const planned = milestone.slots.filter((s) => s.fill === "projected").length;
  const by = milestone.deadlineTerm ? ` by ${milestone.deadlineTerm}` : "";
  return (
    `${milestone.spec.label} milestone${by}: ${STATUS_CHIP[milestone.status].label}. ` +
    `${filled} of ${milestone.slots.length} distributional slots complete` +
    (planned > 0 ? `, ${planned} covered by planned coursework` : "") +
    `. ${milestone.credits.earned} of ${milestone.credits.required} course credits.`
  );
}

function MilestoneColumn({
  milestone,
  skillBySource,
  compact,
  barHeight,
  barGap,
  stackHeight,
}: {
  milestone: MilestoneResult;
  skillBySource: Map<string, DistReqKey>;
  compact: boolean;
  barHeight: number;
  barGap: number;
  stackHeight: number;
}) {
  const { spec, slots, isCurrent } = milestone;
  const count = slots.length;

  return (
    <div
      aria-label={columnAriaLabel(milestone)}
      className={`rounded-xl border transition-all ${
        compact ? "p-2 flex-1 min-w-[132px]" : "p-3"
      } ${
        isCurrent
          ? "border-violet-300 dark:border-violet-600/50 bg-violet-50/60 dark:bg-violet-500/[0.07] shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
          : "border-gray-200 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/30"
      }`}
    >
      {/* Title + status. Compact stacks them: a chip beside a wrapping title
          overflows the column at Simulator-pane widths. */}
      {compact ? (
        <div className="mb-1">
          <h4 className="text-[10px] font-semibold text-gray-900 dark:text-white leading-tight">
            {spec.label}
          </h4>
          <div className="mt-1">
            <StatusChip milestone={milestone} compact />
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-tight">
            {spec.label}
          </h4>
          <StatusChip milestone={milestone} compact={false} />
        </div>
      )}

      <CreditsMeter milestone={milestone} compact={compact} />

      {/* The stack. Fixed height across columns so every column's bars share a
          bottom edge and the four read as a rising staircase. */}
      <div
        className="mt-2.5 flex flex-col justify-end"
        style={{ minHeight: stackHeight, gap: barGap }}
      >
        {slots.map((slot, i) => (
          <SlotBar
            key={`${spec.key}-${i}-${slot.req}-${slot.fill}`}
            slot={slot}
            color={slotColor(slot, skillBySource)}
            height={barHeight}
            // Bottom bar first, so each column fills upward.
            delay={0.05 + (count - 1 - i) * 0.035}
            compact={compact}
          />
        ))}
      </div>

      {/* The ring carries "you are here" on its own in compact. */}
      {!compact && isCurrent && milestone.deadlineTerm && (
        <p className="mt-2 text-[10px] font-medium text-violet-600 dark:text-violet-300">
          You are here · checked {milestone.deadlineTerm}
        </p>
      )}

      {!compact && (
        <p className="mt-2 text-[10px] italic leading-snug text-gray-500 dark:text-gray-400">
          {spec.description}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Legend                                                                     */
/* -------------------------------------------------------------------------- */

function LegendRow({ code, name }: { code: DistReqKey; name: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className="inline-flex h-4 w-7 shrink-0 items-center justify-center rounded text-[8px] font-semibold text-white"
        style={{ backgroundColor: REQ_COLOR[code] }}
      >
        {code}
      </span>
      <span className="text-[11px] text-gray-600 dark:text-gray-400 leading-tight">{name}</span>
    </li>
  );
}

function Legend() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800/60 bg-gray-50/70 dark:bg-gray-900/30 p-3 space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
          Skills
        </p>
        <ul className="space-y-1.5">
          <LegendRow code="QR" name="Quantitative Reasoning (2)" />
          <LegendRow code="WR" name="Writing (2)" />
          <LegendRow code="L" name="Foreign Language *" />
        </ul>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
          Disciplinary Areas
        </p>
        <ul className="space-y-1.5">
          <LegendRow code="Hu" name="Humanities & Arts (2)" />
          <LegendRow code="Sc" name="Sciences (2)" />
          <LegendRow code="So" name="Social Sciences (2)" />
        </ul>
      </div>
      <p className="text-[9px] italic leading-snug text-gray-400 dark:text-gray-500">
        *Students are required to take at least one course in a foreign language
        while enrolled at Yale.
      </p>
      <div className="pt-2 border-t border-gray-200 dark:border-gray-800/60 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Your bars
        </p>
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-7 rounded bg-gray-400 dark:bg-gray-500 shrink-0" />
          <span className="text-[11px] text-gray-600 dark:text-gray-400">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-3.5 w-7 rounded border border-dashed border-gray-400 dark:border-gray-500 shrink-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(148,163,184,0.6) 0px, rgba(148,163,184,0.6) 4px, transparent 4px, transparent 9px)",
            }}
          />
          <span className="text-[11px] text-gray-600 dark:text-gray-400">Planned</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-7 rounded border border-dashed border-gray-300 dark:border-gray-700 bg-gray-100/60 dark:bg-gray-800/30 shrink-0" />
          <span className="text-[11px] text-gray-600 dark:text-gray-400">Still open</span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Notes                                                                      */
/* -------------------------------------------------------------------------- */

type NoteGroup = { key: string; heading: string; notes: string[] };

function collectNotes(evaluation: MilestoneEvaluation, limit: number | null): NoteGroup[] {
  const groups: NoteGroup[] = [];
  evaluation.milestones.forEach((m) => {
    const relevant =
      m.isCurrent || m.status === "at-risk" || m.status === "missed";
    if (!relevant || m.notes.length === 0) return;
    groups.push({
      key: m.key,
      heading: m.deadlineTerm
        ? `${m.spec.label} · ${m.deadlineTerm}`
        : m.spec.label,
      notes: m.notes,
    });
  });
  if (limit === null) return groups;
  // Compact mode shows the first few lines overall, newest milestone first.
  let budget = limit;
  const trimmed: NoteGroup[] = [];
  groups.forEach((g) => {
    if (budget <= 0) return;
    trimmed.push({ ...g, notes: g.notes.slice(0, budget) });
    budget -= Math.min(g.notes.length, budget);
  });
  return trimmed;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export type MilestoneSnapshotProps = {
  evaluation: MilestoneEvaluation;
  variant?: "full" | "compact";
  title?: string;
  subtitle?: string;
};

export default function MilestoneSnapshot({
  evaluation,
  variant = "full",
  title,
  subtitle,
}: MilestoneSnapshotProps) {
  const compact = variant === "compact";
  const milestones = evaluation?.milestones ?? [];

  const skillBySource = useMemo(
    () => buildSkillBySource(evaluation),
    [evaluation],
  );

  const barHeight = compact ? 16 : 26;
  const barGap = compact ? 4 : 6;
  const maxSlots = milestones.reduce((max, m) => Math.max(max, m.slots.length), 0);
  const stackHeight = maxSlots * barHeight + Math.max(0, maxSlots - 1) * barGap;

  const noteGroups = collectNotes(evaluation, compact ? 3 : null);

  // Compact lives in the Simulator's half-width pane (about 380px at lg and
  // 510px at xl), which is narrower than four legible columns. The row scrolls
  // rather than crushing, and a fade shows when there is more to the right.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showFade, setShowFade] = useState(false);

  // Remount the bars when the underlying fills change so the staggered fill
  // animation replays on new data, not just on first mount.
  const dataKey = useMemo(
    () =>
      milestones
        .map((m) => `${m.key}:${m.status}:${m.slots.map((s) => s.fill[0]).join("")}`)
        .join("|"),
    [milestones],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !compact) return;
    const update = () =>
      setShowFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [compact, dataKey]);

  if (milestones.length === 0) return null;

  return (
    <section
      className={`rounded-xl border border-gray-200 dark:border-gray-800/50 bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 shadow-neu ${
        compact ? "p-3" : "p-4 sm:p-5"
      }`}
    >
      {(title || subtitle) && (
        <div className={compact ? "mb-2" : "mb-3"}>
          {title && (
            <h3
              className={`font-medium text-gray-900 dark:text-white ${
                compact ? "text-sm" : "text-base sm:text-lg"
              }`}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p
              className={`text-gray-500 dark:text-gray-400 ${
                compact ? "text-[11px]" : "text-xs sm:text-sm"
              } mt-0.5`}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}

      {!compact && (
        <p className="text-[11px] leading-snug text-gray-500 dark:text-gray-400 border-l-2 border-gray-200 dark:border-gray-700/60 pl-2.5 mb-4">
          Milestones toward fulfilling the distributional requirements. The
          milestones are cumulative. No courses taken Credit/D/Fail may be used to
          fulfill a distributional requirement.
        </p>
      )}

      <div
        className={
          compact ? "" : "grid grid-cols-1 lg:grid-cols-[190px_minmax(0,1fr)] gap-4"
        }
      >
        {!compact && <Legend />}

        <div className="relative">
          <div ref={scrollRef} className="overflow-x-auto -mx-1 px-1 pb-1">
            <div
              key={dataKey}
              className={
                compact
                  ? "flex items-end gap-1.5"
                  : "grid grid-cols-4 items-end gap-2 sm:gap-3 min-w-[560px]"
              }
            >
              {milestones.map((m) => (
                <MilestoneColumn
                  key={m.key}
                  milestone={m}
                  skillBySource={skillBySource}
                  compact={compact}
                  barHeight={barHeight}
                  barGap={barGap}
                  stackHeight={stackHeight}
                />
              ))}
            </div>
          </div>
          {compact && showFade && (
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white dark:from-gray-950 to-transparent" />
          )}
        </div>
      </div>

      {noteGroups.length > 0 && (
        <div
          className={`${compact ? "mt-3 pt-2.5" : "mt-4 pt-3"} border-t border-gray-200 dark:border-gray-800/60`}
        >
          <p
            className={`font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 ${
              compact ? "text-[9px]" : "text-[10px]"
            }`}
          >
            What&apos;s left
          </p>
          <div className={compact ? "space-y-1.5" : "space-y-2"}>
            {noteGroups.map((group) => (
              <div key={group.key}>
                {!compact && (
                  <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    {group.heading}
                  </p>
                )}
                <ul className="space-y-0.5 mt-0.5">
                  {group.notes.map((note, i) => (
                    <li
                      key={i}
                      className={`flex gap-1.5 text-gray-600 dark:text-gray-300 leading-snug ${
                        compact ? "text-[10px]" : "text-[11px]"
                      }`}
                    >
                      <span className="text-gray-300 dark:text-gray-600 select-none">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
