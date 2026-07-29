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
## bgsd (this is a bgsd repo) — running from Codex

This repository is orchestrated by **bgsd** (the Conductor, "Kiwi"), an
autonomous, self-verifying layer on top of GSD. bgsd is primarily a Claude
Code tool, but it is harness-agnostic: you can run the WHOLE thing from Codex.

**To start a bgsd session from Codex**, run the harness-neutral launcher from
the repo root:

    node bgsd/scripts/conductor.mjs "<what to build>" [--project|--feature|--quick]

It loads the real Conductor instructions (`bgsd/commands/bgsd-sesh.md`), exports
the plugin root so every `node "${CLAUDE_PLUGIN_ROOT}/scripts/…"` command works,
and hands them to you (Codex) to drive end to end. If you are reading this while
already acting as the Conductor, follow `bgsd/commands/bgsd-sesh.md` directly and
run the node scripts it references (they are plain, harness-agnostic Node).

**Where history lives.** `.bgsd/ledger.md` (index of every session) and
`.bgsd/seshs/<run-id>/` (per-session records). Search with
`node bgsd/scripts/kb.mjs --query "<terms>"`.

**The backlog is the bgsd queue, never a file.** "Queue that" / "leave it for
the next sesh" means `node bgsd/scripts/queue.mjs add --title "<t>" --body "<b>"`
(the per-repo queue at `.bgsd/queue`). `.planning/` belongs to GSD — never write
a `.planning/BACKLOG.md`.

**Models.** Spawned workers resolve to Codex model equivalents automatically
(`harness.mjs`, tunable in `BGSD.md > harness.models`).
<!-- bgsd:managed -->
