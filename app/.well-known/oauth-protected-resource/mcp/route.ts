import { protectedResourceMetadata } from "@/lib/oauth/metadata";
import { corsPreflight, json } from "@/lib/oauth/http";

export const dynamic = "force-dynamic";

// RFC 9728 location for the resource at /mcp.
export function GET(req: Request) {
  return json(protectedResourceMetadata(req), 200, { "Cache-Control": "public, max-age=300" });
}

export function OPTIONS() {
  return corsPreflight();
}
