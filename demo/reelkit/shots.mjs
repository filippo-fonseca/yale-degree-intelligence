// Every shot in the DegreeIntelligence v3 launch film.
//
// One export per clip, keyed by the ids used in demo/STORYBOARD.md. Each shot
// opens on the surface it needs (theme + tab pre-seeded) so no footage is spent
// navigating, performs one legible idea, and stops.
//
// Nothing here writes to the account. Plans are never saved, certificates are
// never added, and the tip-modal flags seeded by the stage are localStorage-only.
import { openStage, finish, htmlDrag, gotoTab, scrollPane, HOME } from './stage.mjs';

const S = {};

/* ---------------------------------------------------------------- landing */

S['01-landing-hero'] = async (outDir) => {
  const st = await openStage({ anon: true, outDir, theme: 'dark', settle: 5000 });
  const { page, rec } = st;
  // Hold on the hero: the star field drifts and leans toward the cursor, and
  // that motion is the shot. Scrolling off it early throws the whole thing away.
  await rec.wait(2600);
  await rec.hover('h1');
  await rec.wait(2400);
  await rec.hover('a:has-text("Log in"), button:has-text("Log in") >> nth=0');
  await rec.wait(2600);
  await scrollPane(page, 380, 1100);
  await rec.wait(2400);
  await scrollPane(page, 460, 1100);
  await rec.wait(2400);
  return finish(st, '01-landing-hero');
};

S['02-landing-light'] = async (outDir) => {
  const st = await openStage({ anon: true, outDir, theme: 'light', settle: 5000 });
  const { page, rec } = st;
  await rec.wait(2000);
  await scrollPane(page, 500);
  await rec.wait(1600);
  await scrollPane(page, 700);
  await rec.wait(1800);
  return finish(st, '02-landing-light');
};

/* ------------------------------------------------------------- my courses */

S['04-dashboard-reveal'] = async (outDir) => {
  const st = await openStage({ tab: 'courses', outDir, settle: 4200 });
  const { page, rec } = st;
  await rec.wait(2600);
  await scrollPane(page, 260);
  await rec.wait(2200);
  return finish(st, '04-dashboard-reveal');
};

S['05-my-courses'] = async (outDir) => {
  const st = await openStage({ tab: 'courses', outDir });
  const { page, rec } = st;
  await rec.wait(1400);
  // Semester rail. `text=` also matches the section headings, which are not
  // clickable, so target the rail buttons themselves.
  await rec.click('button:has-text("Spring 2026") >> nth=0');
  await rec.wait(1700);
  await rec.click('button:has-text("Fall 2025") >> nth=0');
  await rec.wait(1700);
  await scrollPane(page, 380);
  await rec.wait(1800);
  return finish(st, '05-my-courses');
};

// The v3 headline: Cmd+K from anywhere. Driven by the real hotkey rather than
// the sidebar button, because the shortcut is the feature.
const PALETTE = 'input[placeholder^="Search courses"]';

S['06-command-palette'] = async (outDir) => {
  const st = await openStage({ tab: 'courses', outDir });
  const { page, rec } = st;
  await rec.wait(1200);
  await page.keyboard.press('Meta+k');
  await page.waitForSelector(PALETTE, { timeout: 8000 });
  await rec.wait(900);
  await rec.type(PALETTE, 'thermo', { delay: 115 });
  await rec.wait(2200);
  for (let i = 0; i < 6; i++) await page.keyboard.press('Backspace');
  await rec.wait(600);
  await rec.type(PALETTE, 'certificate', { delay: 105 });
  await rec.wait(2400);
  await page.keyboard.press('ArrowDown');
  await rec.wait(700);
  await page.keyboard.press('ArrowDown');
  await rec.wait(1600);
  return finish(st, '06-command-palette');
};

// Second take: the palette closing straight into a destination.
S['06b-command-palette-jump'] = async (outDir) => {
  const st = await openStage({ tab: 'stats', outDir });
  const { page, rec } = st;
  await rec.wait(1200);
  await page.keyboard.press('Meta+k');
  await page.waitForSelector(PALETTE, { timeout: 8000 });
  await rec.wait(800);
  await rec.type(PALETTE, 'simulator', { delay: 110 });
  await rec.wait(1800);
  await page.keyboard.press('Enter');
  await rec.wait(3200);
  return finish(st, '06b-command-palette-jump');
};

/* ----------------------------------------------------------------- majors */

S['07-major-board'] = async (outDir) => {
  const st = await openStage({ tab: 'major', outDir, settle: 4500 });
  const { page, rec } = st;
  await rec.wait(1800);
  await scrollPane(page, 420);
  await rec.wait(1600);
  await rec.click('[data-tour="major-requirement-card"] >> nth=0');
  await rec.wait(2600);
  return finish(st, '07-major-board');
};

