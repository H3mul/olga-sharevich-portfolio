#!/usr/bin/env node
// Usage:
//   CMS_ID=.. CMS_PUBLIC_TOKEN=.. node scripts/cms.mjs pull [out.json]
//   CMS_ID=.. CMS_SECRET_TOKEN=.. node scripts/cms.mjs restore <snapshot.json>
// Restore matches models by identifier; recreate the models in Plasmic first.
import { readFileSync, writeFileSync } from "node:fs";

const API = process.env.PLASMIC_CMS_API ?? "https://data.plasmic.app/api/v1/cms/databases";
const { CMS_ID } = process.env;
const [cmd, file] = process.argv.slice(2);
if (!CMS_ID) throw new Error("CMS_ID not set");
const tok = (n) => process.env[n] || (() => { throw new Error(`${n} not set`); })();
const headers = (t) => ({ "x-plasmic-api-cms-tokens": `${CMS_ID}:${t}` });

async function call(url, t, init = {}) {
  const r = await fetch(url, { ...init, headers: { ...headers(t), ...init.headers } });
  if (!r.ok) throw new Error(`${init.method ?? "GET"} ${url} -> ${r.status} ${await r.text()}`);
  return r.json();
}

if (cmd === "pull") {
  // Drafts need the secret token; the public token only sees published rows.
  const drafts = !!process.env.CMS_SECRET_TOKEN;
  const t = drafts ? process.env.CMS_SECRET_TOKEN : tok("CMS_PUBLIC_TOKEN");
  if (!drafts) console.error("CMS_SECRET_TOKEN not set: pulling published rows only");
  const db = await call(`${API}/${CMS_ID}`, t);
  const models = [];
  for (const m of db.tables) {
    const rows = [];
    for (let offset = 0, n = 100; n === 100; offset += 100) {
      const q = encodeURIComponent(JSON.stringify({ limit: 100, offset }));
      const page = await call(`${API}/${CMS_ID}/tables/${m.identifier}/query?${drafts ? "draft=1&" : ""}q=${q}`, t);
      rows.push(...page.rows);
      n = page.rows.length;
    }
    models.push({ identifier: m.identifier, name: m.name, schema: m.schema, rows });
    console.error(`${m.identifier}: ${rows.length} rows`);
  }
  const out = JSON.stringify({ cmsId: CMS_ID, pulledAt: new Date().toISOString(), models }, null, 2);
  file ? writeFileSync(file, out) : console.log(out);
} else if (cmd === "restore" && file) {
  const t = tok("CMS_SECRET_TOKEN");
  const snap = JSON.parse(readFileSync(file, "utf8"));
  for (const m of snap.models) {
    // Note: everything is published on restore, including rows that were drafts.
    const rows = m.rows.map((r) => ({ identifier: r.identifier, data: r.data }));
    for (let i = 0; i < rows.length; i += 50) {
      await call(`${API}/${CMS_ID}/tables/${m.identifier}/rows`, t, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rows.slice(i, i + 50), publish: true }),
      });
    }
    console.error(`${m.identifier}: restored ${rows.length} rows`);
  }
} else {
  console.error("usage: cms.mjs pull [out.json] | restore <snapshot.json>");
  process.exit(1);
}
