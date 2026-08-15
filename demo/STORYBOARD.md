# DegreeIntelligence v3 — Launch Film

**Runtime:** 60 seconds. **Voiceover:** none. **Driver:** music, cut on beat.
**Reference:** the Notify.me launch trailer (Jamie Pine, 2021), 47s.

---

## What we are borrowing from the reference

I pulled the reference apart frame by frame. Its grammar is five rules, and the
whole film obeys them:

1. **Pure black ground.** Every shot sits on `#000`. The UI is dark mode, so the
   app bleeds into the background instead of sitting in a box.
2. **Macro, not screenshots.** The UI never appears as a flat, whole, front-on
   screen. It is composited onto a plane, tilted in 3D, pushed close, and thrown
   out of focus at the edges. You read one stat row, one button, one card.
3. **Kinetic type interstitials.** Huge bold sans, white on black, with exactly
   one accent colour. Occasionally a full-bleed card where the accent becomes
   the whole frame and a single word sits on it.
4. **Cuts on the beat, blackouts between acts.** Shots run 0.5s to 2s. A hard
   black frame separates sections.
5. **One positioning line, then a plain CTA.** The reference spends its whole
   runtime earning "The platform above all platforms," then closes on centred
   text and store badges. No hard sell.

Rule 2 is the one that does the heavy lifting, and it is an **edit** decision,
not a capture decision. That is why every clip the reel kit renders is recorded
clean, full-bleed, dark, at 1920x1080, with no window chrome and no gradient
background. The tilt, the depth of field, and the push are yours to add in the
edit. Baking them in would make the footage un-editable.

## Palette and type

| Token | Value | Use |
|---|---|---|
| Ground | `#000000` | every background, every interstitial |
| Primary accent | `#ec4899` (pink) | headline emphasis, full-bleed cards |
| Secondary accent | `#a78bfa` (violet) | second-tier emphasis, gradient partner |
| Type | white `#ffffff` | everything else |

Typeface: Inter Tight Bold or SF Pro Display Bold, tight tracking (-2%),
sentence case with a full stop. The full stop matters. It is what makes the
short lines land as statements instead of labels.

## Music

Target 120 to 126 BPM. At 124 BPM a beat is 0.48s and a bar is 1.94s. Every
timecode below lands on a beat. Look for something that has a clear drop at
about 0:28, because that is where the Simulator enters and it is the moment the
film needs to open up.

---

## The film

### Act 0 — Cold open (0:00 to 0:06)

Numbers escalate into chaos, then resolve to one. White on black, each card
replacing the last on the beat, no transitions.

| Time | Content | Source |
|---|---|---|
| 0:00.0 | Black. Star field drifts up from the landing hero, very dim. | `01-landing-hero` (first 2s, heavily darkened) |
| 0:01.0 | **142 majors.** | type card |
| 0:01.5 | **42 certificates.** | type card |
| 0:02.0 | **6,616 courses.** | type card |
| 0:02.5 | **Four years.** | type card |
| 0:03.5 | **One transcript.** (pink) | type card |
| 0:04.5 | Black. Beat of silence. | — |
| 0:05.0 | Hard cut: the dashboard resolves from blur to sharp, tilted. | `04-dashboard-reveal` |

The escalation is real. Those are the actual counts in the catalog, so the film
opens on something true rather than on a slogan.

### Act 1 — One upload (0:06 to 0:15)

| Time | Content | Source |
|---|---|---|
| 0:06.0 | **Upload once.** | type card |
| 0:07.0 | Transcript PDF drops into the upload zone. Macro on the drop target. | `27-transcript-upload-ui` |
| 0:08.5 | Parse runs. Courses cascade in as cards. Push in slightly. | `27-transcript-upload-ui` |
| 0:11.0 | **Know everything.** (pink) | type card |
| 0:12.0 | My Courses, by semester. Tilted, drifting left. | `05-my-courses` |
| 0:14.0 | Cmd+K. Palette snaps open, a course code types itself, jump. | `06-command-palette` |

