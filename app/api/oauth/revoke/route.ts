import { oauthDeps } from "@/lib/oauth";
import {
  clientCredentials,
  corsPreflight,
  json,
  oauthErrorResponse,
  readForm,
  serverMisconfigured,
} from "@/lib/oauth/http";
import { revokeToken } from "@/lib/oauth/service";

export const dynamic = "force-dynamic";

/** RFC 7009. Answers 200 whether or not the token existed. */
export async function POST(req: Request) {
  const deps = oauthDeps(req);
  if (!deps) return serverMisconfigured();
  try {
    const form = await readForm(req);
    await revokeToken(deps, form.token, clientCredentials(req, form));
    return json({});
  } catch (error) {
    return oauthErrorResponse(error);
  }
}

export function OPTIONS() {
  return corsPreflight();
}
