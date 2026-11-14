import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { oauthDepsForPage } from "@/lib/oauth";
import { SCOPE_DESCRIPTIONS, type Scope } from "@/lib/oauth/config";
import { redirectDisplayHost } from "@/lib/oauth/redirectUris";
import {
  RedirectableAuthorizeError,
  UnredirectableAuthorizeError,
  validateAuthorizeRequest,
  type AuthorizeParams,
} from "@/lib/oauth/service";
import ConsentScreen, { ConsentError } from "@/components/OAuthConsent/ConsentScreen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect an app · DegreeIntelligence",
  robots: { index: false, follow: false },
};

const PARAM_KEYS = [
  "response_type",
  "client_id",
  "redirect_uri",
  "scope",
  "state",
  "code_challenge",
  "code_challenge_method",
  "resource",
] as const;

/**
 * OAuth authorization endpoint. The request is checked here on the server
 * before anything renders: a request with an unknown client or a redirect URI
 * the client never registered gets an error page and is never bounced
 * anywhere, and a malformed but trustworthy one goes straight back to the
 * client with an OAuth error.
 */
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params: AuthorizeParams = {};
  for (const key of PARAM_KEYS) {
    const value = raw[key];
    params[key] = Array.isArray(value) ? value[0] : value ?? null;
  }

  const deps = await oauthDepsForPage();
  if (!deps) {
    return <ConsentError message="Connecting apps is not available on this deployment right now." />;
  }

  let target: string | null = null;
  try {
    const request = await validateAuthorizeRequest(deps, params);
    return (
      <ConsentScreen
        params={params}
        client={{
          name: request.client.clientName,
          redirectHost: redirectDisplayHost(request.redirectUri),
          clientUri: request.client.clientUri ?? null,
        }}
        scopes={request.scopes.map((s) => ({
          id: s,
          description: SCOPE_DESCRIPTIONS[s as Scope],
        }))}
      />
    );
  } catch (error) {
    if (error instanceof RedirectableAuthorizeError) {
      target = error.redirectTo;
    } else if (error instanceof UnredirectableAuthorizeError) {
      return <ConsentError message={error.message} />;
    } else {
      console.error("[oauth] authorize page failed", error);
      return <ConsentError message="Something went wrong. Try connecting again from the app." />;
    }
  }
  // redirect() throws, so it has to sit outside the try.
  redirect(target);
}
