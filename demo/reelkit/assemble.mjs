// Builds the ~48-second assembly from the rendered clips and type cards.
//
// This is an animatic, not the film: the tilt and the depth of field are still
// the edit's job. What it does carry is the cut, the pacing, and a slow push on
// every product shot, so the shape can be judged before anyone opens an editor.
//
// `in` is chosen per clip to land on the moment that shot exists for, not its
// first frame. Those offsets track the waits in shots.mjs; if you retime a shot
// there, retime its `in` here.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT =
  process.env.REEL_OUT || path.join(os.homedir(), 'Desktop', 'di-v3-demo-reel-v2');
const CARDS = path.join(ROOT, 'type-cards');
const WORK = path.join(ROOT, '_assembly');
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });

// kind: clip (id, in, dur, push) | card (id, dur, push) | black (dur)
// push: [fromZoom, toZoom] — a slow move, never a zoom that reads as motion
const EDL = [
  /* Act 0 — cold open: real counts escalating, then the product resolves */
  { kind: 'clip', id: '01-landing-hero', in: 0.6, dur: 1.3, push: [1.0, 1.05] },
  { kind: 'card', id: '00-a-142-majors', dur: 0.45 },
  { kind: 'card', id: '00-b-42-certificates', dur: 0.45 },
  { kind: 'card', id: '00-c-6616-courses', dur: 0.45 },
  { kind: 'card', id: '00-d-four-years', dur: 0.8 },
  { kind: 'card', id: '00-e-one-transcript', dur: 0.9 },
  { kind: 'black', dur: 0.3 },
  { kind: 'clip', id: '04-dashboard-reveal', in: 0.8, dur: 1.3, push: [1.06, 1.0] },

  /* Act 1 — one upload */
  { kind: 'card', id: '01-a-upload-once', dur: 0.8 },
  { kind: 'clip', id: '27-transcript-upload-ui', in: 1.6, dur: 1.8, push: [1.0, 1.06] },
  { kind: 'card', id: '01-b-know-everything', dur: 0.9 },
  { kind: 'clip', id: '05-my-courses', in: 1.2, dur: 1.5, push: [1.0, 1.05] },
  { kind: 'clip', id: '06-command-palette', in: 1.4, dur: 2.1, push: [1.0, 1.07] },

  /* Act 2 — the truth */
  { kind: 'card', id: '02-a-majors', dur: 0.4 },
  { kind: 'clip', id: '07-major-board', in: 0.8, dur: 1.3, push: [1.0, 1.06] },
  { kind: 'clip', id: '08-major-heatmap', in: 1.5, dur: 1.2, push: [1.0, 1.05] },
  { kind: 'clip', id: '09-major-shared-courses', in: 1.5, dur: 1.2, push: [1.0, 1.06] },
  { kind: 'card', id: '02-b-certificates', dur: 0.4 },
  { kind: 'clip', id: '11-certificates', in: 1.4, dur: 1.3, push: [1.0, 1.06] },
  { kind: 'clip', id: '12-certificate-heatmap', in: 1.5, dur: 1.1, push: [1.0, 1.05] },
  { kind: 'card', id: '02-c-distributionals', dur: 0.4 },
  { kind: 'clip', id: '13-distributionals', in: 0.8, dur: 1.2, push: [1.0, 1.05] },
  { kind: 'clip', id: '14-distributionals-language', in: 3.4, dur: 1.2, push: [1.0, 1.06] },
  { kind: 'card', id: '02-d-stats', dur: 0.4 },
  { kind: 'clip', id: '16-stats', in: 0.6, dur: 1.5, push: [1.0, 1.06] },
  { kind: 'black', dur: 0.3 },

  /* Act 3 — the what-if. The drag lands immediately on the statement. */
  { kind: 'card', id: '03-a-change-your-mind', dur: 1.2 },
  { kind: 'clip', id: '17-simulator-canvas', in: 4.0, dur: 2.6, push: [1.0, 1.08] },
  { kind: 'clip', id: '18-simulator-drag-back', in: 3.0, dur: 2.0, push: [1.0, 1.06] },
  { kind: 'clip', id: '19-simulator-grades', in: 4.0, dur: 1.4, push: [1.0, 1.06] },
  { kind: 'clip', id: '20-simulator-distributionals', in: 1.4, dur: 1.4, push: [1.0, 1.06] },
  { kind: 'card', id: '03-b-every-number-moves', dur: 0.9 },
  { kind: 'clip', id: '21-simulator-progress', in: 1.6, dur: 1.8, push: [1.0, 1.06] },
  { kind: 'clip', id: '23-simulator-save-affordance', in: 6.0, dur: 1.2, push: [1.0, 1.07] },
  { kind: 'black', dur: 0.3 },

  /* Act 4 — craft and social */
  { kind: 'clip', id: '26-theme-toggle', in: 1.9, dur: 1.4, push: [1.0, 1.05] },
  { kind: 'clip', id: '25-public-page', in: 1.0, dur: 1.3, push: [1.0, 1.05] },
  { kind: 'clip', id: '24-friends', in: 2.0, dur: 1.1, push: [1.0, 1.06] },
  { kind: 'card', id: '04-a-never-shared', dur: 1.1 },
  { kind: 'black', dur: 0.25 },

  /* Act 5 — close */
  { kind: 'card', id: '05-a-no-ai', dur: 0.7 },
  { kind: 'card', id: '05-b-no-guessing', dur: 0.7 },
  { kind: 'card', id: '05-c-yales-rules', dur: 1.2 },
  { kind: 'black', dur: 0.3 },
  { kind: 'card', id: '06-end-card', dur: 2.8, push: [1.0, 1.03] },
];

