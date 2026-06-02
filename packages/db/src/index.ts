/**
 * @unslacked/db — single import surface for the shared data layer.
 *
 *   import { listChannels, getHistory, db, users, type StoreMessage } from "@unslacked/db";
 *
 * Holds the canonical Slack schema, the Neon client, the read/write query layer,
 * fixtures, and the mention parser. The Slack-flavored SQL read API for the
 * backend lives in ./slack-api.sql (applied with `pnpm db:api`).
 */
export * from "./schema";
export * from "./client";
export * from "./queries";
export * from "./analysis-queries";
export * from "./slack-api-queries";
export * from "./mentions";
export * as fixtures from "./fixtures";
