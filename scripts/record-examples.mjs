// Records the landing page's example notes once, through the real pipeline, so the public
// "Try an example" button replays them without spending a single token.
// Usage: TYPESAFE_API_KEY=... node scripts/record-examples.mjs   (rerun after changing the vault or the examples)
import { readFileSync, writeFileSync } from "node:fs";
import { analyze } from "../server/analyze.mjs";
import { loadBundles } from "../server/bundles.mjs";
import { createJevClient } from "../server/jev.mjs";

const root = new URL("..", import.meta.url).pathname;
const bundles = loadBundles(root + "server/bundles.json");
const jev = createJevClient(process.env.TYPESAFE_API_KEY);
const src = readFileSync(root + "web/src/lib/examples.ts", "utf8");
const examples = [...src.matchAll(/id: '(\w+)',\s*mode: '(\w+)',[\s\S]*?text: `([\s\S]*?)`/g)].map((m) => ({ id: m[1], mode: m[2], text: m[3] }));
if (examples.length !== 2) throw new Error("expected two examples, found " + examples.length);

const out = { bundlesVersion: bundles.version };
for (const ex of examples) {
  const frames = [];
  let open = [];
  let prevHash;
  const ends = [...ex.text.matchAll(/[.!?](?=\s|$)/g)].map((m) => m.index + 1);
  for (const at of ends) {
    const res = await analyze({ mode: ex.mode, text: ex.text.slice(0, at), open, locked: [], prevHash }, { jev, bundles });
    prevHash = res.clausesHash;
    open = res.bundles.filter((b) => b.open).map((b) => b.id);
    const fields = Object.fromEntries(Object.entries(res.fields).filter(([, f]) => f.state !== "empty"));
    frames.push({ at, res: { bundles: res.bundles.filter((b) => b.open), fields } });
    process.stderr.write(`${ex.id} ${at}/${ex.text.length} open=${open.length} fields=${Object.keys(fields).length}\n`);
  }
  out[ex.id] = frames;
}
writeFileSync(root + "web/src/lib/example-frames.json", JSON.stringify(out));
console.log("wrote web/src/lib/example-frames.json");
