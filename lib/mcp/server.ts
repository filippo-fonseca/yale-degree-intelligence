/**
 * The DegreeIntelligence MCP server: one McpServer per request, holding only
 * the tools the access token's scopes allow, bound to that token's student.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SCOPE_READ, SCOPE_WRITE } from "@/lib/oauth/config";
import { NotFoundError } from "./store";
import { ALL_TOOLS, ToolError, type ToolContext, type ToolDef } from "./tools";

export const SERVER_NAME = "degree-intelligence";
export const SERVER_VERSION = "1.0.0";

export function serverInstructions(canWrite: boolean): string {
  return [
    "DegreeIntelligence (degreeint.com) is a Yale College degree planner. These tools act on the signed-in student's own account only.",
    "",
    "Start with get_profile: majors, certificates, graduation year and saved plans frame everything else. Program ids come from list_programs; course codes from search_courses (codes are normalized, so \"cpsc 323\" works).",
    "",
    "Two places hold courses. The transcript (My Courses: list_courses, add_courses) is what the student has taken or is taking. Plans (Simulator: get_plan, add_planned_course) hold future terms. Progress is reported both ways: get_degree_progress for the transcript, get_plan_progress for a plan's projection. Terms are written \"Fall 2027\"; plans have Fall and Spring only.",
    "",
    "The numbers come from the app's own rules engine, including Yale's certificate overlap policies. Report them as the app's reading of the requirements, not as an official audit: the student's DUS and Yale's degree audit have the final word.",
    "",
    canWrite
      ? "Every write tool takes dry_run. Use it to show the student what will change before you commit anything consequential, and always confirm before delete_courses, delete_plan or changing declared programs. Writes are idempotent: repeating one reports no change. Every change you make is listed for the student under Settings > Connected apps."
      : "This connection is read-only. If the student wants changes made, they can disconnect and reconnect this app with edit access.",
  ].join("\n");
}

export function toolsForScopes(scopes: string[]): ToolDef[] {
  const canRead = scopes.includes(SCOPE_READ) || scopes.includes(SCOPE_WRITE);
  const canWrite = scopes.includes(SCOPE_WRITE);
  return ALL_TOOLS.filter((t) => (t.scope === "write" ? canWrite : canRead));
}

type CallResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

/** Validates arguments and runs one tool, turning failures into tool errors. */
export async function callTool(tool: ToolDef, ctx: ToolContext, rawArgs: unknown): Promise<CallResult> {
  const parsed = z.object(tool.input).strict().safeParse(rawArgs ?? {});
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "arguments"}: ${i.message}`).join("; ");
    return { isError: true, content: [{ type: "text", text: `Invalid arguments. ${issues}` }] };
  }
  try {
    const result = await tool.run(ctx, parsed.data);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    if (error instanceof ToolError || error instanceof NotFoundError) {
      return { isError: true, content: [{ type: "text", text: error.message }] };
    }
    console.error(`[mcp] ${tool.name} failed`, error);
    return { isError: true, content: [{ type: "text", text: "Something went wrong on DegreeIntelligence's side. Try again shortly." }] };
  }
}

export function createMcpServer(ctx: ToolContext): McpServer {
  const canWrite = ctx.access.scopes.includes(SCOPE_WRITE);
  const server = new McpServer(
    { name: SERVER_NAME, title: "DegreeIntelligence", version: SERVER_VERSION },
    { instructions: serverInstructions(canWrite), capabilities: { tools: {} } },
  );
  for (const tool of toolsForScopes(ctx.access.scopes)) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.input,
        annotations: { title: tool.title, ...tool.annotations },
      },
      // The SDK has already validated against inputSchema; callTool re-checks
      // strictly so unknown fields are refused rather than ignored.
      (async (args: unknown) => callTool(tool, ctx, args)) as never,
    );
  }
  return server;
}
