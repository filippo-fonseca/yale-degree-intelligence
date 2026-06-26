# Yale Degree Intelligence — repo instructions

## Git workflow (required)
- Commits must be **atomic** and made **frequently**. Each logical unit of work (one fix, one component, one layer) is its own small commit as soon as it's done. Never batch a whole feature into one giant commit.
- **Never work directly on `main`.** `main` is tied to production (Vercel). All work happens on a feature branch.
- Once a chunk of work is approved, push the whole branch to a new remote branch and open a PR against `main`. Merging happens via PR, never by committing to `main` directly.
- Do not push without approval. After approval, push the branch and open the PR.
