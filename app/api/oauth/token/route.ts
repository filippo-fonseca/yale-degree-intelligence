import { rateLimit } from "@/lib/apiAuth";
import { oauthDeps } from "@/lib/oauth";
import {
  callerIp,
  clientCredentials,
  corsPreflight,
  json,
  oauthErrorResponse,
  readForm,
  serverMisconfigured,
} from "@/lib/oauth/http";
import { exchangeToken } from "@/lib/oauth/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const deps = oauthDeps(req);
  if (!deps) return serverMisconfigured();

  const limited = await rateLimit(`oauth-token:${callerIp(req)}`, 120, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const form = await readForm(req);
    const tokens = await exchangeToken(deps, form, clientCredentials(req, form));
    return json(tokens);
  } catch (error) {
    return oauthErrorResponse(error);
  }
}

export function OPTIONS() {
  return corsPreflight();
}
