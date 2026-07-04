import { NextRequest, NextResponse } from "next/server";
import { resolveToken } from "@/lib/mcp/tokenStore";
import { buildStudentData } from "@/lib/dan/studentData";
import { TOOL_DEFS, executeTool, type StudentData } from "@/lib/dan/tools";

export const runtime = "nodejs";

// Dependency-free Model Context Protocol server (Streamable HTTP transport,
// JSON-RPC 2.0). Stateless and read-only: it exposes the same deterministic
// degree tools Dan uses, scoped to the caller's own data via their MCP token.

const SERVER_INFO = { name: "degree-intelligence", version: "3.0.0" };
const DEFAULT_PROTOCOL_VERSION = "2025-06-18";

const MCP_TOOLS = TOOL_DEFS.map((t) => ({
  name: t.name,
  description: t.description,
  inputSchema: t.input_schema,
}));

type JsonRpcMessage = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: any;
};

function rpcResult(id: JsonRpcMessage["id"], result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function rpcError(id: JsonRpcMessage["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function handleRpc(
  msg: JsonRpcMessage,
  getStudent: () => Promise<StudentData>,
): Promise<object | null> {
  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: params?.protocolVersion || DEFAULT_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    case "notifications/initialized":
    case "notifications/cancelled":
      return null;

    case "ping":
      return rpcResult(id, {});

    case "tools/list":
      return rpcResult(id, { tools: MCP_TOOLS });

    case "tools/call": {
      const name = params?.name;
      const args = params?.arguments ?? {};
      if (!TOOL_DEFS.some((t) => t.name === name)) {
        return rpcError(id, -32602, `Unknown tool: ${name}`);
      }
      try {
        const student = await getStudent();
        const output = await executeTool(name, args, { student });
        return rpcResult(id, { content: [{ type: "text", text: output }] });
      } catch (e: any) {
        return rpcResult(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: e?.message || "tool failed" }),
            },
          ],
          isError: true,
        });
      }
    }

    default:
      if (isNotification) return null;
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(rpcError(null, -32001, "Unauthorized"), {
      status: 401,
    });
  }

  const uid = await resolveToken(authHeader.split("Bearer ")[1].trim());
  if (!uid) {
    return NextResponse.json(rpcError(null, -32001, "Unauthorized"), {
      status: 401,
    });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(rpcError(null, -32700, "Parse error"), {
      status: 400,
    });
  }

  // Build the student snapshot at most once per request, lazily.
  let cache: StudentData | null = null;
  const getStudent = async () => {
    if (!cache) cache = (await buildStudentData(uid)).student;
    return cache;
  };

  if (Array.isArray(body)) {
    const responses = (
      await Promise.all(body.map((m) => handleRpc(m, getStudent)))
    ).filter((r): r is object => r !== null);
    if (!responses.length) return new NextResponse(null, { status: 202 });
    return NextResponse.json(responses);
  }

  const response = await handleRpc(body, getStudent);
  if (!response) return new NextResponse(null, { status: 202 });
  return NextResponse.json(response);
}

// Server-initiated SSE streams are not supported; this server is request/response only.
export async function GET() {
  return NextResponse.json(
    rpcError(null, -32000, "Streaming not supported; use POST"),
    { status: 405 },
  );
}
