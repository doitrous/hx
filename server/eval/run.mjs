// Live recall and precision check for bundle triggers. Spends real Jev credit (about 1 cent per 25 cases).
//   node server/eval/run.mjs                         all case files, server/bundles.json
//   node server/eval/run.mjs cardiac.json            one file in server/eval/cases/
//   BUNDLES=/tmp/mine.json node server/eval/run.mjs  judge against a privately compiled vault
// A case: { "text": "...", "mode": "clinical" | "operative" (default clinical), "mustOpen": ["id"], "mustNotOpen": ["id"], "why": "optional" }
// Exit code 1 when any expectation fails.
import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { judgeTriggers, THRESHOLDS } from "../analyze.mjs";
import { createJevClient } from "../jev.mjs";
import { loadBundles } from "../bundles.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
if (!process.env.TYPESAFE_API_KEY) { console.error("TYPESAFE_API_KEY is not set"); process.exit(2); }
const jev = createJevClient(process.env.TYPESAFE_API_KEY);
const bundles = loadBundles(process.env.BUNDLES || join(HERE, "..", "bundles.json"));
const files = process.argv.slice(2).length ? process.argv.slice(2) : (await readdir(join(HERE, "cases"))).filter((f) => f.endsWith(".json"));

const cases = [];
for (const f of files) for (const c of JSON.parse(await readFile(join(HERE, "cases", f), "utf8"))) cases.push({ ...c, file: f });
const unknown = [...new Set(cases.flatMap((c) => [...(c.mustOpen || []), ...(c.mustNotOpen || [])]))].filter((id) => !bundles.get(id));
if (unknown.length) { console.error("Cases name bundle ids that do not exist:", unknown.join(", ")); process.exit(2); }

let misses = 0, falseOpens = 0, expectations = 0;
const failures = [];
const queue = [...cases];
await Promise.all(Array.from({ length: 4 }, async () => {
  for (let c; (c = queue.shift()); ) {
    const p = await judgeTriggers({ mode: c.mode || "clinical", text: c.text }, { jev, bundles });
    for (const id of c.mustOpen || []) { expectations++; if (p[id] < THRESHOLDS.FIRE) { misses++; failures.push(`MISS        ${id} p=${p[id].toFixed(2)}  [${c.file}] ${JSON.stringify(c.text)}`); } }
    for (const id of c.mustNotOpen || []) { expectations++; if (p[id] >= THRESHOLDS.FIRE) { falseOpens++; failures.push(`FALSE OPEN  ${id} p=${p[id].toFixed(2)}  [${c.file}] ${JSON.stringify(c.text)}`); } }
  }
}));
failures.sort().forEach((f) => console.log(f));
console.log(`\n${cases.length} cases, ${expectations} expectations: ${misses} misses, ${falseOpens} false opens  (bundles ${bundles.version})`);
process.exit(misses + falseOpens ? 1 : 0);
