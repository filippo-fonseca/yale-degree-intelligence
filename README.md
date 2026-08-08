<div align="center">

<img src="public/email/logo-dark.png#gh-dark-mode-only" alt="DegreeIntelligence" height="64" />
<img src="public/email/logo-light.png#gh-light-mode-only" alt="DegreeIntelligence" height="64" />

<br />
<br />

<img src=".github/banner.svg" alt="The open-source control plane for your Yale degree." width="100%" />

<br />
<br />

**Yale's most used degree-planning platform.** Upload your transcript once and see
where you actually stand: majors, certificates, distributionals, GPA, and what
happens to all of it if you change your plan.

Used by roughly 1 in 6 Yale undergrads. Free forever, no ads, no fees.

<br />

[**degreeint.com**](https://degreeint.com) · [Changelog](https://degreeint.com/changelog) · [Mission](https://degreeint.com/mission) · [**Disclaimer**](DISCLAIMER.md)

<br />

[![License: MIT](https://img.shields.io/badge/License-MIT-ec4899?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Deployed on Vercel](https://img.shields.io/badge/Vercel-live-000000?style=flat-square&logo=vercel&logoColor=white)](https://degreeint.com)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-a78bfa?style=flat-square)](https://github.com/filippo-fonseca/yale-degree-intelligence/pulls)

</div>

---

> [!IMPORTANT]
> **DegreeIntelligence is not affiliated with, endorsed by, sponsored by, or
> authorized by Yale University.** It is a free, non-commercial, open-source
> project built by students in their spare time. It is not an academic advisor
> and its output is not an official degree audit. It can be wrong. Always
> confirm anything you see here with your Residential College Dean, your FroCo,
> your DUS, or the Registrar before acting on it.
>
> Full terms, including the warranty and liability disclaimers that govern your
> use of it: **[DISCLAIMER.md](DISCLAIMER.md)**.

## What it is

DegreeIntelligence turns your Yale transcript into a live picture of where you
stand and where you're headed. Upload your unofficial transcript from YHub and it
reads off your courses, maps them onto major, certificate, and distributional
requirements, and keeps that picture current as you plan ahead.

Everything it tells you is deterministic. Requirements, credit counts, and pace
numbers all come from a checked-in catalog and a rules engine rather than a
model, so the same courses always produce the same answer. Transcript parsing is
the one exception: it reads the PDF you upload, and stops there.

## Features

- **My Major:** progress toward one or more majors, plus a conflict manager for
  double majors that flags shared courses, overlaps, and prerequisite clashes.
- **My Certificates:** all 42 Yale certificates, each with its real policy. Most
  let two courses double-count with a major; Data Science allows none; Quantum
  only shares at the 3000 level and above.
- **Simulator:** build future semesters on a drag-and-drop canvas, save as many
  plans as you like, and see what each one does to your requirements, projected
  GPA, and distributionals.
- **Distributionals:** skills and disciplinary areas tracked in real credits,
  pre-filled from Yale's own course listings, with your own edits always winning.
- **Academic Stats:** your GPA trend, credits, and grade distribution across your
  whole time at Yale.
- **Friends:** compare progress with friends. Courses and distributionals are
  shared; **grades never are.**
- Light and dark mode throughout.

## Tech

Next.js (App Router) · React · TypeScript · Tailwind CSS · Framer Motion ·
Firebase Auth + Firestore · Chart.js · MUI X Charts · Vitest

## Running locally

```bash
npm install
npm run dev
```

Then open [localhost:3000](http://localhost:3000).

You'll need your own Firebase project. There is deliberately no `.env.example`
to copy. One used to exist, and it carried this project's real config, which
meant a fresh clone authenticated straight against production. Create
`.env.local` yourself using the variables below.

### Environment

Everything here is required for a working local setup except where noted.

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase console → Project settings → General → Your apps → SDK setup |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | same |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | same |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | same |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Project settings → Service accounts → Generate new key, as a single line |
| `ADMIN_EMAILS` | Comma-separated operator emails. Server-only; leave it empty and nobody is an admin |
| `OPENAI_API_KEY` | Optional. Only `/api/extract` uses it, to parse transcripts. Without it that route returns 503 and manual course entry still works |
| `EXTRACT_DAILY_LIMIT` | Optional, default 500. Ceiling on model calls per 24h across all users |
| `MODEL_CALLS_DISABLED` | Optional. Set to `1` to stop transcript parsing immediately |
| `RESEND_API_KEY` | Optional, for the contact form. With no provider configured, messages persist to Firestore |

The `NEXT_PUBLIC_*` values are public by design: they compile into the client
bundle and identify the project rather than authorizing anything. Access is
controlled by Firestore security rules and App Check. `FIREBASE_SERVICE_ACCOUNT_KEY`
is the opposite. It bypasses every rule, so keep it out of version control.

Firestore security rules are not in this repository; see [SECURITY.md](SECURITY.md).

### Tests

```bash
npm test
```

The suite covers the parts where being wrong actually costs a student something:
the certificate policy engine, course catalog integrity, distributional
allocation, the language requirement, and academic term math.

## Not affiliated with Yale, and not a business

**DegreeIntelligence is not affiliated with, endorsed by, sponsored by, or
authorized by Yale University.** The project is called DegreeIntelligence. It
does not carry the Yale name, it is not a Yale product, and it does not speak
for the University or any part of it. Yale has granted us no permission and no
blessing, and none is implied anywhere in this repository or in the app. Where
"Yale" appears here, it is descriptive only: it says whose published
requirements the tool tries to model.

**It is also not a business, and never has been.** No company, no funding, no
ads, no fees, no paid tier, no data for sale. It is a personal, non-commercial,
open-source school project, made by Yale undergrads for Yale undergrads and
maintained in spare time. We wanted a tool like this for ourselves, could not
find one, built it, and open-sourced it so other people could plan their own
academic journeys with it. That is the whole story.

**Use it at your own discretion.** Requirement data can go stale, a transcript
can parse imperfectly, and a plan that looks clean here can still hit a rule we
do not model. Anyone using DegreeIntelligence accepts that we are not liable for
any consequence of any decision made on the basis of it, including anything
faulty, out of date, misleading, or simply wrong.

**This is an aid and nothing more.** Your Residential College Dean, your FroCo,
the DUS for your major, the Registrar, and Yale faculty and staff are the
authoritative sources on your degree. Check with them before acting on anything
you see here. If this app disagrees with Yale, Yale is right.

The full terms, including the warranty disclaimer and the limitation of
liability that govern your use of the app and this code, are in
**[DISCLAIMER.md](DISCLAIMER.md)**. Please read it.

## Contributing

Yes, please. This is a student project that other students rely on, and it gets
better every time someone who knows a corner of Yale's requirements better than
we do says so. You do not need to ask permission first, and you do not need to
be an experienced open-source contributor. Fork it, open a pull request, and
we'll work through it together.

Some especially welcome contributions:

- **Requirement data.** The most valuable thing you can send us. Yale's catalog
  is huge and changes every year, so if a major, certificate, or distributional
  tag is wrong, tell us, ideally with a link to the bulletin page that proves it.
- **Bug reports.** Anything that looks off in your own degree audit counts, even
  if you are not sure it is a bug. Screenshots help a lot.
- **New majors and certificates,** or corrections to how an existing one handles
  double-counting.
- **Accessibility, dark mode, and mobile fixes.** These get reported less often
  than they happen.
- **Ideas.** Open an issue and describe what you wish DI did. Plenty of what is
  in the app now started that way.

A few things that make a PR easy to merge: keep it focused on one thing, run
`npm test` and the type checker before pushing, and match the style of the code
already around you. If you are picking up an open issue, comment on it so nobody
duplicates your work.

Found something security-relevant? Please read [SECURITY.md](SECURITY.md) first
and email rather than opening an issue.

## License

[MIT](LICENSE).

---

<div align="center">
<sub>Started July 2025. Built by Yalies, for Yalies. ❤️</sub>

<sub>Free forever. We make no money from this, and never will.</sub>

<sub>Not affiliated with, endorsed by, or authorized by Yale University. See the [disclaimer](DISCLAIMER.md).</sub>
</div>