S['08-major-heatmap'] = async (outDir) => {
  const st = await openStage({ tab: 'major', outDir, settle: 4500 });
  const { page, rec } = st;
  await rec.wait(1200);
  await rec.click('[data-tour="major-heatmap-toggle"]');
  await rec.wait(2400);
  await rec.hover('[data-tour="major-heatmap-cell"] >> nth=4');
  await rec.wait(1500);
  await rec.hover('[data-tour="major-heatmap-cell"] >> nth=11');
  await rec.wait(1800);
  return finish(st, '08-major-heatmap');
};

S['09-major-shared-courses'] = async (outDir) => {
  const st = await openStage({ tab: 'major', outDir, settle: 4500 });
  const { page, rec } = st;
  await rec.wait(1200);
  await rec.click('[data-tour="major-shared-courses"]');
  await rec.wait(3000);
  await scrollPane(page, 260);
  await rec.wait(2000);
  return finish(st, '09-major-shared-courses');
};

S['10-major-switch'] = async (outDir) => {
  const st = await openStage({ tab: 'major', outDir, settle: 4500 });
  const { page, rec } = st;
  await rec.wait(1200);
  await rec.click('text=EECS - Electrical Engineering and Computer Science');
  await rec.wait(3000);
  await scrollPane(page, 380);
  await rec.wait(1800);
  return finish(st, '10-major-switch');
};

/* ----------------------------------------------------------- certificates */

S['11-certificates'] = async (outDir) => {
  const st = await openStage({ tab: 'certificate', outDir, settle: 4500 });
  const { page, rec } = st;
  await rec.wait(1600);
  // the policy badge: Data Science allows no double-counting at all
  await rec.hover('text=no overlap >> nth=0');
  await rec.wait(1900);
  await scrollPane(page, 460);
  await rec.wait(2200);
  return finish(st, '11-certificates');
};

S['12-certificate-heatmap'] = async (outDir) => {
  const st = await openStage({ tab: 'certificate', outDir, settle: 4500 });
  const { page, rec } = st;
  await rec.wait(1200);
  await rec.click('[data-tour="certificate-heatmap-toggle"]');
  await rec.wait(2600);
  await rec.hover('[data-tour="certificate-heatmap-cell"] >> nth=2');
  await rec.wait(1800);
  return finish(st, '12-certificate-heatmap');
};

/* -------------------------------------------------------- distributionals */

S['13-distributionals'] = async (outDir) => {
  const st = await openStage({ tab: 'distributionals', outDir, settle: 4500 });
  const { page, rec } = st;
  await rec.wait(2200);
  await scrollPane(page, 420);
  await rec.wait(1800);
  await scrollPane(page, 520);
  await rec.wait(2000);
  return finish(st, '13-distributionals');
};

S['14-distributionals-language'] = async (outDir) => {
  const st = await openStage({ tab: 'distributionals', outDir, settle: 4500 });
  const { page, rec } = st;
  await rec.wait(1000);
  // The LANGUAGE section sits well down the pane. scrollIntoViewIfNeeded fights
  // the inner scroll container, so drive the scroller directly instead.
  await scrollPane(page, 1150, 1100);
  await rec.wait(1600);
  // one language at a time: French and Russian tracked separately
  await rec.click('button:has-text("Russian")');
  await rec.wait(2200);
  await rec.click('button:has-text("French")');
  await rec.wait(2200);
  return finish(st, '14-distributionals-language');
};

S['15-distributionals-heatmap'] = async (outDir) => {
  const st = await openStage({ tab: 'distributionals', outDir, settle: 4500 });
  const { page, rec } = st;
  await rec.wait(1400);
  await rec.click('button:has-text("Heat map")');
  await rec.wait(2600);
  await scrollPane(page, 320);
  await rec.wait(1800);
  return finish(st, '15-distributionals-heatmap');
};

/* ------------------------------------------------------------------ stats */

S['16-stats'] = async (outDir) => {
  const st = await openStage({ tab: 'stats', outDir, settle: 5000 });
  const { page, rec } = st;
  await rec.wait(2400);
  await scrollPane(page, 380);
  await rec.wait(2200);
  await scrollPane(page, 420);
  await rec.wait(2200);
  await scrollPane(page, 460);
  await rec.wait(2200);
  return finish(st, '16-stats');
};

/* -------------------------------------------------------------- simulator */

const FALL26 = '[data-tour="simulator-board"] >> text=Fall 2026';
const SPRING27 = '[data-tour="simulator-board"] >> text=Spring 2027';

