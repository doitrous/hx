// Thin client for the TypeSafe "System One" API. Behind a small `{ ask }` interface so tests
// can inject a fake instead of hitting the real network.
// Uses node:https with a keep-alive agent rather than fetch: measured 434 ms vs 935 ms after a
// 7 s pause and 1.0 s vs 4.6 s after 20 s, because fetch kept re-doing the TLS handshake.
import https from "node:https";

const ENDPOINT = new URL("https://api.typesafe.ai/v1/systemone");
const MAX_RETRIES = 3;
const agent = new https.Agent({ keepAlive: true, keepAliveMsecs: 15_000, maxSockets: 8 });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function post(apiKey, payload) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      ENDPOINT,
      {
        method: "POST",
        agent,
        timeout: 20_000,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let body = {};
          try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch {}
          resolve({ status: res.statusCode, body });
        });
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("TypeSafe request timed out")));
    req.on("error", reject);
    req.end(payload);
  });
}

export function createJevClient(apiKey) {
  return {
    async ask({ state, questions }) {
      const payload = JSON.stringify({ model: "jev-latest", state, questions });
      for (let attempt = 0; ; attempt++) {
        let res;
        try {
          res = await post(apiKey, payload);
        } catch (err) {
          // A kept-alive socket the server already closed fails instantly; one retry gets a fresh one.
          if (attempt >= MAX_RETRIES) throw err;
          continue;
        }
        if (res.status === 429 || res.status === 529) {
          if (attempt >= MAX_RETRIES) throw Object.assign(new Error(`TypeSafe HTTP ${res.status} after ${MAX_RETRIES} retries`), { status: res.status });
          await sleep(2 ** attempt * 250);
          continue;
        }
        if (res.status < 200 || res.status >= 300) throw Object.assign(new Error(res.body?.error?.message || res.body?.message || `TypeSafe HTTP ${res.status}`), { status: res.status });
        return res.body;
      }
    },
    // Opens the TLS connection before the doctor's first sentence lands.
    warm() { post(apiKey, "{}").catch(() => {}); },
  };
}
