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

[**degreeint.com**](https://degreeint.com) · [Changelog](https://degreeint.com/changelog) · [Mission](https://degreeint.com/mission)

<br />

[![License: MIT](https://img.shields.io/badge/License-MIT-ec4899?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Deployed on Vercel](https://img.shields.io/badge/Vercel-live-000000?style=flat-square&logo=vercel&logoColor=white)](https://degreeint.com)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-a78bfa?style=flat-square)](https://github.com/filippo-fonseca/yale-degree-intelligence/pulls)

</div>

---

## What it is

DegreeIntelligence turns your Yale transcript into a live picture of where you
stand and where you're headed. Upload your unofficial transcript from YHub and it
parses the courses, maps them onto major, certificate and distributional
requirements, and keeps that picture current as you plan ahead.

Everything it tells you is deterministic. Requirements, credit counts and pace
numbers come from a checked-in catalog and a rules engine, not from a model, so
the same courses always produce the same answer. The one exception is transcript
parsing, which reads the PDF you upload and stops there.

## Features

- **My Major** — progress toward one or more majors, with a conflict manager for
  double majors that flags shared courses, overlaps and prerequisite clashes.
- **My Certificates** — all 42 Yale certificates, each with its real policy. Most
  allow two courses to double-count with a major; Data Science allows none;
  Quantum only shares at the 3000 level and above.
- **Simulator** — build future semesters on a drag-and-drop canvas, save multiple
  plans, and read what each one does to your requirements, projected GPA and
  distributionals.
- **Distributionals** — skills and disciplinary areas tracked in real credits,
  pre-filled from Yale's own course listings, with your own edits always winning.
- **Academic Stats** — GPA trend, credits and grade distribution over your whole
  time at Yale.
- **Friends** — compare progress with friends. Courses and distributionals are
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

You will need your own Firebase project. There is deliberately no
`.env.example` to copy: one used to exist carrying this project's real config,
which meant a fresh clone authenticated against production. Create `.env.local`
yourself with the variables below.

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
bundle and identify the project rather than authorising anything. Access is
controlled by Firestore security rules and App Check. `FIREBASE_SERVICE_ACCOUNT_KEY`
is the opposite — it bypasses every rule, so keep it out of version control.

Firestore security rules are not in this repository; see [SECURITY.md](SECURITY.md).

### Tests

```bash
npm test
```

The suite covers the parts where being wrong actually costs a student something:
the certificate policy engine, course catalog integrity, distributional
allocation, the language requirement, and academic term maths.

## Contributing

Issues and pull requests are welcome, particularly on requirement data. Yale's
own catalog is large and changes every year, so if you find a major, certificate
or distributional tag that DI gets wrong, that is the most useful thing you can
report.

Found something security-relevant? Please read [SECURITY.md](SECURITY.md) first
and email rather than opening an issue.

## Licence

[MIT](LICENSE).

---

<div align="center">
<sub>Started July 2025. Built by Yalies, for Yalies, in New Haven. ❤️</sub>
</div>
