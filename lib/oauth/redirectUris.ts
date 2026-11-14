/**
 * Which redirect URIs a dynamically registered client may use.
 *
 * Allowed:
 * - https URLs (web clients: claude.ai, chatgpt.com, grok.com, ...)
 * - http on a loopback host (native and CLI clients: Claude Desktop, Claude
 *   Code, the MCP Inspector), per RFC 8252 section 7.3
 * - private-use URI schemes that look like reverse-DNS or an app name
 *   (cursor://, vscode://), per RFC 8252 section 7.1
 *
 * Refused: fragments, credentials in the URL, plain http elsewhere, and any
 * scheme that can run code or read local data in a browser.
 */

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const FORBIDDEN_SCHEMES = new Set([
  "javascript:",
  "data:",
  "file:",
  "vbscript:",
  "blob:",
  "about:",
  "chrome:",
  "ftp:",
  "ws:",
  "wss:",
]);

export type RedirectUriCheck = { ok: true } | { ok: false; reason: string };

export function checkRedirectUri(raw: unknown): RedirectUriCheck {
  if (typeof raw !== "string" || raw.length === 0) {
    return { ok: false, reason: "redirect_uri must be a non-empty string" };
  }
  if (raw.length > 2000) return { ok: false, reason: "redirect_uri is too long" };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: `redirect_uri is not a valid URL: ${raw}` };
  }
  if (url.hash) return { ok: false, reason: "redirect_uri must not contain a fragment" };
  if (url.username || url.password) {
    return { ok: false, reason: "redirect_uri must not contain credentials" };
  }
  if (FORBIDDEN_SCHEMES.has(url.protocol)) {
    return { ok: false, reason: `redirect_uri scheme ${url.protocol} is not allowed` };
  }
  if (url.protocol === "https:") return { ok: true };
  if (url.protocol === "http:") {
    if (LOOPBACK_HOSTS.has(url.hostname)) return { ok: true };
    return { ok: false, reason: "http redirect_uris are only allowed on localhost" };
  }
  // Private-use scheme. Require something app-like, not a one-letter scheme.
  if (/^[a-z][a-z0-9+.-]{2,}:$/.test(url.protocol)) return { ok: true };
  return { ok: false, reason: `redirect_uri scheme ${url.protocol} is not allowed` };
}

/**
 * Exact-match comparison, except that a loopback redirect may use any port
 * (RFC 8252 section 7.3): native clients pick a free port at sign-in time.
 */
export function redirectUriMatches(registered: string, presented: string): boolean {
  if (registered === presented) return true;
  let a: URL;
  let b: URL;
  try {
    a = new URL(registered);
    b = new URL(presented);
  } catch {
    return false;
  }
  if (a.protocol !== "http:" || b.protocol !== "http:") return false;
  if (!LOOPBACK_HOSTS.has(a.hostname) || a.hostname !== b.hostname) return false;
  return a.pathname === b.pathname && a.search === b.search;
}

/** What the consent screen shows as "you will be sent back to". */
export function redirectDisplayHost(uri: string): string {
  try {
    const url = new URL(uri);
    if (url.protocol === "https:" || url.protocol === "http:") return url.host;
    return `${url.protocol}//${url.host}`;
  } catch {
    return uri;
  }
}
