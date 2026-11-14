/**
 * Renders docs/mcp/tools.md from what the server actually advertises in
 * tools/list, so the reference can't drift from the code. toolDocs.test.ts
 * fails when the file is stale; run `UPDATE_MCP_DOCS=1 npx vitest run
 * lib/mcp/toolDocs.test.ts` to regenerate it.
 */

type JsonSchema = {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  anyOf?: JsonSchema[];
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  maxLength?: number;
  default?: unknown;
};

export type ListedTool = {
  name: string;
  title?: string;
  description?: string;
  inputSchema: JsonSchema;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean };
};

function typeOf(s: JsonSchema): string {
  if (s.enum) return s.enum.map((v) => `\`${JSON.stringify(v)}\``).join(" \\| ");
  if (s.anyOf) return s.anyOf.map(typeOf).join(" \\| ");
  if (s.type === "array") return `${s.items ? typeOf(s.items) : "any"}[]`;
  if (s.type === "object" && s.properties) {
    return `{ ${Object.keys(s.properties).join(", ")} }`;
  }
  return Array.isArray(s.type) ? s.type.join(" \\| ") : (s.type ?? "any");
}

function limits(s: JsonSchema): string {
  const bits: string[] = [];
  if (s.minimum !== undefined) bits.push(`min ${s.minimum}`);
  if (s.maximum !== undefined) bits.push(`max ${s.maximum}`);
  if (s.minItems !== undefined) bits.push(`at least ${s.minItems}`);
  if (s.maxItems !== undefined) bits.push(`at most ${s.maxItems}`);
  if (s.maxLength !== undefined) bits.push(`≤ ${s.maxLength} chars`);
  if (s.default !== undefined) bits.push(`default \`${JSON.stringify(s.default)}\``);
  return bits.length ? ` (${bits.join(", ")})` : "";
}

const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n+/g, " ");

function renderTool(tool: ListedTool): string {
  const a = tool.annotations ?? {};
  const kind = a.readOnlyHint ? "read" : a.destructiveHint ? "write, destructive" : "write";
  const lines = [`### \`${tool.name}\``, "", `*${tool.title ?? tool.name}* · ${kind}${a.idempotentHint ? " · idempotent" : ""}`, ""];
  lines.push(tool.description ?? "", "");
  const props = tool.inputSchema.properties ?? {};
  const required = new Set(tool.inputSchema.required ?? []);
  const names = Object.keys(props);
  if (names.length === 0) {
    lines.push("No arguments.", "");
  } else {
    lines.push("| Argument | Type | Required | Description |", "| --- | --- | --- | --- |");
    for (const name of names) {
      const p = props[name];
      lines.push(
        `| \`${name}\` | ${typeOf(p)} | ${required.has(name) ? "yes" : "no"} | ${cell((p.description ?? "") + limits(p))} |`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function renderToolReference(tools: ListedTool[], instructions: string): string {
  const read = tools.filter((t) => t.annotations?.readOnlyHint);
  const write = tools.filter((t) => !t.annotations?.readOnlyHint);
  return [
    "<!-- Generated from tools/list by lib/mcp/toolDocs.test.ts. Do not edit by hand. -->",
    "",
    "# DegreeIntelligence MCP tool reference",
    "",
    `${tools.length} tools: ${read.length} read (scope \`degree:read\`) and ${write.length} write (scope \`degree:write\`). A read-only connection does not see the write tools at all.`,
    "",
    "Every tool returns one text content block holding JSON. Failures come back as a tool result with `isError: true` and a message meant to be shown to the student.",
    "",
    "## Server instructions",
    "",
    "Sent in the `initialize` result to every client with write access:",
    "",
    "```text",
    instructions,
    "```",
    "",
    "## Read tools",
    "",
    ...read.map(renderTool),
    "## Write tools",
    "",
    "All write tools take `dry_run` (returns `{ dry_run: true, would_change, summary }` and changes nothing) and are idempotent: repeating a call reports `changed: false`. Real changes return `changed: true` with a `summary` and are recorded in the student's audit log.",
    "",
    ...write.map(renderTool),
  ].join("\n");
}
