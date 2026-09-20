// Patient CRUD, scoped by doctor_id on every query. MRN is unique per doctor (409 on clash).
import { Router } from "express";

const SEX_VALUES = new Set(["M", "F"]);

function validatePatientInput(body, { partial = false } = {}) {
  const errors = [];
  const out = {};
  if (!partial || body.mrn !== undefined) {
    if (typeof body.mrn !== "string" || !body.mrn.trim()) errors.push("mrn is required");
    else out.mrn = body.mrn.trim();
  }
  if (body.name !== undefined) {
    if (body.name !== null && typeof body.name !== "string") errors.push("name must be a string");
    else out.name = body.name?.trim() || null;
  }
  if (body.sex !== undefined) {
    if (body.sex !== null && !SEX_VALUES.has(body.sex)) errors.push('sex must be "M" or "F"');
    else out.sex = body.sex ?? null;
  }
  if (body.birthYear !== undefined) {
    if (body.birthYear !== null && (!Number.isInteger(body.birthYear) || body.birthYear < 1900 || body.birthYear > new Date().getFullYear())) {
      errors.push("birthYear must be a plausible year");
    } else out.birthYear = body.birthYear ?? null;
  }
  return { errors, out };
}

function rowToPatient(row) {
  const sheet = row.sheet || {};
  const values = Object.values(sheet);
  const completeness = values.length ? values.filter((f) => f.state === "filled" || f.state === "dismissed").length / values.length : undefined;
  return {
    id: row.id,
    mrn: row.mrn,
    name: row.name ?? undefined,
    sex: row.sex ?? undefined,
    birthYear: row.birth_year ?? undefined,
    createdAt: row.created_at,
    lastEncounterAt: row.last_encounter_at ?? undefined,
    openDrafts: Number(row.open_drafts) || 0,
    completeness,
  };
}

export function patientsRouter(pool) {
  const router = Router();

  router.get("/", async (req, res) => {
    const q = typeof req.query.q === "string" && req.query.q.trim() ? req.query.q.trim() : null;
    const { rows } = await pool.query(
      `WITH latest AS (
         SELECT DISTINCT ON (patient_id) patient_id, created_at, sheet
         FROM encounters WHERE doctor_id = $1
         ORDER BY patient_id, created_at DESC
       ), drafts AS (
         SELECT patient_id, COUNT(*) AS open_drafts
         FROM encounters WHERE doctor_id = $1 AND status = 'draft'
         GROUP BY patient_id
       )
       SELECT p.*, latest.created_at AS last_encounter_at, latest.sheet,
              COALESCE(drafts.open_drafts, 0) AS open_drafts
       FROM patients p
       LEFT JOIN latest ON latest.patient_id = p.id
       LEFT JOIN drafts ON drafts.patient_id = p.id
       WHERE p.doctor_id = $1 AND ($2::text IS NULL OR p.mrn ILIKE '%' || $2 || '%' OR p.name ILIKE '%' || $2 || '%')
       ORDER BY p.created_at DESC`,
      [req.doctor.id, q]
    );
    res.json(rows.map(rowToPatient));
  });

  router.post("/", async (req, res) => {
    const { errors, out } = validatePatientInput(req.body || {});
    if (errors.length) return res.status(400).json({ error: errors.join(", ") });
    try {
      const { rows } = await pool.query(
        `INSERT INTO patients (doctor_id, mrn, name, sex, birth_year) VALUES ($1, $2, $3, $4, $5)
         RETURNING *, null AS last_encounter_at, null AS sheet, 0 AS open_drafts`,
        [req.doctor.id, out.mrn, out.name ?? null, out.sex ?? null, out.birthYear ?? null]
      );
      res.status(201).json(rowToPatient(rows[0]));
    } catch (e) {
      if (e.code === "23505") return res.status(409).json({ error: "a patient with that MRN already exists" });
      throw e;
    }
  });

  router.get("/:id", async (req, res) => {
    const { rows } = await pool.query(
      `WITH latest AS (
         SELECT DISTINCT ON (patient_id) patient_id, created_at, sheet
         FROM encounters WHERE doctor_id = $1 AND patient_id = $2
         ORDER BY patient_id, created_at DESC
       ), drafts AS (
         SELECT patient_id, COUNT(*) AS open_drafts
         FROM encounters WHERE doctor_id = $1 AND patient_id = $2 AND status = 'draft'
         GROUP BY patient_id
       )
       SELECT p.*, latest.created_at AS last_encounter_at, latest.sheet,
              COALESCE(drafts.open_drafts, 0) AS open_drafts
       FROM patients p
       LEFT JOIN latest ON latest.patient_id = p.id
       LEFT JOIN drafts ON drafts.patient_id = p.id
       WHERE p.doctor_id = $1 AND p.id = $2`,
      [req.doctor.id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "not found" });
    res.json(rowToPatient(rows[0]));
  });

  router.patch("/:id", async (req, res) => {
    const { errors, out } = validatePatientInput(req.body || {}, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join(", ") });
    const fields = Object.keys(out);
    if (!fields.length) return res.status(400).json({ error: "nothing to update" });
    const columns = { mrn: "mrn", name: "name", sex: "sex", birthYear: "birth_year" };
    const sets = fields.map((f, i) => `${columns[f]} = $${i + 3}`);
    try {
      const { rows } = await pool.query(
        `UPDATE patients SET ${sets.join(", ")}, updated_at = now() WHERE doctor_id = $1 AND id = $2 RETURNING *`,
        [req.doctor.id, req.params.id, ...fields.map((f) => out[f])]
      );
      if (!rows[0]) return res.status(404).json({ error: "not found" });
      res.json(rowToPatient({ ...rows[0], open_drafts: 0 }));
    } catch (e) {
      if (e.code === "23505") return res.status(409).json({ error: "a patient with that MRN already exists" });
      throw e;
    }
  });

  return router;
}