`06-command-palette` is the first "this is fast" moment. Cut it tight and let
the keystroke sound carry it.

### Act 2 — The truth (0:15 to 0:28)

Full-bleed accent cards, one word each, alternating with macro UI. This is the
reference's "SOUNDS" move.

| Time | Content | Source |
|---|---|---|
| 0:15.0 | Pink full-bleed: **MAJORS** | type card |
| 0:15.5 | Requirement board, cards filling. Macro on one card going green. | `07-major-board` |
| 0:17.0 | Heat map snaps on. Whole degree in one grid. | `08-major-heatmap` |
| 0:18.0 | Two majors, two shared courses, flagged. | `09-major-shared-courses` |
| 0:18.5 | Violet full-bleed: **CERTIFICATES** | type card |
| 0:19.0 | Certificate progress, requirement cards, the policy in force. | `11-certificates` |
| 0:20.5 | The `no overlap` badge. Data Science shares nothing with a major. | `11-certificates` |
| 0:22.5 | Pink full-bleed: **DISTRIBUTIONALS** | type card |
| 0:23.0 | Distributional rings and the pie resolve. | `13-distributionals` |
| 0:24.5 | Language track steps up a level. French, then Russian. | `14-distributionals-language` |
| 0:25.5 | Violet full-bleed: **STATS** | type card |
| 0:26.0 | GPA line draws itself across eight semesters. | `16-stats` |
| 0:27.5 | Black. | — |

### Act 3 — The what-if (0:28 to 0:44)

The drop. This is the longest continuous stretch of product in the film,
because the Simulator is the thing nobody else has.

| Time | Content | Source |
|---|---|---|
| 0:28.0 | **Now change your mind.** Large, centred, holds through the drop. | type card |
| 0:29.5 | Canvas. Empty semesters, course pool. Wide, tilted. | `17-simulator-canvas` |
| 0:31.0 | A course is dragged from one semester into another. Macro, follow the card. | `17-simulator-canvas` |
| 0:33.0 | Two more drop in fast. Cut each on the beat. | `18-simulator-drag-back` |
| 0:35.0 | Grades editor toggles on. Letter grades appear on every card. | `19-simulator-grades` |
| 0:36.5 | Distributionals editor toggles on. Tags fill themselves in. | `20-simulator-distributionals` |
| 0:38.0 | **Watch every number move.** (pink) | type card |
| 0:39.0 | Snap to the Progress tab. Requirement cards recompute. | `21-simulator-progress` |
| 0:41.0 | GPA timeline redraws with the projection. Macro on the numbers. | `21-simulator-progress` |
| 0:42.5 | Cmd+S. Save lands on the plan. | `23-simulator-save-affordance` |
| 0:43.5 | Black. | — |

The 0:36.5 beat is worth protecting in the edit. Tags filling themselves in is
the single most "it already knows" moment in the product, and it reads instantly
even at half a second.

### Act 4 — Craft and social (0:44 to 0:53)

| Time | Content | Source |
|---|---|---|
| 0:44.0 | Light mode wipes across the dashboard. | `26-theme-toggle` |
| 0:45.5 | Public friend page. Clean, no grades, courses by semester. | `25-public-page` |
| 0:47.0 | Copy link. The toast confirms. | `24-friends` |
| 0:48.0 | Grades and GPA are never shared. Small type, holds. | type card |
| 0:49.5 | Fast montage, 0.4s each: board, heat map, palette, canvas, stats. | reuse |
| 0:52.0 | Black. | — |

### Act 5 — Close (0:53 to 1:00)

The positioning statement, then the CTA. Nothing moves except the type.

