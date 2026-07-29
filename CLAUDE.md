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

## No AI features in the product
The Dan advisor and the per-user MCP server were removed in July 2026. DI is a
deterministic degree tool: every course, requirement, and pace number comes from
`lib/majors.ts`, `lib/courseCatalog.ts`, and the certificate policy engine, and
nothing calls a model at request time. Transcript parsing on `/api/extract` is
the one exception, and it stays scoped to parsing.

Do not reintroduce a chat surface, a BYOK key store, or an MCP endpoint without
an explicit decision to do so. GitHub issue #37 (Dan) is closed by that removal.

<!-- bgsd:managed -->
## bgsd (this is a bgsd repo)

This repository is orchestrated by **bgsd** (the Conductor, "Kiwi"), an
autonomous, self-verifying layer on top of GSD.

**Where the history lives.** Every bgsd session is logged under `.bgsd/`.
When you need context on what was built or changed, read there, even outside
a bgsd session:
- `.bgsd/ledger.md`: an index of every session (the request and the outcome).
- `.bgsd/seshs/<run-id>/`: the per-session record (RUN.md, AGENTS.md for what
  each subagent did, plus the aggregated planning markdown).
- Search it all with `node "${CLAUDE_PLUGIN_ROOT}/scripts/kb.mjs" --query "<terms>"`
  (for example, "auth middleware").

**Before building.** If the user asks you to build, change, or fix something
and has NOT already started a session, first ask whether they want to run it
as a bgsd session (`/bgsd-sesh "<their request>"`) for the full verified,
parallel pipeline. If yes, start it. If they decline or want something quick,
just do it directly as normal Claude Code. Default to asking; never silently
force a session.
<!-- bgsd:managed -->
