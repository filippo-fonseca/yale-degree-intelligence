// Shared stage for every DegreeIntelligence demo shot.
//
// Handles the three things every take needs: the authenticated session, a
// deterministic starting surface (theme + tab pre-seeded so no shot has to
// waste footage navigating), and testreel's cursor overlay / post-processing.
import { chromium } from 'playwright';
import { recordPage, moveCursorToPoint } from 'testreel';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

export const HOME = 'https://www.degreeint.com';
const STATE = path.join(os.homedir(), '.di-demo', 'state.json');

export const TABS = {
  courses: 'upload',
  major: 'major',
  certificate: 'certificate',
  simulator: 'simulator',
  stats: 'stats',
  friends: 'friends',
  distributionals: 'distributionals',
};

/**
 * @param {object} o
 * @param {string} [o.tab]     key of TABS; which dashboard pane to boot into
 * @param {'dark'|'light'} [o.theme]
 * @param {string} o.outDir    where the clip lands
 * @param {{width:number,height:number}} [o.viewport]
 * @param {boolean} [o.cursor]
 */
export async function openStage(o) {
  const viewport = o.viewport ?? { width: 1920, height: 1080 };
  const theme = o.theme ?? 'dark';
  fs.mkdirSync(o.outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--force-color-profile=srgb', '--font-render-hinting=none'],
  });

  const ctx = await browser.newContext({
    // anon shots (landing, login) must not carry the session
    ...(o.anon ? {} : { storageState: STATE }),
    viewport,
    recordVideo: { dir: o.outDir, size: viewport },
    colorScheme: theme,
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });

  // Pre-seed the surface before the app boots. The dashboard reads both of
  // these from localStorage on mount, so setting them here means the shot opens
  // already on the right pane in the right theme.
  const tabId = o.tab ? TABS[o.tab] : null;
  await ctx.addInitScript(
    ({ tabId, theme, keepSimNote }) => {
      try {
        // di-theme is written raw by ThemeContext; dashboardActiveTab goes
        // through useLocalStorage, which JSON-encodes. Match each exactly.
        localStorage.setItem('di-theme', theme);
        if (tabId) localStorage.setItem('dashboardActiveTab', JSON.stringify(tabId));
        // Tip modals would cover the board on the first frame of every take.
        // These flags are localStorage-only by design (see lib/useDismissibleFlag),
        // so seeding them here cannot touch the real account.
        localStorage.setItem('myMajorTipModalShown', 'true');
        localStorage.setItem('myCertificateTipModalShown', 'true');
        if (!keepSimNote)
          localStorage.setItem('di-dismissed:sim:progress-grades-distribs', '1');
      } catch {}
    },
    { tabId, theme, keepSimNote: !!o.keepSimNote },
  );

  // Playwright starts the video when the page opens, not when recordPage() is
  // called, so every clip would otherwise begin with the whole cold load.
  // Measure the offset precisely and trim exactly that much in finish().
  const tOpen = Date.now();
  const page = await ctx.newPage();
  await page.goto(o.url ?? HOME, { waitUntil: 'domcontentloaded' });

  if (!o.anon) {
    // Wait for the authenticated dashboard rather than a fixed sleep: the
    // sidebar only renders once Firebase has resolved the user.
    await page.waitForSelector('[data-tour="search"]', { timeout: 45000 });
  }
  if (o.waitFor) {
    await page.waitForSelector(o.waitFor, { timeout: 45000 }).catch(() => {});
  }
  // Panes are code-split and render a "Loading..." placeholder while they
  // stream in. Starting the take on that placeholder wastes the shot, so hold
  // until it is gone rather than guessing a sleep.
  await settleLoading(page, o.loadingTimeout ?? 25000);
  await page.waitForTimeout(o.settle ?? 3500);

  const rec = await recordPage(page, {
    outputDir: o.outDir,
    cursor:
      o.cursor === false
        ? false
        : {
            style: 'default',
            size: 44,
            rippleColor: 'rgba(236, 72, 153, 0.45)',
            rippleSize: 90,
            idleHide: true,
            idleHideMs: 2500,
            fadeMs: 350,
          },
    chrome: false,
    background: false,
    outputFormat: 'mp4',
  });

  // Everything before this instant is cold-load footage.
  const leadIn = (Date.now() - tOpen) / 1000;

  return { browser, ctx, page, rec, leadIn };
}

/** Hold until the pane's "Loading..." placeholder is gone. */
export async function settleLoading(page, timeout = 25000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const loading = await page
      .evaluate(() => /\bLoading\b/.test(document.body.innerText || ''))
      .catch(() => false);
    if (!loading) return true;
    await page.waitForTimeout(400);
  }
  return false;
}

/**
 * Smooth-scroll the pane.
 *
 * The dashboard does not scroll the window: content lives in an inner
 * `overflow-y-auto` container, so window.scrollBy is a no-op on every
 * authenticated surface. Standalone pages (landing, changelog, mission) do
 * scroll the window, so detect which applies and animate whichever is real.
 */
