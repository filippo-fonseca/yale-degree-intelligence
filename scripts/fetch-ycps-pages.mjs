#!/usr/bin/env node
/**
 * Fetch the YCPS bulletin course pages that scripts/parse-ycps-designations.mjs
 * reads. One directory per catalog edition under ycps-cache/ (gitignored):
 *
 *   ycps-cache/2026-2027/index.html   the courses index for that edition
 *   ycps-cache/2026-2027/<slug>.html  one page per department
 *
 * The current edition lives at /ycps/courses/, older ones at
 * /archive/<edition>/ycps/courses/. Editions older than 2023-2024 are outside
 * the catalog's own term floor and are never fetched.
 *
 * Usage:
 *   node scripts/fetch-ycps-pages.mjs [--force]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_ROOT = path.join(REPO_ROOT, "ycps-cache");
const ORIGIN = "https://catalog.yale.edu";

/** Newest first; the parser walks them in this order. */
export const EDITIONS = ["2026-2027", "2025-2026", "2024-2025", "2023-2024"];

/** The edition served at /ycps/ rather than /archive/<edition>/ycps/. */
export const CURRENT_EDITION = "2026-2027";

export const editionBase = (edition) =>
  edition === CURRENT_EDITION ? "/ycps/courses/" : `/archive/${edition}/ycps/courses/`;

const force = process.argv.includes("--force");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchText = async (url, attempt = 1) => {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "yale-degree-intelligence catalog sync" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    if (attempt >= 3) throw error;
    await sleep(1000 * attempt);
    return fetchText(url, attempt + 1);
  }
};

const cachedFetch = async (url, file) => {
  if (!force && fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  const text = await fetchText(url);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  await sleep(150);
  return text;
};

/**
 * Department links out of a courses index: "Astronomy &amp; Astrophysics (ASTR)"
 * under /ycps/courses/astr/. The slug is frequently the department's OLD code
 * (BLST sits under afam/, ECE under eeng/), so the index is the only safe way
 * to resolve one.
 */
export const parseIndex = (html, base) => {
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<a href="(${escaped}([^"/]+)/)">([^<]*)</a>`, "g");
  const map = new Map();
  const slugs = new Set();
  for (const match of html.matchAll(pattern)) {
    const [, href, slug, rawLabel] = match;
    slugs.add(slug);
    // The label carries the department code in parentheses, HTML-escaped:
    // "Statistics and Data Science (S&amp;DS)". Decoding first is what keeps the
    // ampersand departments from dropping out of the map entirely.
    const label = rawLabel.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
    for (const code of label.matchAll(/\(([A-Z][A-Z&_ ]*[A-Z0-9])\)/g)) {
      if (!map.has(code[1])) map.set(code[1], { slug, href });
    }
  }
  // Pages are fetched by slug, so a department whose label omits a code still
  // gets its page; only the code -> slug map loses it.
  return { map, slugs: [...slugs] };
};

const main = async () => {
  const summary = [];
  for (const edition of EDITIONS) {
    const base = editionBase(edition);
    const dir = path.join(CACHE_ROOT, edition);
    const index = await cachedFetch(`${ORIGIN}${base}`, path.join(dir, "index.html"));
    const { map, slugs } = parseIndex(index, base);
    let fetched = 0;
    for (const slug of slugs) {
      const file = path.join(dir, `${slug}.html`);
      const existed = fs.existsSync(file);
      await cachedFetch(`${ORIGIN}${base}${slug}/`, file);
      if (!existed) fetched += 1;
    }
    summary.push({ edition, departments: map.size, pages: slugs.length, fetched });
    console.log(
      `${edition}: ${map.size} department codes, ${slugs.length} pages (${fetched} newly fetched)`
    );
  }
  fs.writeFileSync(
    path.join(CACHE_ROOT, "fetch-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
