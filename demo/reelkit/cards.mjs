// Renders every kinetic-type card in the storyboard to 1920x1080 PNGs.
// Two variants per card: on black (drop straight on a timeline) and on
// transparent (composite over footage).
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const OUT =
  process.env.CARDS_OUT ||
  path.join(os.homedir(), 'Desktop', 'di-v3-demo-reel', 'type-cards');
fs.mkdirSync(OUT, { recursive: true });

const PINK = '#ec4899';
const VIOLET = '#a78bfa';

// kind: 'statement' (black ground) | 'bleed' (accent fills the frame) | 'end'
const CARDS = [
  // Act 0 — cold open
  { id: '00-a-142-majors', kind: 'statement', html: '142 majors.' },
  { id: '00-b-42-certificates', kind: 'statement', html: '42 certificates.' },
  { id: '00-c-6616-courses', kind: 'statement', html: '6,616 courses.' },
  { id: '00-d-four-years', kind: 'statement', html: 'Four years.' },
  { id: '00-e-one-transcript', kind: 'statement', html: `<em>One transcript.</em>` },

  // Act 1 — one upload
  { id: '01-a-upload-once', kind: 'statement', html: 'Upload once.' },
  { id: '01-b-know-everything', kind: 'statement', html: `<em>Know everything.</em>` },

  // Act 2 — feature words
  { id: '02-a-majors', kind: 'bleed', html: 'MAJORS', bg: PINK },
  { id: '02-b-certificates', kind: 'bleed', html: 'CERTIFICATES', bg: VIOLET },
  { id: '02-c-distributionals', kind: 'bleed', html: 'DISTRIBUTIONALS', bg: PINK },
  { id: '02-d-stats', kind: 'bleed', html: 'STATS', bg: VIOLET },

  // Act 3 — the what-if
  { id: '03-a-change-your-mind', kind: 'statement', html: 'Now change<br/>your mind.' },
  { id: '03-b-every-number-moves', kind: 'statement', html: `Watch <em>every number</em> move.`, size: 118 },

  // Act 4 — privacy
  { id: '04-a-never-shared', kind: 'statement', html: `Grades and GPA are <em>never shared.</em>`, size: 104 },

  // Act 5 — the close
  { id: '05-a-no-ai', kind: 'statement', html: 'No AI.' },
  { id: '05-b-no-guessing', kind: 'statement', html: 'No guessing.' },
  { id: '05-c-yales-rules', kind: 'statement', html: `Just <em>Yale's rules.</em>` },

  { id: '06-end-card', kind: 'end' },
];

const LOGO =
  'data:image/png;base64,' +
  fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'logo.png')).toString('base64');

const FONT =
  `"SF Pro Display","Inter Tight",Inter,-apple-system,"Helvetica Neue",Arial,sans-serif`;

function page(card, transparent) {
  const ground = transparent ? 'transparent' : '#000';
  if (card.kind === 'end') {
    return `<style>
      html,body{margin:0;height:100%;background:${ground};}
      .w{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
         font-family:${FONT};color:#fff;text-align:center;}
      .logo{width:132px;height:132px;margin-bottom:34px;display:block;}
      .mark{font-size:80px;font-weight:800;letter-spacing:-.035em;}
      .mark b{color:${PINK};}
      .url{margin-top:26px;font-size:44px;font-weight:600;letter-spacing:-.02em;color:#fff;}
      .sub{margin-top:34px;font-size:27px;font-weight:500;color:rgba(255,255,255,.62);letter-spacing:.01em;}
      .fine{position:absolute;bottom:64px;font-size:19px;font-weight:400;color:rgba(255,255,255,.34);}
    </style><div class="w">
      <img class="logo" src="${LOGO}" alt="" />
      <div class="mark">Degree<b>Intelligence</b></div>
      <div class="url">degreeint.com</div>
      <div class="sub">Free forever &nbsp;·&nbsp; Open source</div>
      <div class="fine">Used by roughly 1 in 6 Yale undergraduates.</div>
    </div>`;
  }
  if (card.kind === 'bleed') {
    return `<style>
      html,body{margin:0;height:100%;background:${transparent ? 'transparent' : card.bg};}
      .w{height:100vh;display:flex;align-items:center;justify-content:center;
         font-family:${FONT};}
      .t{color:#fff;font-weight:800;letter-spacing:-.02em;
         font-size:${card.html.length > 12 ? 150 : 210}px;line-height:1;}
    </style><div class="w"><div class="t">${card.html}</div></div>`;
  }
  return `<style>
    html,body{margin:0;height:100%;background:${ground};}
    .w{height:100vh;display:flex;align-items:center;justify-content:center;padding:0 140px;
       font-family:${FONT};}
    .t{color:#fff;font-weight:800;letter-spacing:-.032em;text-align:center;
       font-size:${card.size ?? 132}px;line-height:1.04;}
    .t em{font-style:normal;color:${PINK};}
  </style><div class="w"><div class="t">${card.html}</div></div>`;
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
});
const p = await ctx.newPage();

for (const card of CARDS) {
  for (const [suffix, transparent] of [['', false], ['-alpha', true]]) {
    await p.setContent(page(card, transparent));
    await p.waitForTimeout(120);
    await p.screenshot({
      path: path.join(OUT, `${card.id}${suffix}.png`),
      omitBackground: transparent,
    });
  }
  console.log('[card]', card.id);
}

await browser.close();
console.log(`\n${CARDS.length} cards (x2 variants) -> ${OUT}`);