| Time | Content | Source |
|---|---|---|
| 0:53.0 | **No AI.** | type card |
| 0:54.0 | **No guessing.** | type card |
| 0:55.0 | **Just Yale's rules.** (pink) | type card |
| 0:56.5 | Black. | — |
| 0:57.0 | Logo. `degreeint.com`. Beneath it, small: Free forever. Open source. | `06-end-card (type card)` |
| 0:59.0 | Bottom line, very small: Used by roughly 1 in 6 Yale undergrads. | end card |
| 1:00.0 | Out. | — |

**On the closing statement.** "No AI. No guessing. Just Yale's rules." is the
honest differentiator and it is defensible. DegreeIntelligence deliberately
removed its AI advisor, and every number in the product comes from the
requirement engine rather than a model. In a year when every student tool is
advertising a chatbot, saying the opposite is the strongest thing this film can
say. It is also the one claim a competitor cannot copy without rebuilding.

---

## Deliverables map

These are the real clip ids produced by `demo/reelkit`. Anything referenced in
the timecode tables above resolves to one of these.

| Clip | Feature | v3? |
|---|---|---|
| `01-landing-hero` | Landing, drifting star field, new hero buttons | **new in v3** |
| `02-landing-light` | The same landing in light mode | **new in v3** |
| `04-dashboard-reveal` | First paint of the dashboard | |
| `05-my-courses` | Courses by semester, semester rail | |
| `06-command-palette` | Cmd+K, searching courses and requirements | **new in v3** |
| `06b-command-palette-jump` | Cmd+K straight into another surface | **new in v3** |
| `07-major-board` | Requirement board, requirement modal | **new in v3** |
| `08-major-heatmap` | Heat map view of the whole major | **new in v3** |
| `09-major-shared-courses` | Double-major shared-course conflict manager | **new in v3** |
| `10-major-switch` | Switching between MENG and EECS | **new in v3** |
| `11-certificates` | Certificate progress, the `no overlap` policy badge | **new in v3** |
| `12-certificate-heatmap` | Certificate heat map | **new in v3** |
| `13-distributionals` | Breakdown donut, area and skill cards | improved v3 |
| `14-distributionals-language` | One language at a time: French and Russian | **new in v3** |
| `15-distributionals-heatmap` | Distributional heat map | **new in v3** |
| `16-stats` | GPA progression, per-department, grade distribution | improved v3 |
| `17-simulator-canvas` | Canvas, dragging a course between semesters | **new in v3** |
| `18-simulator-drag-back` | Two more drags, for cutting on the beat | **new in v3** |
| `19-simulator-grades` | Grades editor, changing a projected grade | **new in v3** |
| `20-simulator-distributionals` | Distributionals editor, tags pre-filled | **new in v3** |
| `21-simulator-progress` | Projected progress + results | **new in v3** |
| `22-simulator-plans` | Plan manager | **new in v3** |
| `23-simulator-save-affordance` | Save appearing on an unsaved change | **new in v3** |
| `24-friends` | Friends tab, What's shared, Copy link | rebuilt v3 |
| `25-public-page` | The public friend page itself | rebuilt v3 |
| `26-theme-toggle` | Light mode | **new in v3** |
| `27-transcript-upload-ui` | Re-upload transcript, dropzone, YHub steps | improved v3 |
| `28-changelog` | The public changelog | **new in v3** |
| `29-mission` | The mission page | |
| `30-sidebar-tour` | One pass across every pane, for the montage | |

Not filmed, and why: the guided tour and the v3 welcome are gated on Firestore
profile flags, and a live transcript parse needs a sample PDF. Both would need a
throwaway account. See `demo/README.md`.

## Editing notes

- Everything is captured at 1920x1080, 30fps, MP4, dark mode, no chrome.
- Cursor is on. If a shot reads better without it, mask it or crop past it.
- Nothing is sped up in capture. Speed ramps belong in the edit, where you can
  land them on the beat.
- For the macro look: scale the clip to 200-300%, rotate 8-14 degrees on Y,
  4-8 degrees on Z, then add a gaussian blur ramp from the frame edges. The
  reference is doing exactly this and nothing more.
- Keep the blackouts. They are what make 60 seconds feel unhurried.
