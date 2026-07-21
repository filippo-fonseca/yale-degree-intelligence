import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { adminAuth, adminDb } from "@/config/firebaseAdmin";
import { requireAuth, isAuthError, rateLimit } from "@/lib/apiAuth";
import { loadUserKey, touchKeyUsage } from "@/lib/dan/keyStore";
import { TOOL_DEFS, executeTool } from "@/lib/dan/tools";
import { buildStudentData } from "@/lib/dan/studentData";

export const runtime = "nodejs";

const HAIKU = "claude-haiku-4-5";
const SONNET = "claude-sonnet-4-6";
const MAX_TOOL_ITERATIONS = 6;
const MAX_OUTPUT_TOKENS = 1024;
const MAX_HISTORY = 12;

const PERSONA = `You are Dan, a sharp, friendly Yale academic advisor (a loyal bulldog at heart). You help students plan their degrees.

CRITICAL: You do not know any course codes, requirement counts, or progress numbers from memory. You MUST call tools to get every factual answer about the student's degree, the catalog, or requirements. Never invent a course code or a number. If a tool returns nothing, say so.

Yale course-load norms: ~5 courses/semester (4-6 range, 6.5 max). Freshmen go lighter (4-4.5). Most courses are 1 credit.

Style: concise, use bullet points and real course codes, show brief reasoning when planning. For double majors, look for courses that satisfy both and keep both on pace. Never recommend a course the student has already completed, is taking, or skipped. At most one light dog phrase per reply.`;

function toolsWithCache(): Anthropic.Tool[] {
  const tools = TOOL_DEFS.map((t) => ({ ...t }));
  if (tools.length) {
    (tools[tools.length - 1] as any).cache_control = { type: "ephemeral" };
  }
  return tools;
}

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const user = await requireAuth(req);
  if (isAuthError(user)) return user;

  const limited = rateLimit(`dan:${user.uid}`, 60, 60 * 60 * 1000);
  if (limited) return limited;

  const uid = user.uid;

  const apiKey = await loadUserKey(uid);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Connect your Anthropic API key in settings to chat with Dan.", code: "NO_KEY" },
      { status: 402 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const incoming: { role: string; content: string }[] = Array.isArray(body.messages)
    ? body.messages
    : [];

  // Trim and sanitize history; ensure it begins with a user turn.
  let history = incoming
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY);
  while (history.length && history[0].role !== "user") history = history.slice(1);
  if (!history.length) {
    return NextResponse.json({ error: "No message provided." }, { status: 400 });
  }

  const model = body.model === "sonnet" ? SONNET : HAIKU;
  const { student, snapshot } = await buildStudentData(uid);
  const client = new Anthropic({ apiKey });

  const anthropicMessages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: PERSONA, cache_control: { type: "ephemeral" } },
    { type: "text", text: snapshot },
  ];
  const tools = toolsWithCache();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      try {
        for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
          const turn = client.messages.stream({
            model,
            max_tokens: MAX_OUTPUT_TOKENS,
            system,
            tools,
            messages: anthropicMessages,
          });

          turn.on("text", (delta: string) => send({ type: "text", text: delta }));
          const final = await turn.finalMessage();

          const toolUses = final.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
          );

          if (final.stop_reason !== "tool_use" || toolUses.length === 0) {
            break;
          }

          anthropicMessages.push({ role: "assistant", content: final.content });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const tu of toolUses) {
            send({ type: "tool", name: tu.name });
            let output: string;
            try {
              output = await executeTool(tu.name, tu.input, { student });
            } catch (e: any) {
              output = JSON.stringify({ error: e?.message || "tool failed" });
            }
            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: output,
            });
          }
          anthropicMessages.push({ role: "user", content: toolResults });
        }

        touchKeyUsage(uid);
        send({ type: "done" });
      } catch (e: any) {
        const status = e?.status;
        const msg =
          status === 401
            ? "Your Anthropic key was rejected. Reconnect it in settings."
            : status === 429
              ? "Anthropic rate limit hit. Wait a moment and try again."
              : "Something went wrong talking to Dan. Try again.";
        send({ type: "error", error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
