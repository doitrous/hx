// In-memory fixed-window rate limiter, per IP. Good enough for a single-process demo endpoint.
// ponytail: global Map, one process — swap for a shared store (Redis) if this ever runs multi-instance.
export function rateLimiter({ windowMs, max }) {
  const hits = new Map(); // ip -> { count, resetAt }

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k); // keep the map from growing forever
    let entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }
    entry.count++;
    if (entry.count > max) {
      return res.status(429).json({ error: "too many requests, try again later" });
    }
    next();
  };
}
