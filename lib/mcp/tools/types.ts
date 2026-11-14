import type { z } from "zod";
import type { DegreeStore } from "../store";
import type { AuditLog } from "../audit";

export type ToolAccess = {
  uid: string;
  email: string;
  grantId: string;
  clientName: string;
  scopes: string[];
};

export type ToolContext = {
  store: DegreeStore;
  audit: AuditLog;
  access: ToolAccess;
  now: () => Date;
};

export type ToolAnnotations = {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
};

export type ToolDef<S extends z.ZodRawShape = z.ZodRawShape> = {
  name: string;
  title: string;
  description: string;
  /** Read tools need degree:read; write tools need degree:write. */
  scope: "read" | "write";
  annotations: ToolAnnotations;
  input: S;
  run: (ctx: ToolContext, args: z.objectOutputType<S, z.ZodTypeAny>) => Promise<unknown>;
};

/** A failure the agent should see and can act on (bad code, missing plan). */
export class ToolError extends Error {}

export function defineTool<S extends z.ZodRawShape>(def: ToolDef<S>): ToolDef<S> {
  return def;
}

export const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export function writeAnnotations(opts: { destructive: boolean; idempotent: boolean }): ToolAnnotations {
  return {
    readOnlyHint: false,
    destructiveHint: opts.destructive,
    idempotentHint: opts.idempotent,
    openWorldHint: false,
  };
}
