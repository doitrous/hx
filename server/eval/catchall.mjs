// Live check of the catch-all 'Named diagnosis' bundle: shut when every named disease has its own
// bundle, open when one is left over. Usage: node server/eval/catchall.mjs (needs TYPESAFE_API_KEY).
import { analyze } from "../analyze.mjs";
import { loadBundles } from "../bundles.mjs";
import { createJevClient } from "../jev.mjs";
const bundles = await loadBundles(new URL("../bundles.json", import.meta.url).pathname);
const jev = createJevClient(process.env.TYPESAFE_API_KEY);
const cases = [
  ["Acute MI.", false],
  ["diabtic for 10 yrs, hypertention for 5", false],
  ["k/c/o DM2, HTN, IHD s/p PCI 2022", false],
  ["PMH: DM, HTN, AF on warfarin.", false],
  ["old CVA with rt hemiparesis, on plavix", false],
  ["HCV cirrhosis child B with ascites", false],
  ["asthmatic on inhalers", false],
  ["COPD and gout, both on treatment.", false],
  ["ESRD on HD 3x/week via AVF", false],
  ["epileptic on depakine, last fit 2 months ago", false],
  ["hypothyroid on eltroxin", false],
  ["RA on methotrexate and long term steroids", false],
  ["GB stones on US, s/p appendectomy 2010", false],
  ["BPH on tamsulosin, renal stones s/p ESWL", false],
  ["CHF on lasix, EF 30%", false],
  ["depression on sertraline", false],
  ["DVT left leg 2021 on xarelto", false],
  ["no DM, no HTN, no IHD", false],
  ["free of chronic illness", false],
  ["morbid obesity BMI 48, OSA on CPAP", false],
  ["Known case of sarcoidosis.", true],
  ["PMH: DM, HTN, psoriasis.", true],
  ["History of MI and also has glaucoma.", true],
  ["He has asthma and celiac disease.", true],
  ["k/c/o pheochromocytoma, hypertensive", true],
  ["Epigastric pain for 3 days, known case of achalasia.", true],
  ["diabetic, hypertensive, glucoma both eyes", true],
  ["HTN, IHD and FMF on colchicine", true],
  ["known case of behcet disease", true],
  ["DM2 + vitiligo", true],
  ["h/o brucellosis treated 2019", true],
  ["IHD, CKD, and polycythemia vera", false],
  ["favism since childhood, asthmatic", false],
];
let bad = 0;
for (const [text, want] of cases) {
  const r = await analyze({ mode: "clinical", text, open: [], locked: [] }, { jev, bundles });
  const got = r.bundles.find((b) => b.id === "named_diagnosis").open;
  if (got !== want) bad++;
  console.log(got === want ? "ok  " : "BAD ", want ? "open " : "shut ", text, "|", r.bundles.filter((b) => b.open && bundles.get(b.id).trigger).map((b) => b.id).join(","));
}
console.log(bad, "wrong of", cases.length);
process.exit(bad ? 1 : 0);
