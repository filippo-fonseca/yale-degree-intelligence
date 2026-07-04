import { auth } from "@/config/firebase";

// Client-side helpers for managing the user's MCP token. Each call attaches the
// current user's Firebase ID token. The plaintext MCP token is only ever
// returned by generateMcpToken (once); status calls never expose it.

async function authHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export interface McpTokenStatus {
  connected: boolean;
  last4?: string | null;
  createdAt?: string | null;
  lastUsedAt?: string | null;
}

export async function getMcpStatus(): Promise<McpTokenStatus> {
  const res = await fetch("/api/mcp/token", { headers: await authHeader() });
  if (!res.ok) return { connected: false };
  return res.json();
}

export async function generateMcpToken(): Promise<string> {
  const res = await fetch("/api/mcp/token", {
    method: "POST",
    headers: await authHeader(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(data.error || "Failed to generate token.");
  }
  return data.token as string;
}

export async function revokeMcpToken(): Promise<void> {
  await fetch("/api/mcp/token", {
    method: "DELETE",
    headers: await authHeader(),
  });
}
