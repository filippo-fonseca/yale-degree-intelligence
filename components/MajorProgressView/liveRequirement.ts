import type { Requirement } from "./RequirementModal";
import type { ReqStats } from "./requirementStatus";

const reqKey = (req: { id?: string; name: string }) => req.id ?? req.name;

/**
 * The requirement modal is opened with a copy of the requirement, and that
 * copy goes stale the moment the student skips, unskips, or removes a course
 * from inside it: the page recomputes, the modal keeps the old pills. Resolve
 * the opened requirement against the freshly computed cells each render so
 * the modal always shows what the board shows. Falls back to the snapshot
 * only if the requirement vanished from the cells entirely.
 */
export function resolveLiveRequirement(
  snapshot: Requirement | null,
  cells: ReqStats[],
): Requirement | null {
  if (!snapshot) return null;
  const key = reqKey(snapshot);
  const live = cells.find((s) => reqKey(s.req) === key);
  if (!live) return snapshot;
  return {
    id: live.req.id,
    name: live.req.name,
    description: live.req.description,
    required: live.req.required,
    options: live.req.options ?? [],
  };
}
