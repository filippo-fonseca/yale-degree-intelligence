# Security notes

Findings from the pre-open-source review, August 2026.

Findings 1 through 4 are **fixed in the code and in `firestore.rules`**, but the
rules are not deployed by merging: see "Deploying this" at the bottom for the
order, which matters. Finding 5 is a decision for Filippo.

## 1. `friends_public_data` was readable by every Yale account — FIXED

**Severity: the one that mattered.** No grades were involved. This was about
course lists and bios.

The rule is:

```
match /friends_public_data/{userId} {
  allow read: if isOwner(userId) ||
                (isAllowedUser() && resource.data.enabled == true);
```

That document holds four things search needs (display name, photo, majors,
graduation year) **and** two things it does not: the full `courses` array and
the `bio`. So any signed-in Yale account can read any opted-in student's entire
course history with one direct Firestore call, without ever being their friend.

The friendship check exists only in the app (`app/user/[userId]/page.tsx` checks
before rendering, and `/api/sync-friend-data` checks before syncing). Neither is
a control: both are on the client's side of the trust boundary, or gate a
different operation. The rules are what an attacker actually meets, and they say
yes.

This matters because the product promises otherwise. Onboarding tells students
their bio is "visible only to friends you accept", and the Friends tab is headed
"What friends see". A student reading either would not expect 1,200 classmates
to be able to enumerate their courses.

`areFriends()` and `hasFriendsEnabled()` are already defined in the rules and
never called, which suggests this was the intent and the wiring was never
finished.

**Fixed by** splitting discovery from content:

- `friends_directory/{uid}`: `displayName`, `photoURL`, `majors`,
  `graduationYear`, `enabled`. Readable by `isAllowedUser()`. This is what the
  Friends search subscribes to.
- `friends_public_data/{uid}`: courses, bio, visibility. Readable by
  `isOwner(userId) || areFriends(request.auth.uid, userId)`.

`useFriendsData` subscribes to the directory. Both writers
(`lib/syncFriendsPublicData.ts` and `/api/sync-friend-data`) keep the entry in
step, and both do it on every sync rather than only on enable, which makes the
app self-repairing for anyone whose entry predates the collection. Disabling
Friends and deleting an account both remove the entry.

## 2. Dead AI collections accepted client writes — FIXED

`ai_responses`, `cleoai_conversations`, and `conversations` are left over from
the Dan advisor and the MCP server, both removed in July 2026. Nothing in the
app touches them, but the rules still let any authenticated account create
documents in `ai_responses` and `conversations` as long as `userId` matches
their own uid. That is an open write endpoint with no size or rate limit
attached to a feature that no longer exists.

**Fixed:** all three are `allow read, write: if false`, and
`scripts/purge-dead-collections.mjs` deletes what is left. That script also
covers `dan_keys` and `mcp_tokens`, which the rules already denied but which
are the more important two: they held per-user BYOK API keys and MCP tokens.
Stale third-party credentials are the worst thing to keep, because nobody is
watching them and the user cannot see that they still exist.

Run `--dry-run` (the default) to see the counts, then `--confirm`.

## 3. Writes only required authentication, not a Yale account — FIXED

`isAllowedUser()` guards discovery reads, with a good comment explaining why:
Firebase issues a token to any Google account, so `isAuthenticated()` does not
mean "a Yale student". But the create paths do not use it. Any Google account
can create `courses` documents and `friend-requests` as long as the `userId` or
`from` field matches its own uid.

The API layer does enforce the Yale gate (`requireAuth` calls `isAllowedEmail`),
so this only applies to direct Firestore writes from a client holding a token.
There is no discovery path for a non-Yale account to find a uid to spam, which
keeps it low, but the storage-abuse path is real and free.

**Fixed:** `isAllowedUser()` on the create and update rules for `courses`, and
on create for `friend-requests`, which also now rejects a request addressed to
yourself and one that does not start as `pending`.

## 4. `friend-requests` updates were unconstrained — FIXED

`allow update: if resource.data.to == request.auth.uid` lets the recipient
rewrite any field on the request, not just accept or decline it. Accepting
properly goes through `/api/friends/accept`, which verifies the recipient and
that the request is still pending, so this is not how the app behaves; it is
just wider than it needs to be.

**Fixed** by constraining the update to a status transition, with the immutable
fields pinned:

```
allow update: if isAuthenticated() &&
                resource.data.to == request.auth.uid &&
                resource.data.status == 'pending' &&
                request.resource.data.from == resource.data.from &&
                request.resource.data.to == resource.data.to &&
                request.resource.data.status in ['accepted', 'rejected'];
```

## 5. Minor: the creator's personal address is in the rules

`isAllowedUser()` names `filifonsecacagnazzo@gmail.com` so the creator can test
with a second account. It is not a secret and it grants no more than any Yale
student has, but once the repo is public it does tell a reader exactly which
non-Yale Google account is worth phishing. Worth deciding whether the test
account is still needed; if it is, a dedicated address used for nothing else is
a smaller target than a personal one.

## Deploying this

Merging changes nothing in production. The order matters, because the rules and
the app have to move in step:

1. **Merge and let Vercel deploy.** The app now writes `friends_directory` and
   reads search from it. The old rules still allow everything it needs, so this
   step is safe on its own and can sit here indefinitely.
2. **Run the backfill.** `node scripts/backfill-friends-directory.mjs --dry-run`
   first, then without the flag. It seeds a directory entry for every enabled
   account (so nobody vanishes from search before their next visit) and
   reconciles `friends` into `friends_lookup` (so no existing friendship loses
   access when the read rule starts checking `areFriends()`).
3. **Deploy the rules.** `firebase deploy --only firestore:rules`.
4. **Purge the dead collections.** `node scripts/purge-dead-collections.mjs`
   for the counts, then `--confirm`. Independent of steps 1 to 3: nothing reads
   these, so it can run at any point.

Doing 3 before 2 is the one ordering that hurts: search would empty out for
accounts with no directory entry yet, and any friendship without a lookup
document would lose access to the other person's page.

## Not a finding, recorded so nobody re-derives it

Grades never leave the owner's account. The chain, end to end:

- `courses` is owner-only at the rules layer, and grades exist nowhere else.
- `PublicCourse` (`lib/types.ts`) has no grade field.
- Both writers of the friend-facing projection build `PublicCourse` field by
  field. Neither spreads a raw `Course`, which is the mistake that would carry
  a grade across.
- The friend-facing page reads only `friends_public_data`, never `courses`, and
  stamps `grade: null` on the way in.

The one place grades reach a server is `/api/admin/stats`, which aggregates them
into distributions behind `requireAdmin`.
