/**
 * Apply the Slack-flavored read API (slack-api.sql) to Neon. Re-runnable.
 * Run: pnpm db:api
 */
import { config } from "dotenv";
config({ path: ".env" });

import { Pool } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — copy .env.example to .env first.");
  process.exit(1);
}

const sql = readFileSync(new URL("./slack-api.sql", import.meta.url), "utf8");

const pool = new Pool({ connectionString: url });
try {
  // Simple-query protocol runs all statements in the file (incl. $$ bodies).
  await pool.query(sql);
  console.log("Slack API layer (schema `slack`) applied ✅");
} finally {
  await pool.end();
}