const FPS = 30;
const V = `-c:v libx264 -crf 19 -preset veryfast -pix_fmt yuv420p -an -r ${FPS}`.split(' ');
const FIT =
  'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,setsar=1';

/**
 * A slow push, rendered from an upscaled source.
 *
 * zoompan steps in whole source pixels, so pushing a 1920-wide frame directly
 * judders. Feeding it a 2x frame makes each step a half pixel and the move
 * reads as smooth.
 */
function pushFilter(push, dur) {
  if (!push) return `${FIT},format=yuv420p`;
  const n = Math.max(2, Math.round(dur * FPS));
  const [a, b] = push;
  const expr = `${a}+(${(b - a).toFixed(4)}*on/${n})`;
  return [
    FIT,
    'scale=3840:2160:flags=lanczos',
    `zoompan=z='${expr}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=${FPS}`,
    'setsar=1',
    'format=yuv420p',
  ].join(',');
}

const parts = [];
const missing = [];
let planned = 0;

EDL.forEach((s, i) => {
  const out = path.join(WORK, `${String(i).padStart(3, '0')}.mp4`);
  planned += s.dur;
  let args;

  if (s.kind === 'black') {
    args = ['-f', 'lavfi', '-i', `color=c=black:s=1920x1080:d=${s.dur}:r=${FPS}`, ...V, out];
  } else if (s.kind === 'card') {
    const src = path.join(CARDS, `${s.id}.png`);
    if (!fs.existsSync(src)) return missing.push(`card ${s.id}`);
    args = ['-loop', '1', '-t', String(s.dur), '-i', src,
            '-vf', pushFilter(s.push, s.dur), ...V, out];
  } else {
    const src = path.join(ROOT, `${s.id}.mp4`);
    if (!fs.existsSync(src)) return missing.push(`clip ${s.id}`);
    args = ['-ss', String(s.in), '-t', String(s.dur), '-i', src,
            '-vf', pushFilter(s.push, s.dur), ...V, out];
  }

  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
  if (r.status === 0 && fs.existsSync(out)) parts.push(out);
  else missing.push(`${s.kind} ${s.id ?? 'black'} (encode failed)`);
});

const list = path.join(WORK, 'list.txt');
fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));

const final = path.join(ROOT, 'ROUGH-CUT.mp4');
spawnSync('ffmpeg',
  ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0',
   '-i', list, '-c', 'copy', final], { stdio: 'inherit' });

console.log(`\nassembled ${parts.length}/${EDL.length} segments -> ${final}`);
console.log(`storyboard target ${planned.toFixed(1)}s`);
if (missing.length) {
  console.log('\nmissing (the cut skips these):');
  for (const m of missing) console.log('  ' + m);
}
