import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Drizzle client over Neon's HTTP driver. `db` is null when DATABASE_URL is
 * unset — callers should fall back to fixtures (see src/lib/store.ts) so the
 * mock runs with zero setup.
 */
const url = process.env.DATABASE_URL;

// Raw Neon SQL executor — use for calling the `slack.*` schema functions.
// Null when DATABASE_URL is unset; callers that need it should check isDbConfigured.
export const sql = url ? neon(url) : null;

export const db = sql ? drizzle(sql, { schema }) : null;

export const isDbConfigured = Boolean(url);

export { schema };
