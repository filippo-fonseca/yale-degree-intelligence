"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiUpload, FiCheck } from "react-icons/fi";
import { ModalShell, ModalHeader } from "@/components/ui/ModalShell";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { ShinyButton } from "@/components/ui/shiny-button";
import { GhostButton } from "@/components/ui/ghost-button";
import { parseTermName } from "@/lib/academicTerm";
import {
  parseIcsCalendar,
  termNameFromParse,
  type IcsImportedCourse,
  type IcsParseResult,
} from "@/lib/icsImport";
import type { Plan } from "./planTypes";

export type IcsImportTarget = {
  courses: IcsImportedCourse[];
  semesterName: string;
  /** `"current"` is the canvas on screen. A number is an index into savedPlans. */
  planTarget: "current" | number;
};

const CURRENT_PLAN = "current";

function planValue(target: "current" | number): string {
  return target === "current" ? CURRENT_PLAN : `plan:${target}`;
}

function parsePlanValue(value: string): "current" | number {
  if (value === CURRENT_PLAN) return "current";
  const index = parseInt(value.slice("plan:".length), 10);
  return Number.isFinite(index) ? index : "current";
}

async function readIcsFile(file: File): Promise<string> {
  return file.text();
}

function isIcsFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".ics") ||
    name.endsWith(".ical") ||
    file.type === "text/calendar" ||
    file.type === "text/x-vcalendar"
  );
}

