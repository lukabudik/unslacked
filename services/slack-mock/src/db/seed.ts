/**
 * Seed Neon with the fixture workspace. Run: pnpm db:seed
 * Requires DATABASE_URL and an applied schema (pnpm db:push or db:migrate).
 */
import { config } from "dotenv";
config({ path: ".env" });

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import * as fx from "./fixtures";
import { parseMentions } from "../lib/mentions";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — nothing to seed. Copy .env.example to .env first.");
  process.exit(1);
}

const db = drizzle(neon(url), { schema });
const BASE_MS = Date.UTC(2026, 5, 2, 8, 30, 0);
const ts = (minute: number) => new Date(BASE_MS + minute * 60_000);

async function main() {
  console.log("Clearing existing rows…");
  // delete in FK-safe order
  await db.delete(schema.reactions);
  await db.delete(schema.mentions);
  await db.delete(schema.routingEvents);
  await db.delete(schema.routerScores);
  await db.delete(schema.messages);
  await db.delete(schema.channelMembers);
  await db.delete(schema.channels);
  await db.delete(schema.users);

  console.log(`Inserting ${fx.users.length} users…`);
  await db.insert(schema.users).values(
    fx.users.map((u) => ({
      id: u.id,
      name: u.name,
      realName: u.realName,
      email: u.email || null,
      title: u.title,
      department: u.department,
      avatarColor: u.avatarColor,
      isBot: Boolean(u.isBot),
    })),
  );

  console.log(`Inserting ${fx.channels.length} channels…`);
  await db.insert(schema.channels).values(
    fx.channels.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      topic: c.topic ?? null,
      purpose: c.purpose ?? null,
      createdBy: c.createdBy ?? null,
    })),
  );

  const memberRows = fx.channels.flatMap((c) =>
    c.members.map((userId) => ({ channelId: c.id, userId })),
  );
  console.log(`Inserting ${memberRows.length} channel memberships…`);
  await db.insert(schema.channelMembers).values(memberRows);

  console.log(`Inserting ${fx.messages.length} messages…`);
  await db.insert(schema.messages).values(
    fx.messages.map((m) => ({
      id: m.id,
      channelId: m.channelId,
      userId: m.userId,
      text: m.text,
      threadTs: m.threadTs ?? null,
      ts: ts(m.minute),
    })),
  );

  const mentionRows = fx.messages.flatMap((m) =>
    parseMentions(m.text).map((uid) => ({
      id: `${m.id}:${uid}`,
      messageId: m.id,
      mentionedUserId: uid,
    })),
  );
  console.log(`Inserting ${mentionRows.length} mentions…`);
  if (mentionRows.length) await db.insert(schema.mentions).values(mentionRows);

  console.log("Done ✅");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
