"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { FiUpload } from "react-icons/fi";
import { ModalShell, ModalHeader } from "@/components/ui/ModalShell";
import { SelectMenu, type SelectMenuOption } from "@/components/ui/SelectMenu";
import { ShinyButton } from "@/components/ui/shiny-button";
import { GhostButton } from "@/components/ui/ghost-button";
import {
  parseCourseTableIcs,
  type IcsImportedCourse,
  type IcsParseFailure,
} from "@/lib/icsImport";
import { currentTermName, isPastTerm } from "@/lib/academicTerm";
import type { Plan } from "./planTypes";

export const ICS_IMPORT_CANVAS_KEY = "__canvas__";

export type IcsImportRequest = {
  planKey: string;
  termName: string;
  courses: IcsImportedCourse[];
};

function parseErrorCopy(error: IcsParseFailure["error"]): string {
  switch (error) {
    case "empty":
      return "That file is empty.";
    case "not-calendar":
      return "That doesn't look like a calendar file. On CourseTable, open your worksheet and choose Download as ICS.";
    case "no-events":
      return "This calendar has no class meetings in it.";
    case "no-courses":
      return "We couldn't find any Yale course codes in this calendar.";
  }
}

function Key({ children }: { children: string }) {
  return (
    <span className="rounded border border-black/[0.08] bg-[#fafafa] px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-gray-300">
      {children}
    </span>
  );
}

function pickDefaultTerm(
  detected: string | null,
  semesterNames: string[],
): string {
  if (detected && semesterNames.includes(detected)) return detected;
  const current = currentTermName();
  if (semesterNames.includes(current)) return current;
  const upcoming = semesterNames.find((name) => !isPastTerm(name));
  return upcoming ?? semesterNames[0] ?? "";
}

