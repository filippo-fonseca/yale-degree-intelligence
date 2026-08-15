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
not a capture decision. That is why every clip in `demo/shots/` is recorded
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
| 0:07.0 | Transcript PDF drops into the upload zone. Macro on the drop target. | `03-transcript-upload` |
| 0:08.5 | Parse runs. Courses cascade in as cards. Push in slightly. | `03-transcript-upload` |
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
| 0:18.5 | Violet full-bleed: **CERTIFICATES** | type card |
| 0:19.0 | Certificate picker. 42 of them scroll past. | `09-certificates-list` |
| 0:20.5 | Overlap meter fills. A shared course greys out with its reason. | `10-certificate-overlap` |
| 0:22.5 | Pink full-bleed: **DISTRIBUTIONALS** | type card |
| 0:23.0 | Distributional rings and the pie resolve. | `11-distributionals` |
| 0:24.5 | Language track steps up a level. | `11-distributionals` |
| 0:25.5 | Violet full-bleed: **STATS** | type card |
| 0:26.0 | GPA line draws itself across eight semesters. | `12-stats` |
| 0:27.5 | Black. | — |

### Act 3 — The what-if (0:28 to 0:44)

The drop. This is the longest continuous stretch of product in the film,
because the Simulator is the thing nobody else has.

| Time | Content | Source |
|---|---|---|
| 0:28.0 | **Now change your mind.** Large, centred, holds through the drop. | type card |
| 0:29.5 | Canvas. Empty semesters, course pool. Wide, tilted. | `13-simulator-canvas` |
| 0:31.0 | A course is dragged from one semester into another. Macro, follow the card. | `13-simulator-canvas` |
| 0:33.0 | Two more drop in fast. Cut each on the beat. | `13-simulator-canvas` |
| 0:35.0 | Grades editor toggles on. Letter grades appear on every card. | `14-simulator-grades` |
| 0:36.5 | Distributionals editor toggles on. Tags fill themselves in. | `15-simulator-distributionals` |
| 0:38.0 | **Watch every number move.** (pink) | type card |
| 0:39.0 | Snap to the Progress tab. Requirement cards recompute. | `16-simulator-progress` |
| 0:41.0 | GPA timeline redraws with the projection. Macro on the numbers. | `16-simulator-progress` |
| 0:42.5 | Cmd+S. Save lands on the plan. | `17-simulator-save` |
| 0:43.5 | Black. | — |

The 0:36.5 beat is worth protecting in the edit. Tags filling themselves in is
the single most "it already knows" moment in the product, and it reads instantly
even at half a second.

### Act 4 — Craft and social (0:44 to 0:53)

| Time | Content | Source |
|---|---|---|
| 0:44.0 | Light mode wipes across the dashboard. | `18-theme-toggle` |
| 0:45.5 | Public friend page. Clean, no grades, courses by semester. | `19-friends-public-page` |
| 0:47.0 | Copy link. The toast confirms. | `20-friends-tab` |
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
| 0:57.0 | Logo. `degreeint.com`. Beneath it, small: Free forever. Open source. | `21-end-card` |
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

| Clip | Feature | v3? |
|---|---|---|
| `01-landing-hero` | Landing, star field, hero buttons | new in v3 |
| `02-login` | Yale Google sign-in | |
| `03-transcript-upload` | Transcript parse, dedupe, cached re-import | improved v3 |
| `04-dashboard-reveal` | First paint of the dashboard | |
| `05-my-courses` | Courses by semester, filters, in-progress | |
| `06-command-palette` | Cmd+K global search | **new in v3** |
| `07-major-board` | Requirement board | **new in v3** |
| `08-major-heatmap` | Heat map view | **new in v3** |
| `09-certificates-list` | All 42 certificates | **new in v3** |
| `10-certificate-overlap` | Policy engine, overlap meter, conflicts | **new in v3** |
| `11-distributionals` | Auto-filled tags, per-language tracking | **new in v3** |
| `12-stats` | GPA trend, credits, grade distribution | improved v3 |
| `13-simulator-canvas` | Canvas, drag between semesters | **new in v3** |
| `14-simulator-grades` | Grades editor | **new in v3** |
| `15-simulator-distributionals` | Distributionals editor, auto-fill | **new in v3** |
| `16-simulator-progress` | Progress tab, projected GPA and tally | **new in v3** |
| `17-simulator-save` | Plan manager, Cmd+S | **new in v3** |
| `18-theme-toggle` | Light mode | **new in v3** |
| `19-friends-public-page` | Public page | rebuilt v3 |
| `20-friends-tab` | Friends tab, copy link, privacy | rebuilt v3 |
| `21-end-card` | Changelog / mission / open source | |
| `22-double-major-conflicts` | Shared course conflict manager | **new in v3** |
| `23-tutorial` | Guided in-app tour | **new in v3** |

## Editing notes

- Everything is captured at 1920x1080, 30fps, MP4, dark mode, no chrome.
- Cursor is on. If a shot reads better without it, mask it or crop past it.
- Nothing is sped up in capture. Speed ramps belong in the edit, where you can
  land them on the beat.
- For the macro look: scale the clip to 200-300%, rotate 8-14 degrees on Y,
  4-8 degrees on Z, then add a gaussian blur ramp from the frame edges. The
  reference is doing exactly this and nothing more.
- Keep the blackouts. They are what make 60 seconds feel unhurried.
