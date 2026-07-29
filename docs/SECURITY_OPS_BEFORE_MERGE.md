# Security ops before merging #83

This PR ships code-side security fixes. The **manual** steps below must land before merge into `dev` (and again before `main`/prod).

## 1. Deploy Firestore rules

Source of truth in repo: `docs/firestore-rules.md`

In Firebase Console → Firestore → Rules:

1. Paste the full contents of `docs/firestore-rules.md`
2. Publish
3. Smoke-check:
   - Own profile still loads
   - Friend public page still loads for a friend
   - Direct read of another user’s `users/{uid}` fails

Key changes:

- `users/{userId}` → **owner only**
- `dan_keys`, `mcp_tokens`, `contact_messages` → **deny all client access**
- `friends_public_data` enabled docs readable for discovery (no grades there), gated to Yale emails + the creator's test Gmail via `isAllowedUser()`

## 2. Remove the retired Dan env vars in Vercel (prod + preview)

The Dan advisor and the MCP server are gone from the app, so nothing reads
these anymore. Delete them so no stale credential sits in the project:

| Var | Action |
|---|---|
| `DAN_FALLBACK_ANTHROPIC_KEY` | Delete. If it was ever set, rotate that key in the Anthropic console too. |
| `DAN_FALLBACK_UIDS` | Delete. |
| `DAN_KEY_ENC_SECRET` | Delete **after** step 3, since purging old `dan_keys` does not need it. |

## 3. Purge leftover Dan and MCP secrets in Firestore

Users who connected an Anthropic key or generated an MCP token still have a
`dan_keys/{uid}` or `mcp_tokens/{uid}` document. Nothing reads them now, so
delete both collections in the Firebase Console. Account deletion already
clears them per user, but that only covers users who leave.

The `dan_keys`, `mcp_tokens`, and `contact_messages` rules stay deny-all in the
meantime: the features are retired, but the documents must stay unreadable from
the client until they are gone.

## Unblock the PR

1. Do the steps above
2. On PR #83 add label `security-ops-complete`
3. Remove `[BLOCKED: security ops]` from the title (or leave it; the label alone unblocks CI)
4. Mark ready for review and merge into **`dev`**
