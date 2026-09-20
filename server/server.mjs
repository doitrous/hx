// Entry point: run migrations, then listen. `node server.mjs` (Dockerfile CMD, or `npm start`).
import { config } from "./config.mjs";
import { createPool } from "./db.mjs";
import { migrate } from "./migrate.mjs";
import { loadBundles } from "./bundles.mjs";
import { createJevClient } from "./jev.mjs";
import { createApp } from "./app.mjs";

// Demo-only deploys run without a database at all.
const pool = config.accountsEnabled ? createPool() : null;
if (pool) await migrate(pool);

const bundles = loadBundles();
const jev = createJevClient(config.typesafeApiKey);
const app = createApp({ pool, bundles, jev });

if (!config.typesafeApiKey) console.warn("TYPESAFE_API_KEY is not set: /api/analyze and /api/demo/analyze will return 503");

app.listen(config.port, () => console.log(`history-checker on :${config.port} (${bundles.bundles.length} bundles, ${config.nodeEnv}, accounts ${config.accountsEnabled ? "on" : "off"})`));
