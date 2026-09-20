// Wires up the Express app: middleware, routers, the Jev endpoints, and (in production) the
// built web/ SPA. No route logic lives here beyond the two analyze endpoints, which are thin
// wrappers around analyze.mjs.
import express from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.mjs";
import { sessionMiddleware, requireAuth, authRouter, meRouter } from "./auth.mjs";
import { patientsRouter } from "./patients.mjs";
import { patientEncountersRouter, encountersRouter } from "./encounters.mjs";
import { statsRouter } from "./stats.mjs";
import { analyze } from "./analyze.mjs";
import { rateLimiter } from "./ratelimit.mjs";

const DEMO_TEXT_LIMIT = 4000;
const MODES = new Set(["clinical", "operative"]);

// No cookie-parser dependency: the Cookie header format is simple enough to parse inline.
function cookieParser(req, res, next) {
  req.cookies = {};
  const header = req.headers.cookie;
  if (header) {
    for (const pair of header.split(";")) {
      const i = pair.indexOf("=");
      if (i === -1) continue;
      req.cookies[pair.slice(0, i).trim()] = decodeURIComponent(pair.slice(i + 1).trim());
    }
  }
  next();
}

const MAX_LIST = 2000; // far above any real sheet (about 2000 items exist in total)
const MAX_KNOWN_CHARS = 600;
const stringList = (v) => Array.isArray(v) && v.length <= MAX_LIST && v.every((x) => typeof x === "string" && x.length <= 200);

function validateAnalyzeInput(body) {
  const { mode, text, open, locked, known, prevHash } = body || {};
  if (!MODES.has(mode)) return { error: 'mode must be "clinical" or "operative"' };
  if (typeof text !== "string") return { error: "text must be a string" };
  if (open !== undefined && !stringList(open)) return { error: "open must be a list of bundle ids" };
  if (locked !== undefined && !stringList(locked)) return { error: "locked must be a list of field keys" };
  if (known !== undefined) {
    if (typeof known !== "object" || known === null || Array.isArray(known)) return { error: "known must be an object" };
    const entries = Object.entries(known);
    if (entries.length > MAX_LIST || entries.some(([, v]) => typeof v !== "string" || v.length > MAX_KNOWN_CHARS)) return { error: "known must map field keys to short strings" };
  }
  if (prevHash !== undefined && (typeof prevHash !== "string" || prevHash.length > 100)) return { error: "prevHash must be a short string" };
  return { value: { mode, text, open: open || [], locked: locked || [], known: known || {}, prevHash } };
}

export function createApp({ pool, bundles, jev, limits = {} }) {
  const demoMax = limits.demoMaxPerWindow ?? config.demoMaxPerWindow;
  const demoDailyTokens = limits.demoDailyTokens ?? config.demoDailyTokens;
  const demoIpDailyTokens = limits.demoIpDailyTokens ?? config.demoIpDailyTokens;
  const app = express();
  app.set("trust proxy", 1); // Coolify sits in front; needed for correct req.ip on the demo rate limit
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser);
  const accounts = limits.accountsEnabled ?? config.accountsEnabled;
  if (accounts) {
    app.use(sessionMiddleware(pool));

    app.use("/api/auth", authRouter(pool));
    app.use("/api", meRouter());
    app.use("/api/patients", requireAuth, patientsRouter(pool));
    app.use("/api/patients/:id/encounters", requireAuth, patientEncountersRouter(pool, bundles));
    app.use("/api/encounters", requireAuth, encountersRouter(pool));
    app.use("/api/stats", requireAuth, statsRouter(pool, bundles));
  }

  app.get("/api/config", (req, res) => res.json({ accounts, ...(config.gaMeasurementId ? { gaId: config.gaMeasurementId } : {}) }));
  app.get("/api/bundles", (req, res) => res.json({ version: bundles.version, bundles: bundles.bundles }));

  if (accounts) app.post("/api/analyze", requireAuth, async (req, res) => {
    if (!config.typesafeApiKey) return res.status(503).json({ error: "Jev is not configured: TYPESAFE_API_KEY is not set" });
    const { value, error } = validateAnalyzeInput(req.body);
    if (error) return res.status(400).json({ error });
    let patientName;
    if (req.body.patientId !== undefined) {
      if (typeof req.body.patientId !== "string") return res.status(400).json({ error: "patientId must be a string" });
      const { rows } = await pool.query("SELECT name FROM patients WHERE doctor_id = $1 AND id = $2", [req.doctor.id, req.body.patientId]);
      if (!rows[0]) return res.status(404).json({ error: "not found" });
      patientName = rows[0].name ?? undefined;
    }
    const result = await analyze(value, { jev, bundles, patientName });
    res.json(result);
  });

  const demoLimiter = rateLimiter({ windowMs: 10 * 60 * 1000, max: demoMax });
  // Opens the TLS connection to Jev while the doctor is still reaching for the keyboard. Own counter, so it never eats the analyze allowance.
  app.post("/api/warm", rateLimiter({ windowMs: 10 * 60 * 1000, max: 60 }), (req, res) => { jev.warm?.(); res.status(204).end(); });

  // Whole-demo spending cap, reset at UTC midnight.
  // ponytail: in-process counter, so a restart resets it and two instances each get a budget. Move to Postgres if the demo is ever scaled out.
  const spend = { day: "", tokens: 0, byIp: new Map() };
  const today = () => new Date().toISOString().slice(0, 10);

  app.post("/api/demo/analyze", demoLimiter, async (req, res) => {
    if (!config.typesafeApiKey) return res.status(503).json({ error: "Jev is not configured: TYPESAFE_API_KEY is not set" });
    const { value, error } = validateAnalyzeInput(req.body);
    if (error) return res.status(400).json({ error });
    if (value.text.length > DEMO_TEXT_LIMIT) return res.status(413).json({ error: `text must be at most ${DEMO_TEXT_LIMIT} characters` });
    if (spend.day !== today()) Object.assign(spend, { day: today(), tokens: 0, byIp: new Map() });
    if ((spend.byIp.get(req.ip) || 0) >= demoIpDailyTokens) return res.status(429).json({ error: "You have used today's free demo allowance. It resets at midnight UTC." });
    if (spend.tokens >= demoDailyTokens) return res.status(503).json({ error: "The demo has reached its limit for today. It resets at midnight UTC." });
    // The demo only ever reads known bundle ids, so a padded list cannot inflate the question count.
    value.open = value.open.filter((id) => bundles.get(id));
    const result = await analyze(value, { jev, bundles, patientName: undefined });
    spend.tokens += result.usage?.tokens || 0;
    spend.byIp.set(req.ip, (spend.byIp.get(req.ip) || 0) + (result.usage?.tokens || 0));
    res.json(result);
  });

  // Serve the built web/ SPA if it exists (Dockerfile builds it into server/web-dist).
  // Local dev without a web/ checkout still runs the API fine.
  const webDist = join(import.meta.dirname, "web-dist");
  if (existsSync(join(webDist, "index.html"))) {
    app.use(express.static(webDist));
    app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(join(webDist, "index.html")));
  }

  // Centralised error handler: anything thrown in a route lands here instead of leaking a stack trace.
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.status ? err.message : "internal error" });
  });

  return app;
}
