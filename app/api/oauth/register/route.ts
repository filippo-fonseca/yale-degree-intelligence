import { rateLimit } from "@/lib/apiAuth";
import { oauthDeps } from "@/lib/oauth";
import {
  callerIp,
  corsPreflight,
  json,
  oauthErrorResponse,
  serverMisconfigured,
} from "@/lib/oauth/http";
import { OAuthError, registerClient } from "@/lib/oauth/service";

export const dynamic = "force-dynamic";

/** RFC 7591 dynamic client registration. Open, but rate limited per IP. */
export async function POST(req: Request) {
  const deps = oauthDeps(req);
  if (!deps) return serverMisconfigured();

  const limited = await rateLimit(`oauth-register:${callerIp(req)}`, 30, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const text = await req.text();
    if (text.length > 16_384) throw new OAuthError("invalid_client_metadata", "metadata too large");
    let metadata: unknown;
    try {
      metadata = JSON.parse(text);
    } catch {
      throw new OAuthError("invalid_client_metadata", "body must be a JSON object");
    }
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      throw new OAuthError("invalid_client_metadata", "body must be a JSON object");
    }
    const registered = await registerClient(deps, metadata as Record<string, unknown>);
    return json(registered, 201);
  } catch (error) {
    return oauthErrorResponse(error);
  }
}

export function OPTIONS() {
  return corsPreflight();
}
