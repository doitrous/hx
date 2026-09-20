// Env config in one place. No secrets file is read; TYPESAFE_API_KEY comes from the shell env.
export const config = {
  port: Number(process.env.PORT) || 4820,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "postgres://history_checker:dev_password@localhost:5433/history_checker",
  typesafeApiKey: process.env.TYPESAFE_API_KEY || "",
  // Public demo guards. One typed note fires about 20 analyses and a hospital shares one IP address,
  // so the per-IP limit is generous and the real protection is the daily token budget for the whole demo.
  demoMaxPerWindow: Number(process.env.DEMO_MAX_PER_10_MIN) || 600,
  // No single address may spend more than this per day. At 0.042 USD per million tokens, 0.006 USD is
  // about 143,000 tokens: one to two fully typed notes, or around twelve pasted ones.
  demoIpDailyTokens: Math.round(((Number(process.env.DEMO_IP_DAILY_USD) || 0.006) / 0.042) * 1_000_000),
  demoDailyTokens: Math.round(((Number(process.env.DEMO_DAILY_USD) || 3) / 0.042) * 1_000_000), // whole demo, about 71 million tokens
  // Accounts and patient records. Off in production until explicitly enabled, so a demo-only deploy
  // exposes no login, stores nothing and needs no database.
  accountsEnabled: process.env.ACCOUNTS_ENABLED ? process.env.ACCOUNTS_ENABLED === "1" : (process.env.NODE_ENV || "development") !== "production",
  gaMeasurementId: /^G-[A-Z0-9]+$/.test(process.env.GA_MEASUREMENT_ID || "") ? process.env.GA_MEASUREMENT_ID : "",
  sessionDays: Number(process.env.SESSION_DAYS) || 30,
};

export const isProduction = config.nodeEnv === "production";
