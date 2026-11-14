import { READ_TOOLS } from "./read";
import { COURSE_WRITE_TOOLS } from "./courses";
import { PROFILE_WRITE_TOOLS } from "./profile";
import { PLAN_WRITE_TOOLS } from "./plans";
import type { ToolDef } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ALL_TOOLS: ToolDef<any>[] = [
  ...READ_TOOLS,
  ...PROFILE_WRITE_TOOLS,
  ...COURSE_WRITE_TOOLS,
  ...PLAN_WRITE_TOOLS,
];

export { ToolError } from "./types";
export type { ToolContext, ToolDef, ToolAccess } from "./types";
