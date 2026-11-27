#!/usr/bin/env node
// Keeps the newest snapshot of each of the last KEEP.daily days, KEEP.weekly weeks,
// KEEP.monthly months (union).
// Usage: node scripts/prune-snapshots.mjs [dir...]   (default: snapshots snapshots/cms)
import { readdirSync, unlinkSync } from "node:fs";
import { strict as assert } from "node:assert";

const KEEP = { daily: 7, weekly: 4, monthly: 6 };

const RULES = [
  [(y, m, d) => `${y}-${m}-${d}`, KEEP.daily],
  [(y, m, d) => { // week key = Monday's date
    const t = Date.UTC(y, m - 1, d);
    return new Date(t - ((new Date(t).getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10);
  }, KEEP.weekly],
  [(y, m) => `${y}-${m}`, KEEP.monthly],
];

// names: files named *-YYYYMMDD-HHMMSS.*; returns the names to delete.
export function toPrune(names) {
  const snaps = names
    .map((n) => ({ n, m: n.match(/(\d{4})(\d{2})(\d{2})-(\d{6})/) }))
    .filter((s) => s.m)
    .sort((a, b) => (a.m[0] < b.m[0] ? 1 : -1)); // newest first
  const keep = new Set();
  for (const [key, n] of RULES) {
    const seen = new Set();
    for (const { n: name, m } of snaps) {
      const k = key(+m[1], m[2], m[3]);
      if (seen.has(k)) continue;
      if (seen.size === n) break;
      seen.add(k);
      keep.add(name);
    }
  }
  return snaps.map((s) => s.n).filter((n) => !keep.has(n));
}

if (process.argv[1].endsWith("prune-snapshots.mjs")) {
  if (process.argv[2] === "--test") {
    const day = (d, t = "120000") => `cms-202601${d}-${t}.json`;
    const names = Array.from({ length: 28 }, (_, i) => day(String(i + 1).padStart(2, "0")));
    names.push(day("28", "090000"), "notes.txt");
    for (let m = 1; m <= 7; m++) names.push(`cms-2025${String(m).padStart(2, "0")}15-000000.json`);
    const del = toPrune(names);
    assert(del.includes(day("28", "090000")), "older same-day snapshot pruned");
    assert(!del.includes(day("28")) && !del.includes(day("22")), "last 7 days kept");
    assert(del.includes(day("20")), "mid-month day pruned unless it is a week/month keeper");
    assert(del.includes("cms-20250115-000000.json"), "7th-newest month pruned");
    assert(!del.includes("cms-20250715-000000.json"), "6 months kept");
    assert(!del.includes("notes.txt"), "non-snapshots ignored");
    console.log("ok");
  } else {
    for (const dir of process.argv.length > 2 ? process.argv.slice(2) : ["snapshots", "snapshots/cms"]) {
      for (const n of toPrune(readdirSync(dir))) unlinkSync(`${dir}/${n}`);
    }
  }
}
