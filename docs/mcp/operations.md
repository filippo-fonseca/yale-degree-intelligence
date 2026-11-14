# Running the MCP server

## Before the first production deploy

These are one-time steps an operator has to do. None of them is automated by
this branch.

1. **Set `PUBLIC_BASE_URL=https://degreeint.com`** in the Vercel production
   environment. It fixes the OAuth issuer and the resource URL, so neither ever
   depends on a request's Host header. Previews can leave it unset and use their
   own origin.
2. **Deploy the Firestore rules** in `firestore.rules`. They add explicit
   deny-all blocks for `oauth_clients`, `oauth_codes`, `oauth_grants`,
   `oauth_tokens` and `mcp_audit`: only the Admin SDK on the server touches them.
   ```bash
   firebase deploy --only firestore:rules
   ```
3. **Turn on TTL policies** on the field `ttlAt` for these collection groups, so
   expired records clean themselves up:
   - `oauth_codes` (removed a day after the 5-minute code expires)
   - `oauth_tokens` (a day after the token expires)
   - `events` (the audit log under `mcp_audit/{uid}`, after 90 days)
   ```bash
   gcloud firestore fields ttls update ttlAt --collection-group=oauth_codes --enable-ttl
   gcloud firestore fields ttls update ttlAt --collection-group=oauth_tokens --enable-ttl
   gcloud firestore fields ttls update ttlAt --collection-group=events --enable-ttl
   ```
   Check first that no other collection group called `events` exists; if one
   does, rename the audit subcollection before enabling TTL.
4. `FIREBASE_SERVICE_ACCOUNT_KEY` must be set (it already is in production).
   Without Admin credentials `/mcp`, the OAuth routes and Settings > Connected
   apps answer 503 and the app works as before.

No indexes are needed: every query is a single-field equality or a single-field
order.

## Environment

| Variable | Purpose |
| --- | --- |
| `PUBLIC_BASE_URL` | Production origin, no trailing slash. Issuer and resource URL are derived from it |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Already required by the app. The OAuth store and the tools use the Admin SDK |

There are no signing keys: tokens are random and looked up by hash, so there is
nothing to rotate.

## What's stored

| Collection | Doc id | Holds | Lifetime |
| --- | --- | --- | --- |
| `oauth_clients` | client id | Registered client metadata, hashed secret if any | Kept |
| `oauth_codes` | code hash | One-time code, PKCE challenge, scopes | TTL |
| `oauth_grants` | grant id | One connection: student, client name, scopes, last used, revoked | Kept so Settings can show it; deleted with the account |
| `oauth_tokens` | token hash | Access and refresh tokens | TTL; deleted on revoke |
| `mcp_audit/{uid}/events` | auto | Tool, summary, connection, time of each real write | 90 days |

No plaintext token, code or secret is ever stored or logged.

## Revoking access

- A student disconnects an app or a personal token in Settings. That marks the
  grant revoked and deletes its tokens; the next call gets 401.
- A refresh token presented again after rotation (outside a 10-second retry
  window) revokes the whole connection, as does reusing an authorization code.
- Deleting an account deletes every grant, token and audit event.

To cut off one student's apps by hand, call `revokeAllConnections(deps, uid)`
from `lib/oauth/service.ts` with Admin credentials. To cut off everyone, delete
the `oauth_tokens` collection: every connection then fails until it signs in
again (refresh tokens are in the same collection).

## Turning it off

Return 503 from `app/mcp/route.ts` and `app/api/oauth/*` (or remove the routes).
Existing grants stay listed in Settings so students can still disconnect them.

## Monitoring

The route logs `[mcp] <tool> failed` with the stack when a tool throws
unexpectedly, and `[oauth] …` for authorization server errors. Rate-limit hits
come back to the client as 429. Nothing student-identifying beyond the uid is
logged.
