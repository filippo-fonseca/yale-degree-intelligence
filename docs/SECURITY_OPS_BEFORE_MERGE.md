# Security ops before merging #83

This PR ships code-side security fixes. Two **manual** steps must land before merge into `dev` (and again before `main`/prod).

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
- `friends_public_data` enabled docs readable for discovery (no grades there)

## 2. Confirm Dan fallback env in Vercel (prod + preview)

| Var | Required state |
|---|---|
| `DAN_FALLBACK_ANTHROPIC_KEY` | **Unset** in normal prod, OR only set with a tight UID list |
| `DAN_FALLBACK_UIDS` | Comma-separated Firebase UIDs allowed to use the fallback (demos only) |

If the key is set without `DAN_FALLBACK_UIDS`, nobody gets it (safe). If both are set, only listed UIDs get the shared key.

## Unblock the PR

1. Do the two steps above
2. On PR #83 add label `security-ops-complete`
3. Remove `[BLOCKED: security ops]` from the title (or leave it; the label alone unblocks CI)
4. Mark ready for review and merge into **`dev`**
