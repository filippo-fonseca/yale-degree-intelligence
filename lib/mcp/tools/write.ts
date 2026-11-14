import { z } from "zod";
import type { ToolContext } from "./types";

export const dryRunField = {
  dry_run: z
    .boolean()
    .optional()
    .describe(
      "Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit.",
    ),
};

export type WriteOutcome = {
  /** One plain sentence, shown in the student's activity log. */
  summary: string;
  /** False when the request was already true (idempotent repeat): nothing saved. */
  changed: boolean;
  detail?: Record<string, unknown>;
  /** Extra fields returned to the agent (the resulting course, plan, etc.). */
  result?: Record<string, unknown>;
};

/**
 * The one path every write tool takes: plan the change, then either report it
 * (dry run) or apply it, record it in the student's audit log and refresh the
 * friends projection. `plan` must not write; `apply` does.
 */
export async function performWrite(
  ctx: ToolContext,
  tool: string,
  dryRun: boolean | undefined,
  plan: () => Promise<WriteOutcome & { apply?: () => Promise<Record<string, unknown> | void> }>,
  opts: { touchesCourses?: boolean } = {},
) {
  const outcome = await plan();
  if (dryRun) {
    return {
      dry_run: true,
      would_change: outcome.changed,
      summary: outcome.changed ? `Would: ${outcome.summary}` : `No change needed: ${outcome.summary}`,
      ...outcome.result,
    };
  }
  if (!outcome.changed || !outcome.apply) {
    return { changed: false, summary: `No change needed: ${outcome.summary}`, ...outcome.result };
  }
  const applied = (await outcome.apply()) ?? {};
  await ctx.audit.record(ctx.access.uid, {
    at: ctx.now().getTime(),
    grantId: ctx.access.grantId,
    clientName: ctx.access.clientName,
    tool,
    summary: outcome.summary,
    ...(outcome.detail ? { detail: outcome.detail } : {}),
  });
  if (opts.touchesCourses !== false) await ctx.store.afterWrite();
  return { changed: true, summary: outcome.summary, ...outcome.result, ...applied };
}
