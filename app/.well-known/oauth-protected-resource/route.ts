import { protectedResourceMetadata } from "@/lib/oauth/metadata";
import { corsPreflight, json } from "@/lib/oauth/http";

export const dynamic = "force-dynamic";

// Served at the root as well as at /mcp: RFC 9728 puts it at the resource's
// path, but some clients only probe the root.
export function GET(req: Request) {
  return json(protectedResourceMetadata(req), 200, { "Cache-Control": "public, max-age=300" });
}

export function OPTIONS() {
  return corsPreflight();
}
