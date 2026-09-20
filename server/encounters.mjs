// Encounter CRUD. A final encounter is immutable (PUT -> 409). Every query scoped by doctor_id.
import { Router } from "express";

const MODES = new Set(["clinical", "operative"]);
const FIELD_STATES = new Set(["filled", "unclear", "empty", "dismissed"]);
const FIELD_SOURCES = new Set(["jev", "doctor"]);

function rowToEncounter(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    mode: row.mode,
    title: row.title,
    text: row.text,
    sheet: row.sheet,
    openBundles: row.open_bundles,
    status: row.status,
    bundlesVersion: row.bundles_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.finalized_at ? { finalizedAt: row.finalized_at } : {}),
  };
}

// Validates the Sheet shape at the boundary. Returns an error string, or null if valid.
function validateSheet(sheet) {
  if (sheet === null || typeof sheet !== "object" || Array.isArray(sheet)) return "sheet must be an object";
  for (const [key, entry] of Object.entries(sheet)) {
    if (!entry || typeof entry !== "object") return `sheet.${key} must be an object`;
    if (entry.value !== null && typeof entry.value !== "string") return `sheet.${key}.value must be a string or null`;
    if (!FIELD_STATES.has(entry.state)) return `sheet.${key}.state must be one of ${[...FIELD_STATES].join(", ")}`;
    if (!FIELD_SOURCES.has(entry.source)) return `sheet.${key}.source must be one of ${[...FIELD_SOURCES].join(", ")}`;
    if (entry.unit !== undefined && typeof entry.unit !== "string") return `sheet.${key}.unit must be a string`;
    if (entry.p !== undefined && typeof entry.p !== "number") return `sheet.${key}.p must be a number`;
    if (entry.evidence !== undefined && entry.evidence !== null) {
      const { start, end } = entry.evidence;
      if (!Number.isInteger(start) || !Number.isInteger(end)) return `sheet.${key}.evidence must be {start,end} or null`;
    }
  }
  return null;
}

async function replaceEncounterFields(client, encounterId, doctorId, sheet) {
  await client.query("DELETE FROM encounter_fields WHERE encounter_id = $1", [encounterId]);
  const entries = Object.entries(sheet);
  if (!entries.length) return;
  const values = [];
  const params = [];
  entries.forEach(([fieldKey, f], i) => {
    const base = i * 6;
    values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
    params.push(encounterId, doctorId, fieldKey, f.state, f.source, f.value ?? null);
  });
  await client.query(
    `INSERT INTO encounter_fields (encounter_id, doctor_id, field_key, state, source, value) VALUES ${values.join(", ")}`,
    params
  );
}

// Mounted at /api/patients/:id/encounters (mergeParams so req.params.id is the patient id).
export function patientEncountersRouter(pool, bundles) {
  const router = Router({ mergeParams: true });

  router.get("/", async (req, res) => {
    const patient = await pool.query("SELECT id FROM patients WHERE doctor_id = $1 AND id = $2", [req.doctor.id, req.params.id]);
    if (!patient.rows[0]) return res.status(404).json({ error: "not found" });
    const { rows } = await pool.query(
      "SELECT * FROM encounters WHERE doctor_id = $1 AND patient_id = $2 ORDER BY created_at DESC",
      [req.doctor.id, req.params.id]
    );
    res.json(rows.map(rowToEncounter));
  });

  router.post("/", async (req, res) => {
    const { mode, title } = req.body || {};
    if (!MODES.has(mode)) return res.status(400).json({ error: 'mode must be "clinical" or "operative"' });
    const patient = await pool.query("SELECT id FROM patients WHERE doctor_id = $1 AND id = $2", [req.doctor.id, req.params.id]);
    if (!patient.rows[0]) return res.status(404).json({ error: "not found" });
    const { rows } = await pool.query(
      `INSERT INTO encounters (patient_id, doctor_id, mode, title, bundles_version) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, req.doctor.id, mode, typeof title === "string" ? title : "", bundles.version]
    );
    res.status(201).json(rowToEncounter(rows[0]));
  });

  return router;
}

// Mounted at /api/encounters/:id.
export function encountersRouter(pool) {
  const router = Router();

  router.get("/:id", async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM encounters WHERE doctor_id = $1 AND id = $2", [req.doctor.id, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "not found" });
    res.json(rowToEncounter(rows[0]));
  });

  router.put("/:id", async (req, res) => {
    const { text, sheet } = req.body || {};
    if (typeof text !== "string") return res.status(400).json({ error: "text must be a string" });
    const sheetError = validateSheet(sheet);
    if (sheetError) return res.status(400).json({ error: sheetError });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query("SELECT status FROM encounters WHERE doctor_id = $1 AND id = $2 FOR UPDATE", [req.doctor.id, req.params.id]);
      if (!existing.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "not found" });
      }
      if (existing.rows[0].status === "final") {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "encounter is final and cannot be edited" });
      }
      const openBundles = Object.keys(sheet).reduce((ids, key) => {
        const bundleId = key.slice(0, key.indexOf("."));
        if (bundleId && !ids.includes(bundleId)) ids.push(bundleId);
        return ids;
      }, []);
      const { rows } = await client.query(
        `UPDATE encounters SET text = $1, sheet = $2, open_bundles = $3, updated_at = now()
         WHERE doctor_id = $4 AND id = $5 RETURNING *`,
        [text, JSON.stringify(sheet), JSON.stringify(openBundles), req.doctor.id, req.params.id]
      );
      await replaceEncounterFields(client, req.params.id, req.doctor.id, sheet);
      await client.query("COMMIT");
      res.json(rowToEncounter(rows[0]));
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  });

  router.post("/:id/finalize", async (req, res) => {
    const { rows } = await pool.query(
      `UPDATE encounters SET status = 'final', finalized_at = now(), updated_at = now()
       WHERE doctor_id = $1 AND id = $2 AND status = 'draft' RETURNING *`,
      [req.doctor.id, req.params.id]
    );
    if (rows[0]) return res.json(rowToEncounter(rows[0]));
    const existing = await pool.query("SELECT status FROM encounters WHERE doctor_id = $1 AND id = $2", [req.doctor.id, req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: "not found" });
    res.status(409).json({ error: "encounter is already final" });
  });

  return router;
}
