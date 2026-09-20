// Local trial server: static files + a proxy that keeps the TypeSafe key off the page.
// Run: node --env-file-if-exists=.env server.mjs
import http from "node:http";
import { readFile } from "node:fs/promises";

const KEY = process.env.TYPESAFE_API_KEY;
const PORT = process.env.PORT || 4810;
const FILES = { "/": ["index.html", "text/html"], "/bundles.js": ["bundles.js", "text/javascript"], "/logic.js": ["logic.js", "text/javascript"] };

// Mock used only when no key is set, so the page can be tried. Naive keyword match:
// it cannot tell "denies vomiting" or "father is diabetic" from the real thing. That gap is Jev's job.
const STOP = new Set("patient patients themself note documents regarding presenting complaint whether their there which about absence including adult female anywhere examination describes history review systemic".split(" "));
export const mockNoul = (state, instructions) => {
  const text = state.toLowerCase();
  const words = (String(instructions).toLowerCase().match(/[a-z]{5,}/g) || []).filter((w) => !STOP.has(w));
  return words.some((w) => text.includes(w.replace(/(ing|es|s)$/, ""))) ? 0.95 : 0.03;
};

async function ask({ state, questions }) {
  if (!KEY) {
    const answers = Object.fromEntries(Object.entries(questions).map(([id, q]) => [id, { type: "noul", noul: mockNoul(state, q.instructions) }]));
    return { answers, usage: { input_tokens: 0, output_tokens: 0 } };
  }
  const r = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "jev-latest", state, questions }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(body?.error?.message || body?.message || `TypeSafe HTTP ${r.status}`), { status: r.status });
  return body;
}

const send = (res, code, type, body) => res.writeHead(code, { "Content-Type": type }).end(body);

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/api/mode") return send(res, 200, "application/json", JSON.stringify({ mock: !KEY }));
    if (req.method === "GET" && FILES[req.url]) {
      const [file, type] = FILES[req.url];
      return send(res, 200, type, await readFile(new URL(file, import.meta.url)));
    }
    if (req.method === "POST" && req.url === "/api/check") {
      let raw = "";
      for await (const chunk of req) { raw += chunk; if (raw.length > 1e6) return send(res, 413, "application/json", '{"error":"too large"}'); }
      const { state, questions } = JSON.parse(raw);
      if (typeof state !== "string" || !questions || typeof questions !== "object") return send(res, 400, "application/json", '{"error":"need state and questions"}');
      return send(res, 200, "application/json", JSON.stringify(await ask({ state, questions })));
    }
    send(res, 404, "text/plain", "not found");
  } catch (e) {
    send(res, e.status || 500, "application/json", JSON.stringify({ error: e.message }));
  }
});

if (process.argv[1] === new URL(import.meta.url).pathname) {
  // 127.0.0.1 only: this proxy spends your API credit, so it must not be reachable from the network.
  server.listen(PORT, "127.0.0.1", () => console.log(`History checker on http://localhost:${PORT}  (${KEY ? "Jev" : "MOCK mode: set TYPESAFE_API_KEY in .env"})`));
}
