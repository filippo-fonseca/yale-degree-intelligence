/**
 * The MCP server's call budget. Shared by the route (which enforces it), the
 * handler (which explains it when it is hit) and the server instructions
 * (which tell the model up front), so the three never disagree.
 *
 * Only tools/call counts. The handshake, notifications and tools/list are
 * free, so a client reconnecting does not eat the budget.
 */

/** Per connection (one OAuth grant or personal token), per ten minutes. */
export const CALLS_PER_CONNECTION = 150;
export const CONNECTION_WINDOW_MS = 10 * 60 * 1000;

/** Per student, across every app they have connected, per day. */
export const CALLS_PER_STUDENT_PER_DAY = 1500;
export const STUDENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export type LimitHit = { scope: "connection" | "student"; retryAfterSeconds: number };

/** One line for the server instructions. */
export function budgetSummary(): string {
  return `Calls are budgeted: ${CALLS_PER_CONNECTION} tool calls per 10 minutes for this connection, and ${CALLS_PER_STUDENT_PER_DAY} a day across all of the student's connected apps. Plan before calling, reuse what you already fetched, and batch: add_courses and delete_courses take lists, search_courses filters server-side, and get_plan_progress checks a whole plan in one call. If a call says the limit was reached, stop and tell the student when it resets instead of retrying.`;
}

/** The tool result text a model sees when a call is refused. */
export function limitMessage(hit: LimitHit): string {
  const wait =
    hit.retryAfterSeconds >= 3600
      ? `about ${Math.ceil(hit.retryAfterSeconds / 3600)} hour(s)`
      : hit.retryAfterSeconds >= 60
        ? `about ${Math.ceil(hit.retryAfterSeconds / 60)} minute(s)`
        : `${hit.retryAfterSeconds} seconds`;
  const which =
    hit.scope === "connection"
      ? `this connection's limit of ${CALLS_PER_CONNECTION} tool calls per 10 minutes`
      : `the daily limit of ${CALLS_PER_STUDENT_PER_DAY} tool calls across all of this student's connected apps`;
  return `Rate limit reached: ${which}. Nothing was run. Do not retry now; wait ${wait}. Tell the student, and when you resume, batch work (add_courses and delete_courses take lists) and reuse results you already have.`;
}
