# DegreeIntelligence MCP server

Students can connect their own AI assistant (Claude, ChatGPT, Grok, Cursor, a
bot, a script) to their DegreeIntelligence account. The assistant can read
their degree progress and, if they allow it, change their courses, profile and
Simulator plans. Every number comes from the same deterministic engines the app
uses; the server never calls a model.

- **Students:** the in-app guide is Settings > Connected apps, and the public
  one is [`/connect`](../../app/connect/page.tsx).
- **Agents and developers:** the full tool reference is [tools.md](tools.md),
  generated from the live `tools/list`.
- **Connecting each client:** [clients.md](clients.md).
- **Running it:** [operations.md](operations.md) (environment, Firestore rules,
  TTL policies, revocation, incident steps).

## At a glance

| | |
| --- | --- |
| Endpoint | `POST <origin>/mcp`, Streamable HTTP, stateless, JSON responses (`GET`/`DELETE` return 405) |
| Auth | OAuth 2.1 with PKCE (S256), dynamic client registration (RFC 7591), resource indicators (RFC 8707). Or a personal access token from Settings |
| Discovery | `/.well-known/oauth-protected-resource` (also `/mcp` suffixed) and `/.well-known/oauth-authorization-server` |
| Scopes | `degree:read` (12 tools), `degree:write` (16 more; implies read) |
| Tokens | Opaque, prefixed, stored only as SHA-256 hashes. Access 1 hour, refresh 30 days rotated on use, personal tokens up to 90 days |
| Isolation | Every tool is bound to the token's student through `DegreeStore`. No tool takes a user id |
| Writes | `dry_run` on every write, idempotent, plan edits in a Firestore transaction, audited to `mcp_audit/{uid}/events` for 90 days |
| Limits | 300 calls per 10 minutes per connection |
| Out of scope | Friends data, account deletion, sign-in settings |

## Keeping responses small

Agents pay for every token a tool returns, so nothing hands over a whole
dataset by default:

- `list_programs` returns ids and names only, and takes a `query`.
- `get_program_requirements` takes one program (any major or certificate, not
  only the student's) and optionally one `requirement`. The biggest program is
  about 3.5 KB.
- `search_courses` returns 15 compact results at a time with `next_offset`, out of
  roughly 6,600 courses. `fills` narrows it to one program's requirement,
  `untaken_only` drops the student's transcript and planned courses, and
  `offered_season` and `min_level`/`max_level` narrow it further.
- `get_degree_progress` caps example options at 12 per requirement and has
  `summary_only`. `get_course_details` returns one term's meeting times.

The usual plan-building loop is `get_plan` → `get_plan_progress` →
`search_courses` (with `fills`, `offered_season`, `untaken_only`) →
`add_planned_course` → `get_plan_progress`.

## How a request flows

```text
client ──POST /mcp (no token)──▶ 401 + WWW-Authenticate: resource_metadata=…
client ──GET /.well-known/oauth-protected-resource──▶ issuer, scopes
client ──POST /api/oauth/register──▶ client_id                 (once)
browser ─▶ /oauth/authorize ─▶ student signs in with Google, picks read or read+write
client ──POST /api/oauth/token (code + PKCE verifier)──▶ access + refresh token
client ──POST /mcp (Bearer dia_…)──▶ tools filtered by scope, bound to that student
```

Personal tokens skip the browser part: the student creates one in Settings and
pastes it into the client, which sends it as `Authorization: Bearer dia_…`.

## Code map

| Path | What it is |
| --- | --- |
| `app/mcp/route.ts` | The endpoint: wires Firestore, rate limit, CORS |
| `lib/mcp/handler.ts` | Bearer check, 401/403 challenges, one server per request |
| `lib/mcp/server.ts` | Server instructions, scope filtering, argument validation |
| `lib/mcp/tools/` | `read.ts`, `courses.ts`, `profile.ts`, `plans.ts`; `write.ts` holds `performWrite` (dry run, no-op detection, audit) |
| `lib/mcp/planProjection.ts` | Server-side mirror of the Simulator's projection and course admission |
| `lib/mcp/store.ts`, `firestoreStore.ts`, `memoryStore.ts` | The uid-bound data layer and its test double |
| `lib/mcp/audit.ts` | The audit log Settings shows |
| `lib/mcp/clientGuides.ts` | Per-client setup steps shared by Settings and `/connect` |
| `lib/oauth/` | The authorization server: `service.ts` is all the logic, routes are thin |
| `app/api/connections/route.ts` | Settings: list connections and activity, create personal tokens, disconnect |
| `components/UserSettingsModal/SettingsConnectedAppsSection.tsx` | The Settings UI |
| `components/OAuthConsent/ConsentScreen.tsx` | The consent screen |

## Tests

```bash
npx vitest run lib/oauth lib/mcp
```

- `lib/oauth/service.test.ts`: registration, PKCE, code and refresh-token replay,
  resource binding, revocation, personal tokens.
- `lib/mcp/tools.test.ts`: every write tool against the in-memory store,
  including cross-student isolation and dry runs.
- `lib/mcp/handler.test.ts`: end to end over HTTP, from registration to a tool
  call, scope enforcement and revocation.
- `lib/mcp/toolDocs.test.ts`: fails when `tools.md` no longer matches the server.

## Adding a tool

1. Define it with `defineTool` in the right file under `lib/mcp/tools/`, with a
   description written for an agent: what it does, when to use it, what to call
   first.
2. Read the student's data only through `ctx.store`. Never accept a uid.
3. A write goes through `performWrite`, takes `dryRunField`, and returns
   `changed: false` when there is nothing to do.
4. Add tests to `lib/mcp/tools.test.ts`.
5. Regenerate the reference:
   `UPDATE_MCP_DOCS=1 npx vitest run lib/mcp/toolDocs.test.ts`.

## Known limits

- The Simulator listens for changes to saved plans, so its next save no longer
  undoes a plan an assistant added or edited. The plan on the canvas is still
  the student's working copy: if an assistant edits that same plan, the student
  sees a notice, and saving from the canvas keeps the canvas version.
- Progress is the app's reading of Yale's rules, not an official degree audit.
  The server instructions tell agents to say so.
