// Runner: node record.mjs <shot-id|all> [...more ids]
// Renders each clip to <REEL_OUT>/<shot-id>.mp4 and keeps going if one fails,
// so a single bad selector never costs the whole batch.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import SHOTS from './shots.mjs';
import { closeAllBrowsers } from './stage.mjs';

const OUT_ROOT =
  process.env.REEL_OUT || path.join(os.homedir(), 'Desktop', 'di-v3-demo-reel');
fs.mkdirSync(OUT_ROOT, { recursive: true });

const args = process.argv.slice(2);
const ids =
  args.length === 0 || args[0] === 'all' ? Object.keys(SHOTS) : args;

const results = [];
for (const id of ids) {
  const fn = SHOTS[id];
  if (!fn) {
    console.log(`[skip] unknown shot: ${id}`);
    results.push({ id, ok: false, err: 'unknown shot' });
    continue;
  }
  const work = path.join(OUT_ROOT, '_work', id);
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });

  const t0 = Date.now();
  try {
    const r = await fn(work);
    const dest = path.join(OUT_ROOT, `${id}.mp4`);
    if (r?.video && fs.existsSync(r.video)) {
      fs.copyFileSync(r.video, dest);
      const mb = (fs.statSync(dest).size / 1e6).toFixed(1);
      console.log(`[ok]   ${id}  ${mb}MB  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      results.push({ id, ok: true, file: dest });
    } else {
      console.log(`[warn] ${id}: no video produced`);
      results.push({ id, ok: false, err: 'no video' });
    }
  } catch (e) {
    console.log(`[fail] ${id}: ${String(e.message).split('\n')[0].slice(0, 160)}`);
    results.push({ id, ok: false, err: String(e.message).slice(0, 300) });
  } finally {
    // A failed shot must not leave its browser running: leaked instances pin a
    // core each and slow every subsequent shot into its own timeout.
    await closeAllBrowsers();
  }
}

fs.writeFileSync(
  path.join(OUT_ROOT, 'manifest.json'),
  JSON.stringify(results, null, 2),
);
const ok = results.filter((r) => r.ok).length;
console.log(`\n=== ${ok}/${results.length} clips rendered -> ${OUT_ROOT}`);
for (const r of results.filter((x) => !x.ok)) console.log(`  MISSING ${r.id}: ${r.err}`);
