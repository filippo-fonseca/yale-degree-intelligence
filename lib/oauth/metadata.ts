import {
  MCP_PATH,
  SCOPE_DESCRIPTIONS,
  SUPPORTED_SCOPES,
  issuerUrl,
  mcpResourceUrl,
  publicBaseUrl,
} from "./config";

/** RFC 8414 authorization server metadata. */
export function authorizationServerMetadata(req: Request) {
  const base = publicBaseUrl(req);
  return {
    issuer: issuerUrl(req),
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    revocation_endpoint: `${base}/api/oauth/revoke`,
    scopes_supported: [...SUPPORTED_SCOPES],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    revocation_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    code_challenge_methods_supported: ["S256"],
    authorization_response_iss_parameter_supported: true,
    service_documentation: `${base}/connect`,
  };
}

/** RFC 9728 protected resource metadata for the MCP endpoint. */
export function protectedResourceMetadata(req: Request) {
  const base = publicBaseUrl(req);
  return {
    resource: mcpResourceUrl(req),
    authorization_servers: [issuerUrl(req)],
    scopes_supported: [...SUPPORTED_SCOPES],
    bearer_methods_supported: ["header"],
    resource_name: "Yale Degree Intelligence",
    resource_documentation: `${base}/connect`,
    "x-scope-descriptions": SCOPE_DESCRIPTIONS,
    "x-mcp-path": MCP_PATH,
  };
}
