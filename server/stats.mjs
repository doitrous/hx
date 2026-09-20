// GET /api/stats/dashboard. Completeness math and "most missed" run as SQL over encounter_fields
// and encounters; labels/titles/systems for a field_key come from the loaded bundles (not stored
// per-row, since bundles.json is the source of truth and changes as the vault grows).
import { Router } from "express";

async function completenessStats(pool, doctorId) {
  // Completeness per encounter = (filled + dismissed) / all fields on its sheet.
  const { rows } = await pool.query(
    `SELECT e.id, e.created_at,
            COUNT(*) FILTER (WHERE ef.state IN ('filled', 'dismissed'))::float / COUNT(*) AS completeness
     FROM encounters e JOIN encounter_fields ef ON ef.encounter_id = e.id
     WHERE e.doctor_id = $1
     GROUP BY e.id, e.created_at`,
    [doctorId]
  );
  const avgCompleteness = rows.length ? rows.reduce((s, r) => s + Number(r.completeness), 0) / rows.length : 0;

  const byWeek = new Map(); // week start (ISO date) -> { sum, n }
  for (const r of rows) {
    const week = new Date(r.created_at);
    week.setUTCDate(week.getUTCDate() - ((week.getUTCDay() + 6) % 7)); // Monday of that week, UTC
    const key = week.toISOString().slice(0, 10);
    const entry = byWeek.get(key) || { sum: 0, n: 0 };
    entry.sum += Number(r.completeness);
    entry.n++;
    byWeek.set(key, entry);
  }
  const completenessByWeek = [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, { sum, n }]) => ({ week, value: sum / n }));

  return { avgCompleteness, completenessByWeek };
}

async function mostMissedFields(pool, doctorId, bundles, limit = 10) {
  const { rows } = await pool.query(
    `SELECT field_key,
            COUNT(*) FILTER (WHERE state = 'empty')::float / COUNT(*) AS missed_rate,
            COUNT(*) AS n
     FROM encounter_fields
     WHERE doctor_id = $1
     GROUP BY field_key
     ORDER BY missed_rate DESC, n DESC`,
    [doctorId]
  );
  const out = [];
  for (const r of rows) {
    const meta = bundles.field(r.field_key);
    if (!meta) continue; // stale field key from a bundle that no longer exists
    out.push({ fieldKey: r.field_key, label: meta.item.label, bundleTitle: meta.bundle.title, missedRate: Number(r.missed_rate), n: Number(r.n) });
    if (out.length >= limit) break;
  }
  return out;
}

async function bySystem(pool, doctorId, bundles) {
  const { rows } = await pool.query(
    "SELECT DISTINCT field_key, encounter_id FROM encounter_fields WHERE doctor_id = $1",
    [doctorId]
  );
  const encountersBySystem = new Map(); // system -> Set(encounterId)
  for (const r of rows) {
    const meta = bundles.field(r.field_key);
    if (!meta) continue;
    const set = encountersBySystem.get(meta.bundle.system) || new Set();
    set.add(r.encounter_id);
    encountersBySystem.set(meta.bundle.system, set);
  }
  return [...encountersBySystem.entries()].map(([system, set]) => ({ system, encounters: set.size })).sort((a, b) => b.encounters - a.encounters);
}

export function statsRouter(pool, bundles) {
  const router = Router();

  router.get("/dashboard", async (req, res) => {
    const doctorId = req.doctor.id;
    const [patients, encountersThisWeek, openDrafts, completeness, mostMissed, systems] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM patients WHERE doctor_id = $1", [doctorId]),
      pool.query("SELECT COUNT(*) FROM encounters WHERE doctor_id = $1 AND created_at >= date_trunc('week', now())", [doctorId]),
      pool.query("SELECT COUNT(*) FROM encounters WHERE doctor_id = $1 AND status = 'draft'", [doctorId]),
      completenessStats(pool, doctorId),
      mostMissedFields(pool, doctorId, bundles),
      bySystem(pool, doctorId, bundles),
    ]);
    res.json({
      patients: Number(patients.rows[0].count),
      encountersThisWeek: Number(encountersThisWeek.rows[0].count),
      openDrafts: Number(openDrafts.rows[0].count),
      avgCompleteness: completeness.avgCompleteness,
      completenessByWeek: completeness.completenessByWeek,
      mostMissed,
      bySystem: systems,
    });
  });

  return router;
}
