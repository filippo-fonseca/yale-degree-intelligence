# Security notes

Findings from the pre-open-source review, August 2026. The clean results are in
the PR that added this file; what follows is the work still outstanding, in the
order I would do it.

## 1. `friends_public_data` is readable by every Yale account, not just friends

**Severity: the one that matters.** No grades are involved. This is about course
lists and bios.

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

**Fix.** Split discovery from content:

- `friends_directory/{uid}`: `displayName`, `photoURL`, `majors`,
  `graduationYear`, `enabled`. Readable by `isAllowedUser()`. This is what the
  Friends search subscribes to.
- `friends_public_data/{uid}`: courses, bio, visibility. Readable by
  `isOwner(userId) || areFriends(request.auth.uid, userId)`.

App changes that go with it: `useFriendsData` subscribes to the directory
instead of the full collection, and both writers (`lib/syncFriendsPublicData.ts`
and `/api/sync-friend-data`) write both documents. Deploy the writes first, then
the rules, or search goes blank between the two.

## 2. Dead AI collections still accept client writes

`ai_responses`, `cleoai_conversations`, and `conversations` are left over from
the Dan advisor and the MCP server, both removed in July 2026. Nothing in the
app touches them, but the rules still let any authenticated account create
documents in `ai_responses` and `conversations` as long as `userId` matches
their own uid. That is an open write endpoint with no size or rate limit
attached to a feature that no longer exists.

**Fix.** Set all three to `allow read, write: if false`, and delete whatever
data is still in them (it is conversation history from a removed feature, so it
is stale PII we have no reason to hold).

## 3. Most writes only require authentication, not a Yale account

`isAllowedUser()` guards discovery reads, with a good comment explaining why:
Firebase issues a token to any Google account, so `isAuthenticated()` does not
mean "a Yale student". But the create paths do not use it. Any Google account
can create `courses` documents and `friend-requests` as long as the `userId` or
`from` field matches its own uid.

The API layer does enforce the Yale gate (`requireAuth` calls `isAllowedEmail`),
so this only applies to direct Firestore writes from a client holding a token.
There is no discovery path for a non-Yale account to find a uid to spam, which
keeps it low, but the storage-abuse path is real and free.

**Fix.** `isAllowedUser()` on the create rules for `courses` and
`friend-requests`.

## 4. `friend-requests` updates are unconstrained

`allow update: if resource.data.to == request.auth.uid` lets the recipient
rewrite any field on the request, not just accept or decline it. Accepting
properly goes through `/api/friends/accept`, which verifies the recipient and
that the request is still pending, so this is not how the app behaves; it is
just wider than it needs to be.

**Fix.** Constrain the update to a status transition, and pin the immutable
fields:

```
allow update: if resource.data.to == request.auth.uid &&
                request.resource.data.from == resource.data.from &&
                request.resource.data.to == resource.data.to &&
                request.resource.data.status in ['accepted', 'rejected'] &&
                resource.data.status == 'pending';
```

## 5. Minor: the creator's personal address is in the rules

`isAllowedUser()` names `filifonsecacagnazzo@gmail.com` so the creator can test
with a second account. It is not a secret and it grants no more than any Yale
student has, but once the repo is public it does tell a reader exactly which
non-Yale Google account is worth phishing. Worth deciding whether the test
account is still needed; if it is, a dedicated address used for nothing else is
a smaller target than a personal one.

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
