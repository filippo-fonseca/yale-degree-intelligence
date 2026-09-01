#!/usr/bin/env node
/**
 * Render the email logo assets into public/email/.
 *
 * Email needs raster: Gmail strips SVG and blocks data: URIs in img tags, so
 * the LogoIcon component and the SF wordmark both have to be baked to PNG.
 * Two variants of each, because the disc that masks the gear behind the badge
 * has to match the page colour and the wordmark has to inverate with the theme.
 *
 * Regenerate after any brand change:
 *   node scripts/email/build-logo.mjs
 *
 * Requires Playwright's Chromium. Set PLAYWRIGHT_CHROMIUM to override the path.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT_DIR = path.join(REPO_ROOT, "public", "email");
const FONT = path.join(REPO_ROOT, "public", "fonts", "louize-medium.otf");

/**
 * Playwright is not a dependency of this project, so it gets resolved from
 * wherever it happens to be installed. The Homebrew global path was hard-coded
 * here and stopped existing; PLAYWRIGHT_PACKAGE overrides it now, and the local
 * node_modules copy is tried first so a plain `npm i -D playwright` is enough.
 */
const PLAYWRIGHT_CANDIDATES = [
  process.env.PLAYWRIGHT_PACKAGE,
  path.join(REPO_ROOT, "node_modules", "playwright"),
  "/opt/homebrew/lib/node_modules/playwright",
  "/usr/local/lib/node_modules/playwright",
].filter(Boolean);

const playwrightDir = PLAYWRIGHT_CANDIDATES.find((dir) =>
  fs.existsSync(path.join(dir, "index.js")),
);
if (!playwrightDir) {
  console.error(
    `build-logo: no playwright install found. Tried:\n  ${PLAYWRIGHT_CANDIDATES.join("\n  ")}\n` +
      "Install it (npm i -D playwright) or set PLAYWRIGHT_PACKAGE to its directory.",
  );
  process.exit(1);
}

const require = createRequire(`${playwrightDir}/`);
const { chromium } = require(path.join(playwrightDir, "index.js"));

