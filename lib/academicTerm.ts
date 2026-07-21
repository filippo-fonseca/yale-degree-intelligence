// Canonical academic-term math. Every surface that needs to know "what term is
// it right now" must go through here, so the app never disagrees with itself.
//
// The rule, in one line: January through May is Spring of that year, June
// through December is Fall of that year. The flip happens on June 1, so once
// the spring term has ended the app already treats Fall as the current term
// instead of leaving the student parked in a semester they finished.
//
// This is calendar math only. It says nothing about the stored status of a
// student's courses; a transcript that still lists spring courses as
// "in-progress" does not make Spring the current term.

export type Term = "Spring" | "Fall";

export interface AcademicTerm {
  term: Term;
  year: number;
}

// Chronological order within a year.
const TERM_ORDER: Record<Term, number> = { Spring: 0, Fall: 1 };

/** The term the calendar is in on `date` (defaults to now). */
export function getCurrentTerm(date: Date = new Date()): AcademicTerm {
  // getMonth() is 0-indexed, so month 5 is June: the first month of Fall.
  return {
    term: date.getMonth() < 5 ? "Spring" : "Fall",
    year: date.getFullYear(),
  };
}

/** `{ term: "Fall", year: 2026 }` becomes `"Fall 2026"`. */
export function formatTerm(term: AcademicTerm): string {
  return `${term.term} ${term.year}`;
}

/** The current term as a display name, e.g. `"Fall 2026"`. */
export function currentTermName(date: Date = new Date()): string {
  return formatTerm(getCurrentTerm(date));
}

/** Parse `"Fall 2026"`. Returns null for anything that is not a term name. */
export function parseTermName(name: string): AcademicTerm | null {
  const [term, yearStr] = (name ?? "").trim().split(/\s+/);
  if (term !== "Spring" && term !== "Fall") return null;
  const year = parseInt(yearStr, 10);
  if (!Number.isFinite(year)) return null;
  return { term, year };
}

/**
 * Chronological comparison of two term names, suitable for `Array.sort`.
 * Negative when `a` comes first. Unparseable names sort last.
 */
export function compareTermNames(a: string, b: string): number {
  const pa = parseTermName(a);
  const pb = parseTermName(b);
  if (!pa && !pb) return 0;
  if (!pa) return 1;
  if (!pb) return -1;
  if (pa.year !== pb.year) return pa.year - pb.year;
  return TERM_ORDER[pa.term] - TERM_ORDER[pb.term];
}

/** True when `name` is the term the calendar is in on `date`. */
export function isCurrentTerm(name: string, date: Date = new Date()): boolean {
  const parsed = parseTermName(name);
  if (!parsed) return false;
  return compareTermNames(name, currentTermName(date)) === 0;
}

/** True when `name` is strictly earlier than the current term. */
export function isPastTerm(name: string, date: Date = new Date()): boolean {
  const parsed = parseTermName(name);
  if (!parsed) return false;
  return compareTermNames(name, currentTermName(date)) < 0;
}
