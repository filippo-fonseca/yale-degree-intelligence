import type { OAuthClient } from "./types";

/**
 * Clients that identify themselves with a Client ID Metadata Document: the
 * client_id is an https URL serving their registration, instead of an id from
 * our dynamic registration endpoint. Grok's custom connectors work this way
 * and never call /register.
 *
 * Pinned here rather than fetched at request time, so the authorization
 * server never makes outbound requests to a URL a caller chose. The values
 * mirror the published documents; if a client changes its redirect URIs,
 * update the entry.
 */
const KNOWN_METADATA_CLIENTS: OAuthClient[] = [
  {
    // https://grok.com/oauth/mcp-client.json
    clientId: "https://grok.com/oauth/mcp-client.json",
    clientName: "Grok",
    clientUri: "https://grok.com",
    logoUri: "https://grok.com/icon-512x512.png",
    redirectUris: [
      "https://grok.com/connectors-oauth-exchange-code/",
      "https://console.x.ai/connectors-oauth-exchange-code/",
    ],
    tokenEndpointAuthMethod: "none",
    grantTypes: ["authorization_code", "refresh_token"],
    createdAt: 0,
  },
];

const BY_ID = new Map(KNOWN_METADATA_CLIENTS.map((c) => [c.clientId, c]));

/** The pinned registration for a metadata-document client, or null. */
export function knownMetadataClient(clientId: string): OAuthClient | null {
  return BY_ID.get(clientId) ?? null;
}
