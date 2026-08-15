// Opens a real Google Chrome with a durable profile so Filippo can log into
// DegreeIntelligence once. Everything after this (every recording take) reuses
// the profile, so the login never has to happen again.
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROFILE = path.join(os.homedir(), '.di-demo', 'profile');
const OUT = path.join(os.homedir(), '.di-demo');
const STATE = path.join(OUT, 'state.json');
const MARKER = path.join(OUT, 'LOGGED_IN');

fs.mkdirSync(PROFILE, { recursive: true });
if (fs.existsSync(MARKER)) fs.rmSync(MARKER);

const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: 'chrome',
  headless: false,
  viewport: null,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--window-size=1440,900',
  ],
});

const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto('https://degreeint.com', { waitUntil: 'domcontentloaded' });

console.log('[login] Chrome is open. Sign in with your @yale.edu Google account.');
console.log('[login] Waiting for Firebase auth to land...');

// Firebase Web SDK v11 persists the signed-in user in IndexedDB
// (firebaseLocalStorageDb), not localStorage, so poll that directly.
async function isAuthed(p) {
  try {
    return await p.evaluate(async () => {
      const names = await indexedDB.databases();
      if (!names.some((d) => d.name === 'firebaseLocalStorageDb')) return false;
      return await new Promise((resolve) => {
        const req = indexedDB.open('firebaseLocalStorageDb');
        req.onerror = () => resolve(false);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('firebaseLocalStorage'))
            return resolve(false);
          const all = db
            .transaction('firebaseLocalStorage', 'readonly')
            .objectStore('firebaseLocalStorage')
            .getAll();
          all.onsuccess = () =>
            resolve(
              (all.result || []).some((r) =>
                String(r?.fbase_key || '').startsWith('firebase:authUser:'),
              ),
            );
          all.onerror = () => resolve(false);
        };
      });
    });
  } catch {
    return false;
  }
}

const deadline = Date.now() + 20 * 60 * 1000; // 20 minutes to log in
let authed = false;
while (Date.now() < deadline) {
  const pages = ctx.pages();
  if (pages.length === 0) break;
  for (const p of pages) {
    if (p.isClosed()) continue;
    if (await isAuthed(p)) {
      authed = true;
      break;
    }
  }
  if (authed) break;
  await new Promise((r) => setTimeout(r, 2000));
}

if (!authed) {
  console.log('[login] FAILED: no Firebase auth found before timeout.');
  await ctx.close();
  process.exit(1);
}

console.log('[login] Auth detected. Saving session state...');
// Let the app settle so Firestore has hydrated the profile too.
await new Promise((r) => setTimeout(r, 4000));

try {
  await ctx.storageState({ path: STATE, indexedDB: true });
  console.log('[login] wrote', STATE, '(with IndexedDB)');
} catch (e) {
  console.log('[login] indexedDB storageState unsupported, falling back:', e.message);
  await ctx.storageState({ path: STATE });
}

fs.writeFileSync(MARKER, new Date().toISOString());
console.log('[login] DONE. You can close the browser. Profile kept at:', PROFILE);
await ctx.close();
