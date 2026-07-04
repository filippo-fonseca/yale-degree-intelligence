import { auth } from "@/config/firebase";

// Client-side helpers for talking to the Dan API and BYOK key endpoints.
// Each call attaches the current user's Firebase ID token.

async function authHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export interface DanKeyStatus {
  connected: boolean;
  last4?: string | null;
  lastUsedAt?: string | null;
}

export async function getDanKeyStatus(): Promise<DanKeyStatus> {
  const res = await fetch("/api/dan/key", { headers: await authHeader() });
  if (!res.ok) return { connected: false };
  return res.json();
}

export async function saveDanKey(
  apiKey: string
): Promise<{ ok: true; last4?: string } | { ok: false; error: string }> {
  const res = await fetch("/api/dan/key", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ apiKey }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error || "Failed to save key." };
  return { ok: true, last4: data.last4 };
}

export async function deleteDanKey(): Promise<void> {
  await fetch("/api/dan/key", { method: "DELETE", headers: await authHeader() });
}

export interface DanMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DanStreamHandlers {
  onText: (delta: string) => void;
  onTool?: (name: string) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
}

// Streams a Dan turn. Resolves when the stream ends. `code` "NO_KEY" means the
// user must connect a key first.
export async function streamDan(
  messages: DanMessage[],
  handlers: DanStreamHandlers,
  model?: "haiku" | "sonnet"
): Promise<void> {
  const res = await fetch("/api/dan", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ messages, model }),
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    handlers.onError?.(
      data.code === "NO_KEY"
        ? "NO_KEY"
        : data.error || "Couldn't reach Dan."
    );
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let evt: any;
      try {
        evt = JSON.parse(trimmed);
      } catch {
        continue;
      }
      if (evt.type === "text") handlers.onText(evt.text);
      else if (evt.type === "tool") handlers.onTool?.(evt.name);
      else if (evt.type === "done") handlers.onDone?.();
      else if (evt.type === "error") handlers.onError?.(evt.error);
    }
  }
}
