# Cost ops before merging the transcript spend caps

This branch adds code-side controls on what transcript parsing can spend.
The **manual** steps below are what actually bound the bill, and none of them
live in the repo.

## 1. Set a hard billing limit in the OpenAI dashboard

Do this first. It is the only control that survives a bug in our own code.
Everything else in this branch is defence in depth behind it.

OpenAI dashboard → Settings → Billing → Limits. Set both the monthly budget
and the notification threshold.

## 2. Deploy the updated Firestore rules

Source of truth stays `docs/firestore-rules.md`.

Two collections are new, and both are written only by API routes through the
Admin SDK (which bypasses rules):

| Collection | Why deny-all from the client |
|---|---|
| `rate_limits` | A client that could write here could reset its own limit. |
| `transcript_cache` | A client that could write here could poison another user's cached parse. |

Firebase Console → Firestore → Rules: paste `docs/firestore-rules.md`, publish.

## 3. Add TTL policies so these two collections do not grow forever

Firebase Console → Firestore → Time-to-live:

| Collection | TTL field |
|---|---|
| `rate_limits` | `expiresAt` |
| `transcript_cache` | `expiresAt` |

Both collections already write `expiresAt`. Without the policy the documents
accumulate harmlessly but indefinitely, which slowly costs storage. Rate-limit
documents are the noisier of the two (one per user per window).

## 4. Optional environment variables

Neither is required; both have working defaults.

| Var | Default | Effect |
|---|---|---|
| `EXTRACT_DAILY_LIMIT` | `500` | Global ceiling on model calls per 24h across all users. |
| `MODEL_CALLS_DISABLED` | unset | Set to `1` to stop all transcript parsing immediately. Users get a 503 telling them to add courses manually. |

`MODEL_CALLS_DISABLED=1` is the kill switch. It takes effect on the next
request with no deploy needed if set through the Vercel dashboard, though
Vercel does require a redeploy for env changes to reach running functions.

## 5. While you are in there: two stale credentials

Not caused by this branch, found while auditing it.

- `GOOGLE_AI_API_KEY` is set in Vercel but `@google/generative-ai` is imported
  nowhere. Delete it and rotate the key.
- `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, and `CONTACT_FROM_EMAIL` are set, which
  puts `/api/contact` on its `hasEmailProvider()` branch. That branch never
  sends mail and never writes to Firestore; it returns a `mailto:` link that
  the contact page then navigates to. The form works, but it hands the user
  off to their own mail client rather than delivering anything. Either wire
  Resend properly or drop those vars so messages persist to Firestore again.