S['17-simulator-canvas'] = async (outDir) => {
  const st = await openStage({ tab: 'simulator', outDir, settle: 5200 });
  const { page, rec } = st;
  await rec.wait(2000);
  await scrollPane(page, 340);
  await rec.wait(1400);
  // Past terms are LOCKED, so the live drag is Fall 2026 -> Spring 2027.
  await htmlDrag(
    page,
    'text=MENG 3125 >> nth=0',
    'text=Spring 2027 >> nth=0',
    { toOffsetY: 240, stepMs: 24 },
  );
  await rec.wait(1800);
  return finish(st, '17-simulator-canvas');
};

S['18-simulator-drag-back'] = async (outDir) => {
  const st = await openStage({ tab: 'simulator', outDir, settle: 5200 });
  const { page, rec } = st;
  await rec.wait(1200);
  await scrollPane(page, 340);
  await rec.wait(1200);
  await htmlDrag(page, 'text=ECE 2031 >> nth=0', 'text=Fall 2026 >> nth=0', {
    toOffsetY: 200,
    stepMs: 22,
  });
  await rec.wait(1200);
  await htmlDrag(page, 'text=MENG 3422 >> nth=0', 'text=Spring 2027 >> nth=0', {
    toOffsetY: 260,
    stepMs: 22,
  });
  await rec.wait(1800);
  return finish(st, '18-simulator-drag-back');
};

S['19-simulator-grades'] = async (outDir) => {
  const st = await openStage({ tab: 'simulator', outDir, settle: 5200 });
  const { page, rec } = st;
  await rec.wait(1200);
  await rec.click('button:has-text("Grades")');
  await rec.wait(1800);
  await scrollPane(page, 420);
  await rec.wait(1400);
  // scrollIntoViewIfNeeded fights the inner scroller here; the pane is already
  // positioned, so act on the select directly.
  const sel = page.locator('select').first();
  await sel.selectOption('A-', { force: true, timeout: 8000 }).catch(async () => {
    await sel.selectOption({ index: 2 }, { force: true, timeout: 8000 });
  });
  await rec.wait(2000);
  const sel2 = page.locator('select').nth(1);
  await sel2.selectOption('A', { force: true, timeout: 8000 }).catch(() => {});
  await rec.wait(2400);
  return finish(st, '19-simulator-grades');
};

S['20-simulator-distributionals'] = async (outDir) => {
  const st = await openStage({ tab: 'simulator', outDir, settle: 5200 });
  const { page, rec } = st;
  await rec.wait(1200);
  // The sidebar nav item also says "Distributionals"; the nav one carries a
  // data-tour attribute, so exclude it rather than relying on DOM order.
  await rec.click('button:not([data-tour]):has-text("Distributionals")');
  await rec.wait(2000);
  await scrollPane(page, 420);
  await rec.wait(2400);
  return finish(st, '20-simulator-distributionals');
};

S['21-simulator-progress'] = async (outDir) => {
  const st = await openStage({ tab: 'simulator', outDir, settle: 5200 });
  const { page, rec } = st;
  await rec.wait(1200);
  await rec.click('button:has-text("Projected progress + results")');
  await rec.wait(3000);
  await scrollPane(page, 420);
  await rec.wait(2200);
  await scrollPane(page, 520);
  await rec.wait(2200);
  await scrollPane(page, 520);
  await rec.wait(2200);
  return finish(st, '21-simulator-progress');
};

S['22-simulator-plans'] = async (outDir) => {
  const st = await openStage({ tab: 'simulator', outDir, settle: 5200 });
  const { page, rec } = st;
  await rec.wait(1200);
  await rec.click('[data-tour="simulator-plan-actions"]');
  await rec.wait(3000);
  return finish(st, '22-simulator-plans');
};

// Shows the unsaved-change affordance appearing. Deliberately never clicks
// Save: that would overwrite the real default plan.
S['23-simulator-save-affordance'] = async (outDir) => {
  const st = await openStage({ tab: 'simulator', outDir, settle: 5200 });
  const { page, rec } = st;
  await rec.wait(1200);
  await scrollPane(page, 340);
  await rec.wait(1000);
  await htmlDrag(page, 'text=MENG 3125 >> nth=0', 'text=Spring 2027 >> nth=0', {
    toOffsetY: 240,
  });
  await rec.wait(1400);
  await rec.hover('button:has-text("Save")');
  await rec.wait(2600);
  return finish(st, '23-simulator-save-affordance');
};

/* ---------------------------------------------------------------- friends */

S['24-friends'] = async (outDir) => {
  const st = await openStage({ tab: 'friends', outDir, settle: 4500 });
  const { page, rec } = st;
  await rec.wait(1800);
  await rec.click('button:has-text("What\'s shared")');
  await rec.wait(2600);
  await rec.click('button:has-text("Copy link")');
  await rec.wait(2200);
  return finish(st, '24-friends');
};

