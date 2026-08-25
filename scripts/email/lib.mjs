/**
 * Shared plumbing for the class-year email campaign scripts.
 *
 * Everything here is deliberately conservative about the two ways a bulk send
 * goes wrong: hitting the API faster than it allows, and losing track of how
 * far a partially-completed run got. Callers get a rate-limited request helper
 * that retries on 429, and nothing here ever sends without being asked twice.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const CLASS_YEARS = ["2030", "2029", "2028", "2027"];

/**
 * The From identity. The address must live on a domain verified in Resend;
 * yale.edu cannot be verified (Yale controls that DNS zone), so the campaign
 * sends from degreeint.com and routes replies back to the Yale inbox. Putting
 * a bare email address in the display name is a phishing signature that costs
 * deliverability, so the display name stays a human name.
 */
/*
 * The apostrophe is the ASCII one, not a typographic one. A display name is a
 * mail header, so anything outside ASCII has to travel RFC 2047 encoded, and a
 * client that mishandles that shows the sender as mojibake. Not a risk worth
 * taking on the one line every recipient reads before deciding to open this.
 */
export const FROM_NAME = "Filippo Fonseca ('28)";
export const REPLY_TO = "filippo.fonseca@yale.edu";

/** Resend's documented default is 2 requests/second; stay just under it. */
const MIN_REQUEST_INTERVAL_MS = 550;

/**
 * Load .env.local into process.env without adding a dotenv dependency.
 * Values already present in the environment win, so a one-off override on the
 * command line still works.
 */
export function loadEnv() {
  const envPath = path.join(REPO_ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
}

export function requireEnv(name) {
  loadEnv();
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .env.local (which is gitignored) and re-run.`,
    );
  }
  return value;
}

let lastRequestAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * One rate-limited call against the Resend REST API.
 *
 * Serializes requests across the whole process rather than trusting callers to
 * pace themselves, and backs off on 429 instead of surfacing it, because a
 * partially-imported audience is far more annoying to reconcile than a slow run.
 */
export async function resendRequest(method, endpoint, body, { attempt = 1 } = {}) {
  const apiKey = requireEnv("RESEND_API_KEY");

  const waitFor = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (waitFor > 0) await sleep(waitFor);
  lastRequestAt = Date.now();

  const response = await fetch(`https://api.resend.com${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 429 && attempt <= 5) {
    const backoff = 2 ** attempt * 1000;
    console.warn(`  rate limited, retrying in ${backoff / 1000}s (attempt ${attempt})`);
    await sleep(backoff);
    return resendRequest(method, endpoint, body, { attempt: attempt + 1 });
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload?.message ?? response.statusText;
    const error = new Error(`Resend ${method} ${endpoint} failed (${response.status}): ${message}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function audienceNameForYear(year) {
  return `Yale Class of ${year}`;
}

export function rosterPathForYear(year) {
  return path.join(REPO_ROOT, "lists", `${year}.roster.json`);
}

/**
 * Read a roster produced by parse-list.mjs, failing loudly if it is missing or
 * empty rather than letting a send silently reach nobody.
 */
export function readRoster(year) {
  const rosterPath = rosterPathForYear(year);
  if (!fs.existsSync(rosterPath)) {
    throw new Error(
      `no roster for ${year}. Run: node scripts/email/parse-list.mjs --year ${year} --in lists/${year}.txt`,
    );
  }

  const roster = JSON.parse(fs.readFileSync(rosterPath, "utf8"));
  if (!Array.isArray(roster.emails) || roster.emails.length === 0) {
    throw new Error(`roster for ${year} is empty`);
  }
  return roster;
}

/** Find the audience for a class year, creating it only when asked to. */
export async function findOrCreateAudience(year, { create = false } = {}) {
  const name = audienceNameForYear(year);
  const existing = await resendRequest("GET", "/audiences");
  const match = existing?.data?.find((audience) => audience.name === name);

  if (match) return { audience: match, created: false };
  if (!create) return { audience: null, created: false };

  const audience = await resendRequest("POST", "/audiences", { name });
  return { audience, created: true };
}

/** Every contact currently in an audience, following pagination to the end. */
export async function listAllContacts(audienceId) {
  const contacts = [];
  let page = await resendRequest("GET", `/audiences/${audienceId}/contacts`);

  while (page?.data?.length) {
    contacts.push(...page.data);
    if (!page.has_more) break;
    const after = page.data[page.data.length - 1].id;
    page = await resendRequest("GET", `/audiences/${audienceId}/contacts?after=${after}`);
  }

  return contacts;
}

export function parseArgs(argv, spec) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) throw new Error(`unexpected argument: ${arg}`);
    const key = arg.slice(2);
    if (spec.flags?.includes(key)) args[key] = true;
    else if (spec.values?.includes(key)) args[key] = argv[++i];
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

export function assertClassYear(year) {
  if (!CLASS_YEARS.includes(year)) {
    throw new Error(`--year must be one of ${CLASS_YEARS.join(", ")}`);
  }
}
