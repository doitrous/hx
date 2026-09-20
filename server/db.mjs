// One pg Pool for the process. No ORM: parameterised SQL only, called directly from route modules.
import pg from "pg";
import { config } from "./config.mjs";

const { Pool } = pg;

export function createPool(connectionString = config.databaseUrl) {
  // sslmode=require in the URL (managed Postgres) needs rejectUnauthorized:false for self-signed chains; plain local dev has no ssl.
  const ssl = /sslmode=require/.test(connectionString) ? { rejectUnauthorized: false } : false;
  return new Pool({ connectionString, ssl });
}