export default function SimulatorIcsImportModal({
  open,
  onClose,
  onImport,
  plans,
  currentPlanName,
  canvasSemesterNames,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (target: IcsImportTarget) => void;
  plans: Plan[];
  currentPlanName: string | null;
  /** Semester labels on the canvas right now. */
  canvasSemesterNames: string[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<IcsParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [semesterName, setSemesterName] = useState<string>("");
  const [planTarget, setPlanTarget] = useState<"current" | number>("current");

  useEffect(() => {
    if (open) return;
    setDragOver(false);
    setParseError(null);
    setParsed(null);
    setFileName(null);
    setSemesterName("");
    setPlanTarget("current");
  }, [open]);

  const ingestFile = async (file: File) => {
    if (!isIcsFile(file)) {
      setParseError("Use a .ics file exported from CourseTable.");
      setParsed(null);
      setFileName(null);
      return;
    }
    try {
      const text = await readIcsFile(file);
      const result = parseIcsCalendar(text, file.name);
      if (result.courses.length === 0) {
        setParsed(result);
        setFileName(file.name);
        setParseError(
          result.warnings[0] ?? "No courses were found in that calendar.",
        );
        return;
      }
      setParseError(null);
      setParsed(result);
      setFileName(file.name);
      const detected = termNameFromParse(result);
      if (detected) setSemesterName(detected);
      else if (canvasSemesterNames[0]) setSemesterName(canvasSemesterNames[0]);
    } catch {
      setParseError("Could not read that file.");
      setParsed(null);
    }
  };

  const selectedPlanSemesters = useMemo(() => {
    if (planTarget === "current") return canvasSemesterNames;
    return (plans[planTarget]?.semesters ?? []).map((s) => s.name);
  }, [planTarget, canvasSemesterNames, plans]);

  const detectedLabel = parsed ? termNameFromParse(parsed) : null;

  const semesterOptions = useMemo(() => {
    const names = [...selectedPlanSemesters];
    if (detectedLabel && !names.includes(detectedLabel)) names.push(detectedLabel);
    if (semesterName && !names.includes(semesterName)) names.push(semesterName);
    return names.map((name) => ({
      value: name,
      label: name,
      hint:
        detectedLabel && name === detectedLabel
          ? parsed?.detectionSource === "dates"
            ? "Detected from the calendar dates"
            : "Detected from the file name"
          : undefined,
    }));
  }, [selectedPlanSemesters, parsed, semesterName, detectedLabel]);

  const planOptions = useMemo(
    () => [
      {
        value: CURRENT_PLAN,
        label: currentPlanName
          ? `Current canvas · ${currentPlanName}`
          : "Current canvas",
        hint: currentPlanName
          ? "The plan you have open"
          : "Whatever is on the board right now",
      },
      ...plans.map((plan, index) => ({
        value: `plan:${index}`,
        label: plan.name,
        hint:
          plan.name === currentPlanName
            ? "Currently open"
            : plan.isDefault
              ? "Default"
              : undefined,
      })),
    ],
    [plans, currentPlanName],
  );

  const effectiveSemester =
    semesterName ||
    (semesterOptions[0]?.value ?? "");

  const canImport =
    !!parsed &&
    parsed.courses.length > 0 &&
    !!effectiveSemester &&
    parseTermName(effectiveSemester) !== null;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      label="import schedule"
      note="coursetable ics"
      maxWidth="max-w-lg"
    >
      <div className="p-5 sm:p-6">
        <ModalHeader title="Import a CourseTable calendar">
          CourseTable can download your worksheet as an .ics file for one
          semester. We read the course codes and put them on a plan — meeting
          times stay on the calendar.
        </ModalHeader>

        <ol className="mt-4 space-y-1.5">
          {[
            "Open your worksheet on CourseTable",
            "Download as ICS",
            "Drop the file here",
          ].map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span
                className="mt-0.5 shrink-0 font-mono text-[11px] text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="flex-1 font-sf text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {step}
              </p>
            </li>
          ))}
        </ol>

        <input
          ref={fileInputRef}
          type="file"
          accept=".ics,.ical,text/calendar"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void ingestFile(file);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void ingestFile(file);
          }}
          className={`mt-5 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 font-sf transition-colors ${
            dragOver
              ? "border-pink-400 bg-pink-50/70 dark:border-pink-500/40 dark:bg-pink-500/10"
              : parsed
                ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/[0.06]"
                : "border-black/[0.12] bg-[#fafafa] hover:border-black/[0.2] dark:border-white/[0.12] dark:bg-white/[0.03] dark:hover:border-white/[0.2]"
          }`}
        >
          {parsed && parsed.courses.length > 0 ? (
            <>
              <FiCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                {parsed.courses.length} course
                {parsed.courses.length === 1 ? "" : "s"} in {fileName}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Click or drop a different file to replace
              </span>
            </>
          ) : (
            <>
              <FiUpload className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Drop an .ics file, or click to browse
              </span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                One semester per file, the way CourseTable exports it
              </span>
            </>
          )}
        </button>

        {parseError && (
          <p className="mt-3 font-sf text-xs text-red-500 dark:text-red-400">
            {parseError}
          </p>
        )}

        {parsed && parsed.courses.length > 0 && (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                  Semester
                </span>
                <SelectMenu
                  label="Semester to fill"
                  value={effectiveSemester}
                  options={semesterOptions}
                  onChange={setSemesterName}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                  Plan
                </span>
                <SelectMenu
                  label="Plan to fill"
                  value={planValue(planTarget)}
                  options={planOptions}
                  onChange={(value) => setPlanTarget(parsePlanValue(value))}
                />
              </label>
            </div>

            <div className="mt-4 max-h-40 overflow-y-auto rounded-xl border border-black/[0.06] bg-[#fafafa] dark:border-white/[0.07] dark:bg-white/[0.03]">
              <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                {parsed.courses.map((course) => (
                  <li
                    key={course.code}
                    className="flex items-baseline justify-between gap-3 px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="font-sf text-sm font-medium text-gray-800 dark:text-gray-100">
                        {course.code}
                      </span>
                      {course.title && (
                        <span className="mt-0.5 block truncate font-sf text-[11px] text-gray-500 dark:text-gray-400">
                          {course.title}
                        </span>
                      )}
                    </span>
                    {!course.inCatalog && (
                      <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        not in catalog
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <div className="mt-5 flex justify-end gap-2 font-sf">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <ShinyButton
            size="sm"
            disabled={!canImport}
            onClick={() => {
              if (!parsed || !canImport) return;
              onImport({
                courses: parsed.courses,
                semesterName: effectiveSemester,
                planTarget,
              });
            }}
          >
            Add to {effectiveSemester || "semester"}
          </ShinyButton>
        </div>
      </div>
    </ModalShell>
  );
}
