"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiCheck } from "react-icons/fi";
import { Course } from "@/lib/types";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import ModalShell, { ModalHeader } from "@/components/ui/ModalShell";
import {
  GRADES,
  SEMESTERS,
  CREDITS,
  YEARS,
} from "@/components/ManualCourseEntryModal/ManualCourseEntryModal";

interface EditCourseModalProps {
  course: Course | null;
  onClose: () => void;
  onSave: (
    courseId: string,
    updates: Partial<Omit<Course, "id" | "userId">>,
  ) => Promise<void>;
}

const inputClasses =
  "w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-pink-500/50";

const selectClasses =
  "w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-white focus:outline-none focus:border-pink-500/50";

const labelClasses =
  "block text-[10px] text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wide";

/** Stored values can predate the current option lists (old years, odd
 * transcript grades, custom credit loads), so the stored value always
 * appears in its dropdown rather than silently snapping to something else. */
function withStored<T>(options: readonly T[], stored: T): T[] {
  return options.includes(stored) ? [...options] : [stored, ...options];
}

export function EditCourseModal({
  course,
  onClose,
  onSave,
}: EditCourseModalProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("In Progress");
  const [semester, setSemester] = useState("Fall");
  const [year, setYear] = useState<number>(YEARS[0]);
  const [credits, setCredits] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!course) return;
    setCode(course.code);
    setName(course.name ?? getCourseNameFromCode(course.code) ?? "");
    setGrade(course.grade ?? "In Progress");
    setSemester(course.semester);
    setYear(course.year);
    setCredits(course.credits);
    setSaving(false);
    setError("");
  }, [course]);

  const handleSave = async () => {
    if (!course) return;
    const newCode = code.trim().toUpperCase();
    if (!newCode) {
      setError("Course code can't be empty.");
      return;
    }

    setSaving(true);
    setError("");

    // The name is only stored when it differs from what the catalog would
    // derive for the (possibly new) code; otherwise the override is cleared
    // so the catalog stays the source of truth.
    const trimmedName = name.trim();
    const catalogName = getCourseNameFromCode(newCode);
    const nameOverride =
      trimmedName && trimmedName !== catalogName ? trimmedName : "";
    const inProgress = grade === "In Progress";

    try {
      await onSave(course.id, {
        code: newCode,
        name: nameOverride,
        grade: inProgress ? null : grade,
        semester,
        year,
        credits,
        status: inProgress ? "in-progress" : "completed",
      });
      toast.success("Course updated");
      onClose();
    } catch (err) {
      console.error("Error updating course:", err);
      setError("Failed to save changes. Please try again.");
      toast.error("Couldn't update course");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={!!course}
      onClose={onClose}
      label="edit course"
      note={course?.code}
    >
      <div className="px-5 pb-5 pt-2">
        <ModalHeader title="Edit course">
          Every field is yours to change; the catalog fills in the name for
          known codes.
        </ModalHeader>

        <div className="mt-4 space-y-3">
          <div>
            <label className={labelClasses}>Course code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputClasses}
              placeholder="e.g. CPSC 201"
            />
          </div>

          <div>
            <label className={labelClasses}>Course name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClasses}
              placeholder={
                getCourseNameFromCode(code.trim().toUpperCase()) ??
                "Course name (optional)"
              }
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className={labelClasses}>Grade</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className={selectClasses}
              >
                {withStored(GRADES, grade).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className={selectClasses}
              >
                {withStored(SEMESTERS, semester).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Year</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className={selectClasses}
              >
                {withStored(YEARS, year).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Credits</label>
              <select
                value={credits}
                onChange={(e) => setCredits(parseFloat(e.target.value))}
                className={selectClasses}
              >
                {withStored(CREDITS, credits).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="di-btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="di-btn-primary"
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <FiCheck size={14} />
                Save changes
              </>
            )}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
