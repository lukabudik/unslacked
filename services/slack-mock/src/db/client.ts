import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Drizzle client over Neon's HTTP driver. `db` is null when DATABASE_URL is
 * unset — callers should fall back to fixtures (see src/lib/store.ts) so the
 * mock runs with zero setup.
 */
const url = process.env.DATABASE_URL;

export const db = url ? drizzle(neon(url), { schema }) : null;

export const isDbConfigured = Boolean(url);

export { schema };
