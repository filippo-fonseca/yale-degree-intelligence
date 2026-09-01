# Yale Degree Intelligence — repo instructions

## Git workflow (required)
- Commits must be **atomic** and made **frequently**. Each logical unit of work (one fix, one component, one layer) is its own small commit as soon as it's done. Never batch a whole feature into one giant commit.
- **Never work directly on `main`.** `main` is tied to production (Vercel). All work happens on a feature branch.
- Once a chunk of work is approved, push the whole branch to a new remote branch and open a PR against `main`. Merging happens via PR, never by committing to `main` directly.
- Do not push without approval. After approval, push the branch and open the PR.
- **Public changelog:** User-facing changes that will land on `main` must update `app/changelog/releases.ts` (plain language, no internals). A GitHub Action posts a sticky reminder on PRs to `main` if that path was not touched — if you see it (or are opening/updating such a PR), update the changelog yourself in the background and mention it in your summary. Docs/chore-only PRs can skip with a note in the PR template checkbox.

## Working autonomously (orchestrator mode)
- For large, well-scoped initiatives (e.g. the certificates policy engine), drive the work end to end without asking to be prompted at each step. Plan with a task list, delegate well-bounded, isolated chunks to subagents, then verify their output (typecheck, read the diff) before moving on. Do not delegate security-sensitive code (auth, crypto, key handling) without reviewing it yourself.
- Keep commits atomic per the rules above even while orchestrating: each layer (engine, route, UI) lands in its own commit.
- Surface decisions and tradeoffs concisely; only stop to ask when a choice is genuinely irreversible or outside the stated scope.

## Email campaigns: never send to someone who opted out
- The opt-out list is the Firestore collection **`email_unsubscribes`**, one doc
  per address, doc ID = the lowercased email. `/unsubscribe` (`app/api/unsubscribe/route.ts`)
  writes it; `lib/emailUnsubscribe.ts` signs the links. There is deliberately no
  endpoint that lists opt-outs, so it is read through the Admin SDK only.
- **Every send must cross-check that list first.** Use `readSuppressions()` from
  `scripts/email/lib.mjs`, filter the roster through it, and print the skipped
  count before sending. Never add a third sender that reimplements this.
- `readSuppressions()` returns **null** when there are no admin credentials,
  which means "could not check" and is not the same as "nobody opted out".
  Treat null as a hard stop. `--skip-suppression-check` exists for the case
  where the list is genuinely known to be empty and nothing else.
- Never write `unsubscribed: false` when importing a Resend contact. Re-importing
  an existing contact with that flag clears an opt-out they already made.
- Resend's audience state and our Firestore list are two different records.
  Someone can opt out through either one, so both have to be honoured, and the
  Firestore check is the one our own code owns.
- Rosters live in `lists/`, which is **gitignored** and holds real student
  addresses. Never commit one, never paste addresses into a PR, issue, or chat.

## No AI features in the product
The Dan advisor and the per-user MCP server were removed in July 2026. DI is a
deterministic degree tool: every course, requirement, and pace number comes from
`lib/majors.ts`, `lib/courseCatalog.ts`, and the certificate policy engine, and
nothing calls a model at request time. Transcript parsing on `/api/extract` is
the one exception, and it stays scoped to parsing.

Do not reintroduce a chat surface, a BYOK key store, or an MCP endpoint without
an explicit decision to do so. GitHub issue #37 (Dan) is closed by that removal.
