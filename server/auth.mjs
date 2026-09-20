// Signup/login/logout/me, scrypt password hashing, and the session-cookie middleware.
import { Router } from "express";
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { isProduction, config } from "./config.mjs";

const scrypt = promisify(scryptCb);
const KEYLEN = 64;
const COOKIE_NAME = "session";

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEYLEN);
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const derived = await scrypt(password, salt, KEYLEN);
  const expected = Buffer.from(hex, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

function setSessionCookie(res, token, expiresAt) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    expires: expiresAt,
    path: "/",
  });
}

async function createSession(pool, doctorId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000);
  await pool.query("INSERT INTO sessions (token_hash, doctor_id, expires_at) VALUES ($1, $2, $3)", [
    hashToken(token),
    doctorId,
    expiresAt,
  ]);
  return { token, expiresAt };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Attaches req.doctor when a valid, unexpired session cookie is present. Never rejects by itself:
// routes that require auth check req.doctor and respond 401.
export function sessionMiddleware(pool) {
  return async (req, res, next) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return next();
    const { rows } = await pool.query(
      `SELECT d.id, d.email, d.name FROM sessions s
       JOIN doctors d ON d.id = s.doctor_id
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [hashToken(token)]
    );
    if (rows[0]) req.doctor = rows[0];
    next();
  };
}

export function requireAuth(req, res, next) {
  if (!req.doctor) return res.status(401).json({ error: "not logged in" });
  next();
}

export function authRouter(pool) {
  const router = Router();

  router.post("/signup", async (req, res) => {
    const { email, password, name } = req.body || {};
    if (typeof email !== "string" || !EMAIL_RE.test(email)) return res.status(400).json({ error: "valid email required" });
    if (typeof password !== "string" || password.length < 8) return res.status(400).json({ error: "password must be at least 8 characters" });
    if (typeof name !== "string" || !name.trim()) return res.status(400).json({ error: "name required" });
    const existing = await pool.query("SELECT id FROM doctors WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows[0]) return res.status(409).json({ error: "an account with that email already exists" });
    const passwordHash = await hashPassword(password);
    const { rows } = await pool.query(
      "INSERT INTO doctors (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name",
      [email.toLowerCase(), passwordHash, name.trim()]
    );
    const { token, expiresAt } = await createSession(pool, rows[0].id);
    setSessionCookie(res, token, expiresAt);
    res.status(201).json({ id: rows[0].id, email: rows[0].email, name: rows[0].name });
  });

  router.post("/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string") return res.status(400).json({ error: "email and password required" });
    const { rows } = await pool.query("SELECT id, email, name, password_hash FROM doctors WHERE email = $1", [email.toLowerCase()]);
    const doctor = rows[0];
    if (!doctor || !(await verifyPassword(password, doctor.password_hash))) {
      return res.status(401).json({ error: "invalid email or password" });
    }
    const { token, expiresAt } = await createSession(pool, doctor.id);
    setSessionCookie(res, token, expiresAt);
    res.json({ id: doctor.id, email: doctor.email, name: doctor.name });
  });

  router.post("/logout", async (req, res) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) await pool.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.status(204).end();
  });

  return router;
}

export function meRouter() {
  const router = Router();
  router.get("/me", (req, res) => {
    if (!req.doctor) return res.status(401).json({ error: "not logged in" });
    res.json(req.doctor);
  });
  return router;
}

// Exported for tests only.
export const _internal = { hashPassword, verifyPassword, hashToken };