S['25-public-page'] = async (outDir) => {
  // resolve the public URL from the Friends tab, then film the page itself
  const probe = await openStage({ tab: 'friends', outDir: outDir + '/_probe', settle: 4500, cursor: false });
  const href = await probe.page
    .locator('a:has-text("View public page"), [href*="/user/"]')
    .first()
    .getAttribute('href')
    .catch(() => null);
  await probe.browser.close();
  const url = href ? new URL(href, HOME).toString() : null;
  if (!url) throw new Error('25-public-page: could not resolve public page URL');

  const st = await openStage({ anon: true, url, outDir, settle: 6000 });
  const { page, rec } = st;
  await rec.wait(2400);
  await scrollPane(page, 420);
  await rec.wait(2000);
  await scrollPane(page, 520);
  await rec.wait(2200);
  return finish(st, '25-public-page');
};

/* ------------------------------------------------------------------ craft */

S['26-theme-toggle'] = async (outDir) => {
  const st = await openStage({ tab: 'major', outDir, settle: 4500 });
  const { page, rec } = st;
  await rec.wait(1600);
  const toggle = page.locator('header button, nav button').filter({ hasText: '' });
  await rec.click('button:near(:text("DegreeIntelligence")) >> nth=-2');
  await rec.wait(2600);
  return finish(st, '26-theme-toggle');
};

S['27-transcript-upload-ui'] = async (outDir) => {
  const st = await openStage({ tab: 'courses', outDir, settle: 4200 });
  const { page, rec } = st;
  await rec.wait(1200);
  await rec.click('[data-tour="courses-reupload"]');
  await rec.wait(3200);
  await scrollPane(page, 260);
  await rec.wait(2200);
  return finish(st, '27-transcript-upload-ui');
};

S['28-changelog'] = async (outDir) => {
  const st = await openStage({ anon: true, url: HOME + '/changelog', outDir, settle: 5000 });
  const { page, rec } = st;
  await rec.wait(2200);
  await scrollPane(page, 500);
  await rec.wait(1800);
  await scrollPane(page, 600);
  await rec.wait(1800);
  return finish(st, '28-changelog');
};

S['29-mission'] = async (outDir) => {
  const st = await openStage({ anon: true, url: HOME + '/mission', outDir, settle: 5000 });
  const { page, rec } = st;
  await rec.wait(2200);
  await scrollPane(page, 520);
  await rec.wait(1800);
  await scrollPane(page, 620);
  await rec.wait(1800);
  return finish(st, '29-mission');
};

S['30-sidebar-tour'] = async (outDir) => {
  // one continuous pass across every pane: the "whole product" montage shot
  const st = await openStage({ tab: 'courses', outDir, settle: 4200 });
  const { page, rec } = st;
  await rec.wait(1400);
  for (const t of ['major', 'certificate', 'simulator', 'stats', 'distributionals', 'friends']) {
    await gotoTab(rec, t);
    await rec.wait(1300);
  }
  return finish(st, '30-sidebar-tour');
};

/* ------------------------------------------------------- extra coverage */

S['31-course-modal'] = async (outDir) => {
  const st = await openStage({ tab: 'courses', outDir, settle: 4200 });
  const { page, rec } = st;
  await rec.wait(1400);
  await rec.click('text=BENG 3500 >> nth=0');
  await rec.wait(3200);
  await scrollPane(page, 200);
  await rec.wait(2000);
  return finish(st, '31-course-modal');
};

S['32-course-filters'] = async (outDir) => {
  const st = await openStage({ tab: 'courses', outDir, settle: 4200 });
  const { page, rec } = st;
  await rec.wait(1200);
  await rec.type('input[placeholder*="Search by code" i]', 'MENG', { delay: 120 });
  await rec.wait(2200);
  await page.locator('select').first().selectOption({ label: 'In progress' }).catch(() => {});
  await rec.wait(2400);
  return finish(st, '32-course-filters');
};

// Settings is where majors and all 42 certificates are picked. Opened and
// scrolled only: nothing here is saved.
S['33-settings-certificates'] = async (outDir) => {
  const st = await openStage({ tab: 'certificate', outDir, settle: 4200 });
  const { page, rec } = st;
  await rec.wait(1200);
  await rec.click('button[title="Settings"]');
  await rec.wait(2800);
  await scrollPane(page, 420, 900);
  await rec.wait(2200);
  await scrollPane(page, 520, 900);
  await rec.wait(2400);
  return finish(st, '33-settings-certificates');
};

S['34-major-requirement-modal'] = async (outDir) => {
  const st = await openStage({ tab: 'major', outDir, settle: 4500 });
  const { page, rec } = st;
  await rec.wait(1400);
  await scrollPane(page, 520);
  await rec.wait(1400);
  await rec.click('[data-tour="major-requirement-card"] >> nth=1');
  await rec.wait(3000);
  await scrollPane(page, 220);
  await rec.wait(2000);
  return finish(st, '34-major-requirement-modal');
};

export default S;
