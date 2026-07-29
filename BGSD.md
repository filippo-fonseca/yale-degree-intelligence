# BGSD.md — bgsd settings

This file configures how bgsd (the Conductor, "Kiwi") runs in this repo. Every
knob lives in the `bgsd-settings` block below and ships with a sensible default.
Edit the block to override; Kiwi reads it at the start of every sesh. You can
also write prose preferences (tone, risk appetite, "always ask before X") in the
Notes section and Kiwi will respect them.

## Settings

- **integration_branch** — the standing branch that acts as the rehearsal /
  integration mirror of `main`. Worktree branches merge here; `integration ->
  main` is always a manual, human-only merge.
- **base_branch** — `null` auto-detects from `origin/HEAD` (falls back to
  `main`, then `master`). Set explicitly to pin it.
- **git.sync_integration_from_base** — ff-update the integration branch from the
  base branch at the start of every sesh, so it never falls behind production.
- **git.integration_to_main** — kept `manual`: no agent ever commits to
  `main`. Kiwi only suggests the merge command for you to run.
- **github.issues** — file one atomic issue per work unit plus one epic issue
  per sesh; each PR closes its issue on merge.
- **github.require_remote** — when there's no GitHub remote, skip all issue/PR
  machinery and just branch + merge locally.
- **env.propagate / env.files** — git worktrees don't carry gitignored files, so
  Kiwi copies these env files from the repo root into every worktree (and onto
  the integration branch) so your apps actually run. Edit the globs to match
  this repo's env files.
- **model_posture** — the per-unit model + effort routing, in two quality-first
  difficulty bands: `high` (opus/xhigh) for score >= 0.4, `base`
  (sonnet/xhigh) below. Executor uses the unit's band; researcher drops one band
  (floored at sonnet/xhigh); verifier is fixed at haiku/low. Override any tier,
  threshold, or role here.
- **verification.usage_testing** — `true` runs the full Tester ladder including
  the Playwright/vision rung (driving the real app). `false` skips that UI
  usage-testing but STILL runs the goal-backward code verification
  (gsd-verifier), so quick fixes and non-UI changes don't pay for browser
  testing. Toggle per-session with `--no-usage-verification`, or tell Kiwi
  ("stop UI-testing quick fixes") and it sets this for you. It never disables
  code verification — "no silent green" still holds.
