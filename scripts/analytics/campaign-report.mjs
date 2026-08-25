#!/usr/bin/env node
/**
 * What a class campaign actually did.
 *
 * The email carries no tracking parameters, so attribution comes from the
 * cohort instead, which for this campaign is cleaner than a UTM would be: the
 * Class of 2030 arrived at Yale days ago and had no other route to the app, so
 * accounts appearing in that bucket after the send are the campaign's doing.
 *
 * Compares live counts against the baseline captured at send time, and breaks
 * the arrivals down by hour so the shape of the response is visible: the spike
 * in the first hour, and whether anything is still coming in a day later.
 *
 *   node scripts/analytics/campaign-report.mjs
 *   node scripts/analytics/campaign-report.mjs --year 2030 --sent 1615
 */

import fs from "node:fs";
import path from "node:path";

import { REPO_ROOT, loadEnv, parseArgs } from "../email/lib.mjs";

const BASELINE = (year) =>
  path.join(REPO_ROOT, "lists", `campaign-baseline-${year}.json`);

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function db() {
  loadEnv();
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(JSON.parse(key)),
        projectId: "yale-degree-intelligence",
      });
  return getFirestore(app);
}

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    values: ["year", "sent"],
    flags: [],
  });
  const year = args.year ?? "2030";
  const sentCount = Number(args.sent ?? 1615);

  const baselineFile = BASELINE(year);
  if (!fs.existsSync(baselineFile)) {
    throw new Error(`no baseline at ${baselineFile}`);
  }
  const baseline = JSON.parse(fs.readFileSync(baselineFile, "utf8"));
  const since = new Date(baseline.capturedAt);

  const snapshot = await (await db()).collection("users").get();

  const byYear = {};
  const arrivals = [];
  snapshot.docs.forEach((doc) => {
    const user = doc.data();
    const label = String(user.graduationYear ?? "unset");
    byYear[label] = (byYear[label] || 0) + 1;

    // createdAt only exists on newer documents; updatedAt is the fallback the
    // admin dashboard already uses for the same reason.
    const stamp = toDate(user.createdAt) || toDate(user.updatedAt);
    if (stamp && stamp > since && label === String(year)) arrivals.push(stamp);
  });

  const before = baseline.byGraduationYear[String(year)] ?? 0;
  const now = byYear[String(year)] ?? 0;
  const gained = now - before;

  console.log(`campaign report — class of ${year}`);
  console.log(`  sent            ${sentCount}`);
  console.log(`  baseline at     ${baseline.capturedAt}`);
  console.log(`  ${year} accounts   ${before} -> ${now}  (+${gained})`);
  console.log(
    `  signup rate     ${((gained / sentCount) * 100).toFixed(2)}% of recipients`,
  );
  console.log(
    `  all users       ${baseline.totalUsers} -> ${snapshot.size}  (+${snapshot.size - baseline.totalUsers})`,
  );

  if (arrivals.length) {
    const buckets = {};
    arrivals.forEach((date) => {
      const hour = date.toISOString().slice(0, 13) + ":00Z";
      buckets[hour] = (buckets[hour] || 0) + 1;
    });
    console.log("\n  arrivals by hour");
    Object.keys(buckets)
      .sort()
      .forEach((hour) => {
        console.log(`    ${hour}  ${"#".repeat(buckets[hour])} ${buckets[hour]}`);
      });
  }
}

main().catch((error) => {
  console.error(`campaign-report: ${error.message}`);
  process.exit(1);
});
