# v3 launch film — demo kit

Everything needed to cut the DegreeIntelligence v3 launch film, in the idiom of
the Notify.me launch trailer.

- [`STORYBOARD.md`](STORYBOARD.md) — the reference's visual grammar, a timecoded
  60-second shot list, and the editing notes for the look that is deliberately
  **not** baked into the footage.
- `reelkit/` — the recorder. Captures each feature of the live app as a clean
  1080p clip with an animated cursor.

Rendered output does not live in git. Clips and type cards land in
`~/Desktop/di-v3-demo-reel/`.

## The one thing to understand about the footage

Every clip is recorded **clean**: 1920x1080, dark mode, no window chrome, no
gradient background, no speed ramps, no zoom. That is on purpose.

The reference trailer's whole look comes from compositing: the UI is tilted in
3D, pushed in close, and thrown out of focus at the edges. All of that is an
edit decision. If it were baked into the capture, the footage could only ever
support one cut. Scale, rotate, blur, and speed-ramp in the editor instead; the
storyboard's editing notes give the specific values that reproduce the reference.

## Running it

Once per machine, or whenever the session expires:

```bash
cd demo/reelkit
npm install
npm run login          # opens real Chrome; sign in with @yale.edu, then it saves
```

Then:

```bash
npm run record -- all              # every shot
npm run record -- 17-simulator-canvas 21-simulator-progress   # just these
npm run cards                      # the kinetic type cards as PNGs
```

Output goes to `~/Desktop/di-v3-demo-reel/` (override with `REEL_OUT`), one
`<shot-id>.mp4` per clip plus a `manifest.json` of what rendered.

### Why the login step exists

Firebase persists the signed-in user in IndexedDB, not localStorage, so a
default Playwright `storageState()` silently produces a logged-out session.
`login.mjs` exports with `indexedDB: true` and polls for the real
`firebase:authUser:*` key instead of trusting a page load. Automating the Google
OAuth flow is not worth attempting; logging in by hand once is the reliable path.

## Your account is not modified

No shot saves a plan, adds a certificate, uploads a transcript, or writes
anything to Firestore. Dragging courses in the Simulator changes only in-memory
state, and the browser closes without saving.

The tip-modal flags the recorder seeds (`myMajorTipModalShown` and friends) are
localStorage-only by design, so seeding them in the recording browser cannot
reach the account.

## Shots that need a decision from you

Three things could not be filmed without either writing to your account or
having an asset that does not exist in the repo:

| Missing | Why | What it would take |
|---|---|---|
| Live transcript parse | No sample transcript PDF exists in the repo, and uploading one would re-parse your real course data. `27-transcript-upload-ui` films the dropzone and the YHub instructions instead. | A throwaway account plus a sample YHub PDF. |
| Guided tour / v3 welcome | Both are gated on Firestore profile flags (`hasSeenTutorial`, `hasSeenV3Welcome`). Triggering them means writing to your profile. | A fresh test account, which also gives a genuine first-run. |
| Saving a plan | `Cmd+S` overwrites the real default plan. `23-simulator-save-affordance` films the Save button appearing after a change, and stops there. | Say the word and it can save to a throwaway plan instead. |

A fresh test account with a seeded transcript would unlock all three and would
also let the film show empty states and onboarding, which are genuinely part of
v3. That is the single highest-value follow-up if you want the reel to be
complete.

## What rendered

All 34 clips render. `ROUGH-CUT.mp4` is a 63-second animatic built by
`npm run assemble`: the real clips and type cards cut to the storyboard, with no
tilt, no depth of field, and no music. It exists to prove the shape and pacing
before anyone opens an editor, not to be the film.

Two surfaces refused to be filmed the obvious way and are worth knowing about if
you edit the shot scripts:

- **The public friend page needs a signed-in viewer.** Recorded anonymously it
  renders "Sign in to view profiles", so `25-public-page` uses the session.
- **The Simulator's Grades editor is already on in the saved plan.** A single
  click turned it off and removed every grade control, so `19-simulator-grades`
  ensures it is off first and then turns it on, which is the shot anyway.

## Also worth deciding

The footage is your real account: your name, your courses, a 3.90 GPA, and your
public friend page. That is the most convincing possible demo data and it is
yours to show, but it is a public launch video, so it is worth a deliberate
choice rather than a default. Shots where a number is prominent are
`16-stats`, `04-dashboard-reveal`, and `25-public-page`.