export default function SimulatorIcsImportModal({
  open,
  onClose,
  onImport,
  canvasSemesters,
  plans,
  currentPlanName,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (request: IcsImportRequest) => void;
  canvasSemesters: Array<{ name: string }>;
  plans: Plan[];
  currentPlanName: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<IcsImportedCourse[] | null>(null);
  const [detectedTermName, setDetectedTermName] = useState<string | null>(null);
  const [planKey, setPlanKey] = useState(ICS_IMPORT_CANVAS_KEY);
  const [termName, setTermName] = useState("");

  const reset = useCallback(() => {
    setDragOver(false);
    setFileName(null);
    setError(null);
    setCourses(null);
    setDetectedTermName(null);
    setPlanKey(ICS_IMPORT_CANVAS_KEY);
    setTermName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const semesterNames = useMemo(() => {
    if (planKey !== ICS_IMPORT_CANVAS_KEY && planKey !== currentPlanName) {
      const plan = plans.find((p) => p.name === planKey);
      if (plan?.semesters.length) return plan.semesters.map((s) => s.name);
    }
    return canvasSemesters.map((s) => s.name);
  }, [planKey, currentPlanName, plans, canvasSemesters]);

  const planOptions: SelectMenuOption<string>[] = useMemo(() => {
    const currentHint = currentPlanName
      ? `currently “${currentPlanName}”`
      : "unsaved canvas";
    return [
      {
        value: ICS_IMPORT_CANVAS_KEY,
        label: "This canvas",
        hint: currentHint,
      },
      ...plans.map((plan) => ({
        value: plan.name,
        label: plan.name,
        hint: plan.isDefault
          ? "default"
          : plan.name === currentPlanName
            ? "open now"
            : undefined,
      })),
    ];
  }, [plans, currentPlanName]);

  const semesterOptions: SelectMenuOption<string>[] = useMemo(
    () =>
      semesterNames.map((name) => ({
        value: name,
        label: name,
        hint: isPastTerm(name)
          ? "locked"
          : name === detectedTermName
            ? "from the calendar"
            : undefined,
      })),
    [semesterNames, detectedTermName],
  );

  useEffect(() => {
    if (!open) return;
    setTermName((prev) => {
      if (prev && semesterNames.includes(prev)) return prev;
      return pickDefaultTerm(detectedTermName, semesterNames);
    });
  }, [open, semesterNames, detectedTermName]);

  const ingestFile = async (file: File) => {
    setError(null);
    setCourses(null);
    setFileName(file.name);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setError("We couldn't read that file.");
      return;
    }
    const result = parseCourseTableIcs(text, file.name);
    if (!result.ok) {
      setError(parseErrorCopy(result.error));
      return;
    }
    setCourses(result.courses);
    setDetectedTermName(result.detectedTermName);
    setTermName(pickDefaultTerm(result.detectedTermName, semesterNames));
  };

  const onDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void ingestFile(file);
  };

  const selectedIsPast = termName ? isPastTerm(termName) : false;
  const selectedMissing =
    !!termName && semesterNames.length > 0 && !semesterNames.includes(termName);
  const canImport =
    !!courses &&
    courses.length > 0 &&
    !!termName &&
    !selectedIsPast &&
    !selectedMissing;

  const handleImport = () => {
    if (!canImport || !courses) return;
    onImport({ planKey, termName, courses });
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      label="import from coursetable"
      note=".ics"
      maxWidth="max-w-lg"
    >
      <div className="p-5 sm:p-6">
        <ModalHeader title="Import a CourseTable calendar">
          CourseTable exports one semester as an .ics file. We read the course
          codes and the date range, then drop those courses onto the semester
          you pick.
        </ModalHeader>

        <div className="mt-5 rounded-xl border border-black/[0.06] bg-[#fafafa] p-4 dark:border-white/[0.07] dark:bg-white/[0.03]">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
            How to get the file
          </p>
          <ol className="mt-3 space-y-2">
            <li className="flex items-start gap-3">
              <span
                className="mt-0.5 shrink-0 font-mono text-[11px] text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              >
                01
              </span>
              <p className="flex-1 font-sf text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                Open{" "}
                <a
                  href="https://www.coursetable.com/worksheet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-900 underline underline-offset-2 transition-colors hover:text-pink-600 dark:text-white dark:hover:text-pink-300"
                >
                  CourseTable
                </a>{" "}
                and go to your worksheet for that semester
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span
                className="mt-0.5 shrink-0 font-mono text-[11px] text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              >
                02
              </span>
              <p className="flex-1 font-sf text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                Click <Key>Download as ICS</Key> and drop the file here
              </p>
            </li>
          </ol>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".ics,text/calendar"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void ingestFile(file);
          }}
        />

        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
            dragOver
              ? "border-pink-400/70 bg-pink-50/60 dark:border-pink-400/40 dark:bg-pink-500/10"
              : "border-black/[0.12] bg-white hover:border-black/25 dark:border-white/[0.12] dark:bg-white/[0.03] dark:hover:border-white/25"
          }`}
        >
          <FiUpload className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <span className="font-sf text-sm text-gray-700 dark:text-gray-200">
            {fileName ? fileName : "Drop an .ics file, or click to choose one"}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
            one semester per file
          </span>
        </button>

        {error && (
          <p className="mt-3 font-sf text-xs text-red-500 dark:text-red-400">
            {error}
          </p>
        )}

        {courses && (
          <>
            <div className="mt-4 max-h-40 overflow-y-auto rounded-xl border border-black/[0.06] bg-[#fafafa] dark:border-white/[0.07] dark:bg-white/[0.03]">
              {courses.map((course) => (
                <div
                  key={course.code}
                  className="flex items-baseline justify-between gap-3 border-b border-black/[0.05] px-3.5 py-2 last:border-b-0 dark:border-white/[0.06]"
                >
                  <div className="min-w-0">
                    <p className="font-sf text-sm font-medium text-gray-900 dark:text-white">
                      {course.code}
                    </p>
                    <p className="truncate font-sf text-xs text-gray-500 dark:text-gray-400">
                      {course.title}
                    </p>
                  </div>
                  {!course.inCatalog && (
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500">
                      not in catalog
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 font-sf text-[11px] text-gray-400 dark:text-gray-500">
              {courses.length} course{courses.length === 1 ? "" : "s"}
              {detectedTermName ? ` · calendar looks like ${detectedTermName}` : ""}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                  Plan
                </p>
                <SelectMenu
                  value={planKey}
                  options={planOptions}
                  onChange={setPlanKey}
                  label="Plan to fill"
                />
              </div>
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                  Semester
                </p>
                {semesterOptions.length > 0 && termName ? (
                  <SelectMenu
                    value={
                      semesterNames.includes(termName)
                        ? termName
                        : semesterNames[0]
                    }
                    options={semesterOptions}
                    onChange={setTermName}
                    label="Semester to fill"
                  />
                ) : (
                  <p className="font-sf text-sm text-gray-500 dark:text-gray-400">
                    No semesters on this plan.
                  </p>
                )}
              </div>
            </div>

            {selectedIsPast && (
              <p className="mt-3 font-sf text-xs text-amber-600 dark:text-amber-400">
                {termName} is already over, so it can&apos;t be filled from a
                calendar. Pick the current term or a later one.
              </p>
            )}
            {selectedMissing && (
              <p className="mt-3 font-sf text-xs text-amber-600 dark:text-amber-400">
                {termName} isn&apos;t on this plan. Pick a semester that is.
              </p>
            )}
          </>
        )}

        <div className="mt-5 flex justify-end gap-2 font-sf">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <ShinyButton
            size="sm"
            onClick={handleImport}
            disabled={!canImport}
          >
            Add to semester
          </ShinyButton>
        </div>
      </div>
    </ModalShell>
  );
}
