import { authorizationServerMetadata } from "@/lib/oauth/metadata";
import { corsPreflight, json } from "@/lib/oauth/http";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return json(authorizationServerMetadata(req), 200, { "Cache-Control": "public, max-age=300" });
}

export function OPTIONS() {
  return corsPreflight();
}
