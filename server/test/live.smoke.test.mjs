// Runs only when TYPESAFE_API_KEY is set AND LIVE=1: `LIVE=1 node --test test/live.smoke.test.mjs`.
// Hits the real Jev API (spends real credit) with the sample note from trial/index.html, in two
// calls — the first opens bundles, the second (with those bundles now in `open`) resolves the
// full evidence+value chase, matching how a real client re-checks after the doctor keeps typing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../analyze.mjs";
import { loadBundles } from "../bundles.mjs";
import { createJevClient } from "../jev.mjs";
import { config } from "../config.mjs";

const RUN = Boolean(process.env.LIVE === "1" && config.typesafeApiKey);

test("live: sample note opens diabetes (not vomiting), extracts HbA1c and blood pressure", { skip: !RUN && "set LIVE=1 and TYPESAFE_API_KEY to run this" }, async () => {
  const bundles = loadBundles();
  const jev = createJevClient(config.typesafeApiKey);
  const text =
    "45 year old male teacher from Giza, married with three children, smokes 20 cigarettes a day for 20 years, no alcohol. " +
    "Known diabetic for 10 years on metformin, last HbA1c was 8.2. Presents with epigastric pain for 3 days, gradual onset " +
    "and progressive course, burning in character, radiating to the back, increased by meals and relieved by antacids. " +
    "He denies vomiting. No jaundice. His father is hypertensive. On examination he is alert, pulse 88, blood pressure 130 " +
    "over 85, temperature 37.2. Abdomen is soft with epigastric tenderness, no guarding.";

  const first = await analyze({ mode: "clinical", text, open: [], locked: [] }, { jev, bundles });
  const opened = first.bundles.filter((b) => b.open).map((b) => b.id);

  const second = await analyze({ mode: "clinical", text, open: opened, locked: [] }, { jev, bundles });
  const totalMs = first.ms + second.ms;
  const totalCalls = first.usage.calls + second.usage.calls;
  const totalTokens = first.usage.tokens + second.usage.tokens;
  console.log(`live smoke test: ${totalMs} ms, ${totalCalls} calls, ${totalTokens} tokens`);

  const byId = Object.fromEntries(second.bundles.map((b) => [b.id, b]));
  assert.equal(byId.diabetes.open, true, "diabetes bundle should open");
  const vomiting = Object.values(byId).find((b) => b.id.includes("vomit"));
  if (vomiting) assert.equal(vomiting.open, false, "vomiting bundle should NOT open (denied in the note)");

  assert.equal(second.fields["diabetes.latest_hba1c"]?.value, "8.2");
  assert.equal(second.fields["x_general.blood_pressure"]?.value, "130/85");
});