const CHROMIUM =
  process.env.PLAYWRIGHT_CHROMIUM ??
  path.join(
    os.homedir(),
    "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64",
    "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  );

/** Paths lifted verbatim from icons/LogoIcon.tsx. */
const GEAR_PATH =
  "M477.333 429C477.333 441.172 472.411 453.762 464.475 461.906L455.973 470.618C450.543 476.196 447.5 483.685 447.5 491.441V503.583C447.5 528.256 427.422 548.333 402.75 548.333C397.559 548.333 392.637 547.17 387.833 545.38V313.843L388.072 313.694C392.577 311.069 397.648 309.667 402.72 309.667C419.158 309.667 432.553 323.032 432.553 339.5V359.1C432.553 368.856 437.357 378.045 445.352 383.594L458.121 392.454C470.144 400.837 477.303 414.471 477.303 429H477.333ZM328.167 313.843L327.898 313.694C308.805 302.417 283.417 317.96 283.447 339.5V359.13C283.447 368.886 278.643 378.075 270.648 383.624L257.849 392.514C245.856 400.867 238.697 414.501 238.697 429C238.697 441.172 243.619 453.762 251.525 461.876L260.057 470.618C265.487 476.196 268.53 483.685 268.53 491.441V503.583C268.53 528.256 288.608 548.333 313.28 548.333C318.441 548.333 323.423 547.17 328.197 545.38V313.843H328.167ZM656.333 399.167V458.833H686.167C702.635 458.833 716 472.169 716 488.667C716 505.165 702.635 518.5 686.167 518.5H656.333V578.167H686.167C702.635 578.167 716 591.502 716 608C716 624.498 702.635 637.833 686.167 637.833H643.684C628.648 672.112 601.112 699.648 566.833 714.684V757.167C566.833 773.665 553.468 787 537 787C520.532 787 507.167 773.665 507.167 757.167V727.333H447.5V757.167C447.5 773.665 434.135 787 417.667 787C401.199 787 387.833 773.665 387.833 757.167V727.333H328.167V757.167C328.167 773.665 314.801 787 298.333 787C281.865 787 268.5 773.665 268.5 757.167V727.333H208.833V757.167C208.833 773.665 195.468 787 179 787C162.532 787 149.167 773.665 149.167 757.167V714.684C114.888 699.648 87.352 672.112 72.316 637.833H29.8333C13.3653 637.833 0 624.498 0 608C0 591.502 13.3653 578.167 29.8333 578.167H59.6667V518.5H29.8333C13.3653 518.5 0 505.165 0 488.667C0 472.169 13.3653 458.833 29.8333 458.833H59.6667V399.167H29.8333C13.3653 399.167 0 385.831 0 369.333C0 352.836 13.3653 339.5 29.8333 339.5H59.6667V279.833H29.8333C13.3653 279.833 0 266.498 0 250C0 233.502 13.3653 220.167 29.8333 220.167H72.316C87.352 185.888 114.888 158.352 149.167 143.316V100.833C149.167 84.3355 162.532 71 179 71C195.468 71 208.833 84.3355 208.833 100.833V130.667H268.5V100.833C268.5 84.3355 281.865 71 298.333 71C314.801 71 328.167 84.3355 328.167 100.833V130.667H387.833V100.833C387.833 84.3355 401.199 71 417.667 71C434.135 71 447.5 84.3355 447.5 100.833V130.667H507.167V100.833C507.167 84.3355 520.532 71 537 71C553.468 71 566.833 84.3355 566.833 100.833V143.316C601.112 158.352 628.648 185.888 643.684 220.167H686.167C702.635 220.167 716 233.502 716 250C716 266.498 702.635 279.833 686.167 279.833H656.333V339.5H686.167C702.635 339.5 716 352.836 716 369.333C716 385.831 702.635 399.167 686.167 399.167H656.333ZM537 429C537 394.99 520.293 363.068 492.25 343.528C494.368 292.811 453.616 249.881 402.75 250C387.117 250 371.634 254.206 358 262.172C344.396 254.206 328.942 250 313.25 250C262.354 249.881 221.632 292.841 223.75 343.557C195.736 363.068 179 395.05 179 429C179 456.596 190.158 484.46 208.833 503.553C208.833 561.162 255.672 608 313.25 608C328.853 608 343.919 604.569 358 597.737C372.052 604.539 387.088 608 402.75 608C460.328 608 507.167 561.162 507.167 503.583C525.842 484.46 537 456.596 537 429Z";
const BADGE_PATH =
  "M641.5 0C562.923 0 499 63.9231 499 142.5C499 221.077 562.923 285 641.5 285C720.077 285 784 221.077 784 142.5C784 63.9231 720.077 0 641.5 0ZM698.274 93.5156L653.375 149.649V201.875C653.375 208.442 648.067 213.75 641.5 213.75C634.933 213.75 629.625 208.442 629.625 201.875V149.649L584.726 93.5156C580.629 88.3856 581.472 80.9162 586.578 76.8194C591.72 72.7106 599.178 73.5656 603.274 78.6719L641.5 126.457L679.726 78.6719C683.846 73.5775 691.304 72.7106 696.422 76.8194C701.54 80.9281 702.371 88.3975 698.274 93.5156Z";

/** GitHub's own mark, from their published 16px logo. */
const GITHUB_PATH =
  "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8Z";

/**
 * Feather's refresh-cw, the same icon react-icons draws for FiRefreshCw in the
 * Re-upload transcript button. Stroked rather than filled, so it carries its
 * colour on the stroke attribute and not on fill like the marks above.
 */
const REFRESH_BODY = `  <polyline points="23 4 23 10 17 10"/>
  <polyline points="1 20 1 14 7 14"/>
  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>`;

const THEMES = {
  light: {
    gearFrom: "#2563eb",
    gearTo: "#3b82f6",
    disc: "#fafaf9",
    pinFrom: "#db2777",
    pinTo: "#ec4899",
    wordmark: "#09090b",
    // Muted on purpose. The repo link is a footnote for the handful of people
    // who care, not a second call to action.
    github: "#a1a1aa",
    // Sits inside a pill next to bold near-black text, so it wants to read as
    // part of that label rather than as a second, lighter element.
    refresh: "#3f3f46",
  },
  dark: {
    gearFrom: "#60a5fa",
    gearTo: "#93c5fd",
    disc: "#09090b",
    pinFrom: "#f472b6",
    pinTo: "#f9a8d4",
    wordmark: "#fafafa",
    github: "#71717a",
    refresh: "#d4d4d8",
  },
};

/**
 * viewBox is inset by a stroke width rather than the icon's natural 0 0 24 24.
 * The artwork touches x=23 and x=1 with a 2px stroke, so half of it falls
 * outside the box on both sides and the screenshot, which crops to the svg's
 * own bounds, would shave those pixels off.
 */
function refreshSvg(theme, pixels) {
  return `<svg width="${pixels}" height="${pixels}" viewBox="-2 -2 28 28" fill="none" stroke="${theme.refresh}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
${REFRESH_BODY}
</svg>`;
}

function githubSvg(theme, pixels) {
  return `<svg width="${pixels}" height="${pixels}" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path d="${GITHUB_PATH}" fill="${theme.github}"/>
</svg>`;
}

function markSvg(theme, pixels) {
  return `<svg width="${pixels}" height="${pixels}" viewBox="0 0 784 787" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g0" x1="358" y1="71" x2="358" y2="787" gradientUnits="userSpaceOnUse">
      <stop stop-color="${theme.gearFrom}"/><stop offset="1" stop-color="${theme.gearTo}"/>
    </linearGradient>
    <linearGradient id="g1" x1="641.5" y1="0" x2="641.5" y2="285" gradientUnits="userSpaceOnUse">
      <stop stop-color="${theme.pinFrom}"/><stop offset="1" stop-color="${theme.pinTo}"/>
    </linearGradient>
    <clipPath id="c0"><rect width="716" height="716" fill="white" transform="translate(0 71)"/></clipPath>
    <clipPath id="c1"><rect width="285" height="285" fill="white" transform="translate(499)"/></clipPath>
  </defs>
  <g clip-path="url(#c0)"><path d="${GEAR_PATH}" fill="url(#g0)"/></g>
  <circle cx="641.5" cy="142.5" r="142.5" fill="${theme.disc}"/>
  <g clip-path="url(#c1)"><path d="${BADGE_PATH}" fill="url(#g1)"/></g>
</svg>`;
}

/** Mark and wordmark side by side, matching the site header lockup. */
function lockupHtml(theme, fontDataUri) {
  return `<!doctype html>
<html><head><meta charset="utf-8" /><style>
  @font-face { font-family: "BrandLocal"; src: url("${fontDataUri}") format("opentype"); font-weight: 500; }
  html, body { margin: 0; padding: 0; background: transparent; }
  .lockup { display: inline-flex; align-items: center; gap: 26px; padding: 12px 16px; }
  .mark { display: block; }
  .word {
    /* Louize is the brand serif. It sits optically smaller than the sans at the
       same size and needs no negative tracking, so both are retuned here. */
    font-family: "BrandLocal", Georgia, serif;
    font-size: 104px;
    font-weight: 500;
    letter-spacing: -0.5px;
    color: ${theme.wordmark};
    line-height: 1;
    white-space: nowrap;
  }
</style></head>
<body><div class="lockup">
  <span class="mark">${markSvg(theme, 104)}</span>
  <span class="word">DegreeIntelligence</span>
</div></body></html>`;
}

async function main() {
  if (!fs.existsSync(FONT)) throw new Error(`missing brand font: ${FONT}`);
  const fontDataUri = `data:font/otf;base64,${fs.readFileSync(FONT).toString("base64")}`;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROMIUM });

  for (const [name, theme] of Object.entries(THEMES)) {
    const context = await browser.newContext({
      viewport: { width: 1600, height: 400 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // Standalone mark, for anywhere the wordmark would be too wide.
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${markSvg(theme, 400)}</body></html>`,
    );
    await page.locator("svg").screenshot({
      path: path.join(OUT_DIR, `logo-${name}.png`),
      omitBackground: true,
    });

    // Full lockup: this is what the emails show.
    await page.setContent(lockupHtml(theme, fontDataUri));
    await page.waitForTimeout(150); // let the embedded font finish loading
    await page.locator(".lockup").screenshot({
      path: path.join(OUT_DIR, `lockup-${name}.png`),
      omitBackground: true,
    });

    // GitHub mark for the footer's open-source line. Rendered at 3x its
    // display size so it stays sharp on retina mail clients.
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${githubSvg(theme, 42)}</body></html>`,
    );
    await page.locator("svg").screenshot({
      path: path.join(OUT_DIR, `github-${name}.png`),
      omitBackground: true,
    });

    // Refresh mark for the Re-upload transcript pill, same 3x treatment.
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${refreshSvg(theme, 42)}</body></html>`,
    );
    await page.locator("svg").screenshot({
      path: path.join(OUT_DIR, `refresh-${name}.png`),
      omitBackground: true,
    });

    await context.close();
    console.log(
      `wrote public/email/logo-${name}.png, lockup-${name}.png, github-${name}.png and refresh-${name}.png`,
    );
  }

  await browser.close();
}

main().catch((error) => {
  console.error(`build-logo: ${error.message}`);
  process.exit(1);
});
