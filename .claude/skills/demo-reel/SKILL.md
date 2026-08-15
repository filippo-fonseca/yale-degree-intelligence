---
name: demo-reel
description: Record a product demo reel or launch film for a web app — study a reference video, script it, then capture clean per-feature clips with Playwright + testreel that an editor can cut. Use when asked to make a demo video, launch trailer, product film, feature footage, or "record the app doing X".
allowed-tools: Bash, Read, Write, Edit, WebFetch
---

# Demo reel

Produce **cuttable footage**, not a finished video. The deliverable is one clean
clip per feature plus a storyboard that says where each clip lands. Editors need
raw material with headroom; a pre-composited film is a dead end the moment they
want a different cut.

## The rule that decides everything else

**Capture clean, style in the edit.** Record full-bleed at 1080p or better, no
window chrome, no gradient background, no speed ramps, no baked-in zoom. Every
stylistic move the reference makes (3D tilt, shallow depth of field, push-ins,
speed changes, colour cards) is an edit decision. Baking any of it into the
capture destroys the footage for every other cut.

The exception is the animated cursor: it has to be captured, because it is a
record of a real interaction and cannot be added later.

## 1. Watch the reference before writing anything

If the user names a reference video, actually watch it. Do not infer a style
from its reputation.

```bash
# if the `watch` skill is installed, prefer it; otherwise:
yt-dlp -o ref.mp4 "<url>"
ffmpeg -i ref.mp4 -vf "fps=1,scale=640:-1" -q:v 4 frames/f_%03d.jpg
```

Then `Read` the frames. Write down its grammar explicitly: ground colour, shot
scale, cut rhythm, how type is used, whether there is narration, how it closes.
That written grammar is what the storyboard has to obey.

> `watch`'s frame extraction fails on ffmpeg 8 (`-vsync` was removed). The
> download and captions still work, so pull frames with the ffmpeg line above.

## 2. Get a real authenticated session

Most of the product is behind login. Ask the user to log in once, interactively,
into a browser you control. Do not try to automate an OAuth flow.

```js
const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: 'chrome',            // real Chrome: Google blocks automation Chromium
  headless: false,
  args: ['--disable-blink-features=AutomationControlled'],
});
// …poll until the app's auth marker appears, then:
await ctx.storageState({ path: STATE, indexedDB: true });
```

**`indexedDB: true` is not optional for Firebase apps.** The Firebase Web SDK
persists the signed-in user in the `firebaseLocalStorageDb` IndexedDB database,
not in localStorage, so a default `storageState()` produces a file that looks
fine and restores you to the logged-out page. Playwright 1.51+ supports the flag.

Poll for the real auth marker rather than asking the user to confirm. For
Firebase, that is a `firebase:authUser:*` key in that database.

## 3. Probe before you script

Never write shot scripts against guessed selectors. Boot the authenticated app
once per surface, screenshot it, and dump what is actually there.

Look for existing test hooks first: `data-testid`, `data-tour`, `data-cy`.
An app that has them gives you stable selectors for free.

```bash
rg -o 'data-(testid|tour)="[^"]+"' -g '*.tsx' | sort -u
```

Then read the screenshots. You are choosing what each shot frames, and you
cannot do that from a DOM dump.

## 4. Deep-link each shot to its surface

Footage spent navigating is footage wasted. Find how the app persists its
current view and pre-seed it with `addInitScript` before the app boots.

**Match the encoding exactly.** A codebase often mixes conventions: a
`useLocalStorage` hook that `JSON.stringify`s its value sits next to a context
that writes a raw string. Setting `tab` when the app expects `"tab"` fails
silently, and every shot renders the default pane. Read the hook, do not assume.

Seed dismissible tips and first-run modals the same way, so no take opens with
an overlay across it. Check first that those flags are local-only; if a flag
lives on the server profile, seeding it would write to the user's real account.

## 5. Know what the recorder cannot do

`testreel` gives you an animated cursor, click ripples, zoom, and mp4 output.
Its 15 actions do **not** include drag. If the product's hero interaction is a
drag, build it from the exported primitives:

```js
import { moveCursorToPoint } from 'testreel';
await page.mouse.down();
for (…) {                        // ease-in-out, ~25 steps
  await page.mouse.move(x, y);
  await moveCursorToPoint(page, x, y, undefined, true);  // silent = overlay only
}
await page.mouse.up();
```

Use `recordPage(page, opts)` rather than the JSON definition format whenever you
need to own the browser lifecycle, which you do as soon as auth or `colorScheme`
matters.

## 6. Two failure modes that look like success

Both produce a valid mp4 that is useless, and neither throws.

**Cold-load lead-in.** Playwright starts recording when the *page opens*, not
when `recordPage()` is called. Every clip silently begins with the entire cold
load. Measure the offset and trim exactly it:

```js
const tOpen = Date.now();
const page = await ctx.newPage();
// …navigate, wait for readiness…
const rec = await recordPage(page, opts);
const leadIn = (Date.now() - tOpen) / 1000;   // ffmpeg -ss leadIn afterwards
```

**Scroll that does nothing.** Many app shells scroll an inner
`overflow-y: auto` container while `document.documentElement.scrollHeight`
equals the viewport height. `window.scrollBy` and any recorder `scroll` action
built on it are no-ops, and the clip just sits still. Detect the real scroller
and animate its `scrollTop`:

```js
const pane = [...document.querySelectorAll('*')]
  .filter(e => e.scrollHeight > e.clientHeight + 20 && e.clientHeight > 250)
  .filter(e => ['auto','scroll'].includes(getComputedStyle(e).overflowY))
  .sort((a,b) => b.clientHeight - a.clientHeight)[0];
```

Also hold until the pane has actually painted. Code-split views render a
`Loading…` placeholder, and a shot that opens on it is wasted.

## 7. QC every clip by looking at it

A green exit code means ffmpeg ran, nothing more. For each clip, check duration
and sample frames:

```bash
ffprobe -v error -show_entries format=duration -of default=nw=1 shot.mp4
ffmpeg -i shot.mp4 -vf "fps=1/3,scale=700:-1" -q:v 3 /tmp/qc/%02d.jpg
```

`Read` the frames. You are looking for: a painted first frame, the interaction
actually happening, no overlay covering the subject, no dead air at the tail.
Re-record anything that fails; do not report a clip you have not seen.

## 8. Never mutate the user's account

Recording against a real account is normal and usually the only way to get
convincing data. Producing footage must not change that data.

Safe: navigating, filtering, toggling views, opening modals, dragging things
that are only committed on save. Not safe without explicit permission: saving,
deleting, adding entities, dismissing anything stored server-side, uploading.

When a feature cannot be filmed without a write, film the affordance instead
(the Save button appearing is the shot; clicking it is not) and tell the user
which shots need permission or a test account.

## Deliverables

- `STORYBOARD.md` — the reference's grammar, then a timecoded shot list keyed to
  clip ids, plus editing notes for the look you are not baking in.
- One clip per feature, named by id, in a single flat folder.
- Type cards as 1920x1080 PNGs, rendered from HTML, in two variants: on the
  ground colour and on transparent for compositing.
- A manifest listing what rendered and what did not, with reasons.