- **verification.headless** — `true` drives Playwright headless, no visible
  browser or server window pops up on your machine (discreet). `false` lets it
  run headed. Toggle per-session with `--headless-ui`, or tell Kiwi ("always
  verify headless").
- **modes.pipeline / modes.verifier** — how much work each role does, three
  levels: `fast` (pipeline skips research; verifier code-only), `thorough`
  (pipeline researches every unit; verifier full driver ladder), or `adaptive`
  (the Conductor decides per unit and adapts). `adaptive` is the default and
  recommended. Override per-session with `--mode` / `--verify-mode`, or
  persist here. A manually-passed flag always wins over this file.
- **conductor** — the Conductor's identity + behavior. `name` and `emoji`
  are the name pill on every message it sends (default `🥝` `Kiwi`); you pick
  them at `/bgsd-init`, and can change them any time here, via `/bgsd-memory`
  ("rename yourself to Jarvis", "change your emoji to 🤖"), or by just asking the
  Conductor. `narrate` streams stage-aware live updates; `suggest_gate_commands`
  makes it hand you the exact command at every human gate. `self_compact_at` is
  the context fraction (0–1) at which the Conductor — the one human-facing
  session — auto-compacts itself and continues, so a long sesh never runs out of
  room.
- **context** — per-subagent context-window management. `max_window_tokens`
  is the model's full window (Pipeline Agents run on ~1M tokens). When an
  agent's usage crosses `compact_at` (fraction of the window) Kiwi compacts it
  proactively; crossing `relaunch_at` clears and relaunches the agent from its
  handoff manifest, into a fresh small window. Raise the fractions to let agents
  run longer before Kiwi intervenes.

```json bgsd-settings
{
  "version": 1,
  "integration_branch": "dev",
  "base_branch": "dev",
  "git": {
    "sync_integration_from_base": true,
    "integration_to_main": "manual"
  },
  "env": {
    "propagate": true,
    "files": [
      ".env",
      ".env.local",
      ".env.*.local"
    ]
  },
  "github": {
    "issues": true,
    "require_remote": true
  },
  "cursor": {
    "enabled": true,
    "models": {
      "routine": "composer-2.5",
      "hard": "cursor-grok-4.5-high"
    }
  },
  "harness": {
    "active": "auto",
    "models": {
      "claude": {
        "opus": "claude-opus-4-8",
        "sonnet": "sonnet",
        "haiku": "haiku",
        "fable": "claude-fable-5"
      },
      "codex": {
        "opus": "gpt-5.5",
        "sonnet": "gpt-5.4",
        "haiku": "gpt-5.4-mini",
        "fable": "gpt-5.5"
      },
      "cursor": {
        "routine": "composer-2.5",
        "hard": "cursor-grok-4.5-high",
        "opus": "cursor-grok-4.5-high",
        "sonnet": "composer-2.5",
        "haiku": "composer-2.5",
        "fable": "cursor-grok-4.5-high"
      }
    }
  },
  "model_contract": {
    "profile": "claude",
    "routing": "cursor",
    "build": {
      "provider": "cursor",
      "model": "composer-2.5",
      "effort": null
    },
    "evaluate": {
      "provider": "cursor",
      "model": "composer-2.5",
      "effort": null
    },
    "adaptive": {
      "routine": {
        "model": "composer-2.5",
        "effort": null
      },
      "hard": {
        "model": "cursor-grok-4.5-high",
        "effort": null
      },
      "heavy": {
        "model": "claude-opus-4-8",
        "effort": "high"
      },
      "light": {
        "model": "sonnet",
        "effort": "high"
      }
    },
    "transport": "direct",
    "auth": "subscription-only",
    "claude_codex": {
      "profile": "claude",
      "routing": "fixed",
      "build": {
        "provider": "claude",
        "model": "claude-opus-4-8",
        "effort": "high"
      },
      "evaluate": {
        "provider": "claude",
        "model": "claude-opus-4-8",
        "effort": "high"
      }
    }
  },
  "verification": {
    "usage_testing": true,
    "headless": true
  },
  "gui": {
    "auto": true
  },
  "notifications": {
    "os": true
  },
  "remote": {
    "enabled": false,
    "host": "loopback",
    "port": 0
  },
  "modes": {
    "pipeline": "adaptive",
    "verifier": "adaptive"
  },
  "conductor": {
    "name": "Dan",
    "emoji": "🐶",
    "persona": "kiwi",
    "narrate": true,
    "suggest_gate_commands": true,
    "advisor": "auto",
    "self_compact_at": 0.9
  },
  "context": {
    "max_window_tokens": 1000000,
    "compact_at": 0.7,
    "relaunch_at": 0.9
  },
  "model_posture": {
    "thresholds": {
      "high": 0.4
    },
    "tiers": {
      "high": {
        "model": "opus",
        "effort": "xhigh"
      },
      "base": {
        "model": "sonnet",
        "effort": "xhigh"
      }
    },
    "researcher": "one-tier-below",
    "verifier": {
      "model": "haiku",
      "effort": "low"
    }
  }
}
```

## Notes

- Session 2026-07-19: landing polish stages on staging/landing-v3; PR into dev; never write dev or main directly.

- ALWAYS start new feature work / bgsd seshs off of dev (never main, never next). dev is both the base branch to branch from AND the integration branch to merge back into; dev -> main is a separate deliberate human-only promotion.

- dev is our staging/integration branch: every sesh/worktree branch merges into dev FIRST (never next, never main). dev -> main is a separate, deliberate, human-only promotion once absolutely ready. Prod on main has 1000+ users.

<!-- Free-form preferences for Kiwi. Examples:
- Never use haiku for verification.
- Always ask before deleting files.
- Prefer terse PR descriptions. -->
