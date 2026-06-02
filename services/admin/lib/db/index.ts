import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

// A single pooled client reused across requests (Neon pooler endpoint).
const globalForDb = globalThis as unknown as {
  _pg?: ReturnType<typeof postgres>;
};

const client =
  url != null
    ? (globalForDb._pg ??= postgres(url, { ssl: "require", max: 5 }))
    : null;

export const db = client ? drizzle(client, { schema }) : null;
export { schema };
