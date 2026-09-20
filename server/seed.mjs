// Demo data for a fresh environment: one demo doctor, ~14 synthetic patients, ~40 encounters
// spread over 10 weeks with plausible sheets, so the dashboard has something real-looking to show.
// Never real patient data: names are invented, MRNs are DEMO-xxxx.
import { randomBytes } from "node:crypto";
import { createPool } from "./db.mjs";
import { migrate } from "./migrate.mjs";
import { loadBundles } from "./bundles.mjs";

const DEMO_EMAIL = "demo@example.com";

const FIRST_NAMES = ["Aliaa", "Mostafa", "Nourhan", "Youssef", "Mariam", "Hassan", "Salma", "Karim", "Dina", "Tarek", "Rania", "Sami", "Layla", "Adel"];
const LAST_NAMES = ["Farouk", "Gaber", "Saeed", "Kandil", "Rashad", "Nabil", "Fathy", "Hamdy", "Zaki", "Sabry", "Elshamy", "Fouad", "Aziz", "Mahmoud"];

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const randomBetween = (a, b) => a + Math.random() * (b - a);

// A believable text + sheet for one bundle, so "most missed" and completeness have real texture:
// most fields filled, one or two intentionally left empty.
function makeSheet(bundles, bundleIds) {
  const sheet = {};
  const sentences = [];
  for (const id of bundleIds) {
    const bundle = bundles.get(id);
    if (!bundle) continue;
    bundle.items.forEach((item, i) => {
      const leaveEmpty = Math.random() < 0.15; // most items are documented; some realistically aren't
      if (leaveEmpty) {
        sheet[`${id}.${item.id}`] = { value: null, state: "empty", source: "jev" };
        return;
      }
      const value =
        item.type === "presence"
          ? Math.random() < 0.7
            ? "Present"
            : "Absent"
          : item.type === "bp"
            ? `${110 + rand(40)}/${70 + rand(20)}`
            : item.type === "duration"
              ? `${1 + rand(10)} days`
              : item.type.startsWith("number")
                ? String(Math.round(randomBetween(5, 15) * 10) / 10)
                : `${bundle.title}: ${item.label.toLowerCase()} was documented in the note.`;
      const sentenceIndex = sentences.length;
      sentences.push(value);
      sheet[`${id}.${item.id}`] = { value, state: "filled", source: "jev", p: Math.round(randomBetween(0.7, 0.98) * 100) / 100, evidence: { start: 0, end: value.length } };
    });
  }
  return { sheet, text: sentences.join(" ") };
}

async function seed(pool) {
  const bundles = loadBundles();
  const historyAndExamIds = bundles.bundles.filter((b) => b.kind === "history" || b.kind === "exam").map((b) => b.id);
  const alwaysOn = bundles.bundles.filter((b) => b.trigger === null).map((b) => b.id);

  const password = randomBytes(9).toString("base64url");
  const { _internal } = await import("./auth.mjs");
  const passwordHash = await _internal.hashPassword(password);

  const existing = await pool.query("SELECT id FROM doctors WHERE email = $1", [DEMO_EMAIL]);
  if (existing.rows[0]) {
    console.log(`demo doctor already exists (${DEMO_EMAIL}); delete it first to reseed`);
    return;
  }
  const {
    rows: [doctor],
  } = await pool.query("INSERT INTO doctors (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id", [DEMO_EMAIL, passwordHash, "Dr Demo"]);

  const patients = [];
  for (let i = 0; i < 14; i++) {
    const mrn = `DEMO-${String(i + 1).padStart(4, "0")}`;
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const {
      rows: [patient],
    } = await pool.query("INSERT INTO patients (doctor_id, mrn, name, sex, birth_year) VALUES ($1, $2, $3, $4, $5) RETURNING id", [
      doctor.id,
      mrn,
      name,
      Math.random() < 0.5 ? "M" : "F",
      1945 + rand(60),
    ]);
    patients.push(patient.id);
  }

  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  for (let i = 0; i < 40; i++) {
    const patientId = pick(patients);
    const weeksAgo = rand(10);
    const createdAt = new Date(now - weeksAgo * WEEK_MS - rand(WEEK_MS));
    const bundleIds = [...alwaysOn, ...historyAndExamIds.filter(() => Math.random() < 0.25)].filter((v, idx, arr) => arr.indexOf(v) === idx);
    const { sheet, text } = makeSheet(bundles, bundleIds);
    const status = Math.random() < 0.75 ? "final" : "draft";

    const {
      rows: [encounter],
    } = await pool.query(
      `INSERT INTO encounters (patient_id, doctor_id, mode, title, text, sheet, open_bundles, status, bundles_version, created_at, updated_at, finalized_at)
       VALUES ($1, $2, 'clinical', $3, $4, $5, $6, $7, $8, $9, $9, $10) RETURNING id`,
      [patientId, doctor.id, "Clinic visit", text, JSON.stringify(sheet), JSON.stringify(bundleIds), status, bundles.version, createdAt, status === "final" ? createdAt : null]
    );
    const entries = Object.entries(sheet);
    if (entries.length) {
      const values = [];
      const params = [];
      entries.forEach(([fieldKey, f], idx) => {
        const base = idx * 6;
        values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
        params.push(encounter.id, doctor.id, fieldKey, f.state, f.source, f.value);
      });
      await pool.query(`INSERT INTO encounter_fields (encounter_id, doctor_id, field_key, state, source, value) VALUES ${values.join(", ")}`, params);
    }
  }

  console.log(`seeded demo doctor: ${DEMO_EMAIL} / ${password}`);
  console.log(`14 patients, 40 encounters`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const pool = createPool();
  await migrate(pool);
  await seed(pool);
  await pool.end();
}
