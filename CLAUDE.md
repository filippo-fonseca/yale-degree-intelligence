# Yale Degree Intelligence — repo instructions

## Git workflow (required)
- Commits must be **atomic** and made **frequently**. Each logical unit of work (one fix, one component, one layer) is its own small commit as soon as it's done. Never batch a whole feature into one giant commit.
- **Never work directly on `main`.** `main` is tied to production (Vercel). All work happens on a feature branch.
- Once a chunk of work is approved, push the whole branch to a new remote branch and open a PR against `main`. Merging happens via PR, never by committing to `main` directly.
- Do not push without approval. After approval, push the branch and open the PR.

## Working autonomously (orchestrator mode)
- For large, well-scoped initiatives (e.g. the Dan AI advisor), drive the work end to end without asking to be prompted at each step. Plan with a task list, delegate well-bounded, isolated chunks to subagents, then verify their output (typecheck, read the diff) before moving on. Do not delegate security-sensitive code (auth, crypto, key handling) without reviewing it yourself.
- Keep commits atomic per the rules above even while orchestrating: each layer (crypto, route, tools, UI) lands in its own commit.
- Surface decisions and tradeoffs concisely; only stop to ask when a choice is genuinely irreversible or outside the stated scope.

## Dan — agentic AI academic advisor (tracked in GitHub issue #37)
Dan is the conversational layer over the same actions exposed by the ⌘K command palette. Core rules:
- **Dan must never compute degree facts itself.** All course/requirement/pace math comes from deterministic functions in `lib/majors.ts` and `lib/courseCatalog.ts`, exposed to the model as tools. The model only orchestrates tool calls and narrates results. This is what makes it trustworthy and testable.
- **BYOK (bring your own key).** Each user supplies their own Anthropic API key; we do not pay for everyone's inference. Keys are encrypted at rest (server-side only), never sent back to the client, never logged. Dan is disabled until a key is connected. An optional internal fallback key may exist for demos but is off for normal users.
- **Token efficiency is a first-class constraint.** Inject a compact student snapshot, let tools fetch detail on demand, use prompt caching for the stable system prompt + tool schemas, trim/summarize history, and cap tool iterations + output tokens.
- **Model:** default Claude Haiku (`claude-haiku-4-5`); escalate to Sonnet (`claude-sonnet-4-6`) only for heavier multi-semester planning. Low reasoning capacity is acceptable because tools do the hard work.
- **Write-actions** (adding/removing courses, etc.) are gated behind an opt-in user setting (default OFF) and require per-action confirmation in the UI.
- Auth: verify the Firebase ID token server-side via `adminAuth.verifyIdToken()` and scope every read/write to the caller's `uid`.

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
