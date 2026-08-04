# Security

DegreeIntelligence holds Yale students' course histories. Please treat anything
that could expose one student's data to another as serious.

## Reporting

Email **filippo.fonseca@yale.edu** with "SECURITY" in the subject. Please do not
open a public issue for anything exploitable.

Include what you did, what you saw, and roughly how bad you think it is. A rough
report beats no report; you do not need a working exploit.

Expect a reply within a few days. If you do not hear back, email again — it means
the first one got lost, not that it was ignored.

## Scope

Most interesting to us, roughly in order:

- Reading another user's courses, grades, or profile
- Writing to another user's data
- Bypassing the `@yale.edu` sign-in gate
- Escalating to admin
- Anything that lets one account run up the project's API bill

Out of scope: reports from automated scanners with no demonstrated impact,
missing headers with no exploit path, and the fact that the Firebase web API key
is visible in the client bundle. That key is public by design; access is
controlled by Firestore security rules and App Check, not by hiding it.

## What we ask

Use your own account. Do not read, modify, or retain another student's data — if
you find you can, stop there and tell us. That is enough to prove the bug.

## Deliberately not in this repository

Firestore security rules are not published here. They are the authorization
model, and we would rather not ship a map of it. If you are working on
authorization and need them, ask.
