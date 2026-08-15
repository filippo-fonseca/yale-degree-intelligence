// Every shot in the DegreeIntelligence v3 launch film.
//
// One export per clip, keyed by the ids used in demo/STORYBOARD.md. Each shot
// opens on the surface it needs (theme + tab pre-seeded) so no footage is spent
// navigating, performs one legible idea, and stops.
//
// Nothing here writes to the account. Plans are never saved, certificates are
// never added, and the tip-modal flags seeded by the stage are localStorage-only.
import { openStage, finish, drag, gotoTab, scrollPane, HOME } from './stage.mjs';

const S = {};

/* ---------------------------------------------------------------- landing */

S['01-landing-hero'] = async (outDir) => {
  const st = await openStage({ anon: true, outDir, theme: 'dark', settle: 5000 });
  const { page, rec } = st;
  await rec.wait(2200);
  // the constellation leans toward the cursor, so trace across the hero
  await rec.hover('h1');
  await rec.wait(1200);
  await scrollPane(page, 420);
  await rec.wait(1500);
  await scrollPane(page, 520);
  await rec.wait(1600);
  await scrollPane(page, 600);
  await rec.wait(1800);
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
  // semester rail: jump between terms
  await rec.click('text=Spring 2026 >> nth=0');
  await rec.wait(1500);
  await rec.click('text=Fall 2025 >> nth=0');
  await rec.wait(1500);
  await scrollPane(page, 380);
  await rec.wait(1600);
  return finish(st, '05-my-courses');
};

S['06-command-palette'] = async (outDir) => {
  const st = await openStage({ tab: 'courses', outDir });
  const { page, rec } = st;
  await rec.wait(1000);
  await rec.click('[data-tour="search"]');
  await rec.wait(900);
  await rec.type('input[placeholder*="Search" i] >> nth=-1', 'thermo', { delay: 110 });
  await rec.wait(1900);
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await rec.wait(500);
  await rec.type('input[placeholder*="Search" i] >> nth=-1', 'MENG 34', { delay: 110 });
  await rec.wait(2100);
  return finish(st, '06-command-palette');
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
  await rec.hover('text=no overlap');
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
  await page.getByText('LANGUAGE', { exact: true }).first().scrollIntoViewIfNeeded();
  await rec.wait(1400);
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
  await drag(
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
  await drag(page, 'text=ECE 2031 >> nth=0', 'text=Fall 2026 >> nth=0', {
    toOffsetY: 200,
    stepMs: 22,
  });
  await rec.wait(1200);
  await drag(page, 'text=MENG 3422 >> nth=0', 'text=Spring 2027 >> nth=0', {
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
  const sel = page.locator('select').first();
  await sel.scrollIntoViewIfNeeded();
  await sel.selectOption('A');
  await rec.wait(2200);
  return finish(st, '19-simulator-grades');
};

S['20-simulator-distributionals'] = async (outDir) => {
  const st = await openStage({ tab: 'simulator', outDir, settle: 5200 });
  const { page, rec } = st;
  await rec.wait(1200);
  await rec.click('button:has-text("Distributionals")');
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
  await drag(page, 'text=MENG 3125 >> nth=0', 'text=Spring 2027 >> nth=0', {
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

export default S;