export async function scrollPane(page, dy, ms = 750) {
  await page.evaluate(
    async ([dy, ms]) => {
      const els = Array.from(document.querySelectorAll('*')).filter((e) => {
        if (e.scrollHeight <= e.clientHeight + 20 || e.clientHeight < 250) return false;
        const s = getComputedStyle(e);
        return s.overflowY === 'auto' || s.overflowY === 'scroll';
      });
      const pane = els.sort((a, b) => b.clientHeight - a.clientHeight)[0];
      const useWin =
        !pane && document.documentElement.scrollHeight > innerHeight + 20;
      const start = pane ? pane.scrollTop : scrollY;
      const t0 = performance.now();
      await new Promise((resolve) => {
        const tick = (now) => {
          const t = Math.min(1, (now - t0) / ms);
          const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          const y = start + dy * e;
          if (pane) pane.scrollTop = y;
          else if (useWin) scrollTo(0, y);
          if (t < 1) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
    },
    [dy, ms],
  );
}

/**
 * Drag for native HTML5 drag-and-drop.
 *
 * The Simulator uses `draggable` + onDragStart/onDragOver/onDrop, and Chromium
 * does not synthesise those from page.mouse events, so a mouse-based drag moves
 * the cursor convincingly and changes nothing. Playwright's dragTo() does fire
 * them but lands instantly, which is useless as footage.
 *
 * So: dispatch the real drag events, and pace the dragover stream by hand while
 * the cursor overlay travels. The handlers pass the payload through React state
 * rather than dataTransfer, and they sit on the semester container, so events
 * dispatched on a descendant reach them by bubbling. Each dragover also sets the
 * drop-target highlight, which is what sells the motion on screen.
 */
export async function htmlDrag(page, fromSel, toSel, opts = {}) {
  const steps = opts.steps ?? 22;
  const src = page.locator(fromSel).first();
  const tgt = page.locator(toSel).first();
  const a = await src.boundingBox();
  const b = await tgt.boundingBox();
  if (!a || !b) throw new Error(`htmlDrag: missing box ${fromSel} -> ${toSel}`);

  const sx = a.x + a.width / 2;
  const sy = a.y + a.height / 2;
  const tx = b.x + b.width / 2;
  const ty = b.y + (opts.toOffsetY ?? b.height / 2);

  await moveCursorToPoint(page, sx, sy);
  await page.waitForTimeout(420);

  await src.evaluate((el) => {
    const dt = new DataTransfer();
    window.__reelDt = dt;
    el.dispatchEvent(
      new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }),
    );
  });
  await page.waitForTimeout(240);

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const x = sx + (tx - sx) * e;
    const y = sy + (ty - sy) * e;
    await moveCursorToPoint(page, x, y, undefined, true);
    await tgt.evaluate(
      (el, p) => {
        el.dispatchEvent(
          new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            dataTransfer: window.__reelDt,
            clientX: p.x,
            clientY: p.y,
          }),
        );
      },
      { x, y },
    );
    await page.waitForTimeout(opts.stepMs ?? 30);
  }

  await page.waitForTimeout(320);
  await tgt.evaluate(
    (el, p) => {
      el.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: window.__reelDt,
          clientX: p.x,
          clientY: p.y,
        }),
      );
    },
    { x: tx, y: ty },
  );
  await src
    .evaluate((el) =>
      el.dispatchEvent(
        new DragEvent('dragend', { bubbles: true, dataTransfer: window.__reelDt }),
      ),
    )
    .catch(() => {}); // the source node is gone once the drop re-renders
  await page.waitForTimeout(opts.after ?? 900);
}

/** Drag one element onto another with the cursor overlay following the pointer. */
export async function drag(page, fromSel, toSel, opts = {}) {
  const steps = opts.steps ?? 26;
  const from = await page.locator(fromSel).first().boundingBox();
  const to = await page.locator(toSel).first().boundingBox();
  if (!from || !to) throw new Error(`drag: missing box ${fromSel} -> ${toSel}`);

  const sx = from.x + from.width / 2;
  const sy = from.y + from.height / 2;
  const tx = to.x + to.width / 2;
  const ty = to.y + (opts.toOffsetY ?? to.height / 2);

  await moveCursorToPoint(page, sx, sy);
  await page.mouse.move(sx, sy);
  await page.waitForTimeout(320);
  await page.mouse.down();
  await page.waitForTimeout(220);

  for (let i = 1; i <= steps; i++) {
    // ease-in-out so the card accelerates off the stack and settles into the
    // target instead of sliding linearly
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const x = sx + (tx - sx) * e;
    const y = sy + (ty - sy) * e;
    await page.mouse.move(x, y);
    await moveCursorToPoint(page, x, y, undefined, true);
    await page.waitForTimeout(opts.stepMs ?? 22);
  }

  await page.waitForTimeout(260);
  await page.mouse.up();
  await page.waitForTimeout(opts.after ?? 900);
}

/** Switch dashboard tab through the sidebar so the cursor move is on camera. */
export async function gotoTab(rec, tab) {
  const id = TABS[tab];
  await rec.click(`[data-tour="nav-${id}"]`);
  await rec.wait(1600);
}

export async function finish(st, label) {
  const { browser, rec, leadIn = 0 } = st;
  const result = await rec.stop();
  await browser.close();

  // Drop the cold-load head so the clip opens on a painted, ready surface.
  // A small negative bias keeps a few frames of settled UI before the action.
  const cut = Math.max(0, leadIn - 1.2);
  if (result?.video && cut > 0.5) {
    const trimmed = result.video.replace(/\.mp4$/, '.trim.mp4');
    const ok = spawnSync(
      'ffmpeg',
      ['-hide_banner', '-loglevel', 'error', '-y', '-ss', cut.toFixed(2),
       '-i', result.video, '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast',
       '-pix_fmt', 'yuv420p', '-an', trimmed],
      { stdio: 'inherit' },
    );
    if (ok.status === 0 && fs.existsSync(trimmed)) {
      result.video = trimmed;
      console.log(`[shot] ${label} trimmed ${cut.toFixed(1)}s of lead-in`);
    }
  }
  console.log(`[shot] ${label} -> ${result.video}`);
  return result;
}
