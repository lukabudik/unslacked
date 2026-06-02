"use server";

import { revalidatePath } from "next/cache";
import {
  addMessage,
  toggleReaction,
  getChannelTimeline,
  ensureDm,
  listChannels,
  parseMentions,
  type TimelinePage,
} from "@unslacked/db";
import { VIEWER_ID, ASSISTANT_BOT_ID } from "@/lib/viewer";
import { whoToContact, checkRouting, type RoutingVerdict } from "@/lib/assistant";

/**
 * Server actions the UI binds to <form action={...}>. They post as the current
 * viewer (VIEWER_ID), write through the store, and revalidate the channel so
 * the new message/reaction shows up without client-side fetching.
 */

export async function sendMessage(formData: FormData): Promise<void> {
  const channelId = String(formData.get("channelId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const threadParam = formData.get("threadTs");
  const threadTs = threadParam ? String(threadParam) : null;

  if (!channelId || !text) return;

  await addMessage({ channelId, userId: VIEWER_ID, text, threadTs });
  revalidatePath(`/c/${channelId}`);
}

export async function toggleReactionAction(formData: FormData): Promise<void> {
  const channelId = String(formData.get("channelId") ?? "");
  const messageId = String(formData.get("messageId") ?? "");
  const emoji = String(formData.get("emoji") ?? "");

  if (!channelId || !messageId || !emoji) return;

  await toggleReaction(messageId, VIEWER_ID, emoji);
  revalidatePath(`/c/${channelId}`);
}

/**
 * Fetch the page of top-level messages immediately older than `beforeIso`, for
 * scroll-up pagination. Returns a fully serializable TimelinePage.
 */
export async function loadOlderMessages(channelId: string, beforeIso: string): Promise<TimelinePage> {
  if (!channelId || !beforeIso) {
    return { messages: [], reactions: {}, threads: {}, hasMore: false };
  }
  return getChannelTimeline(channelId, { before: beforeIso });
}

// ── Assistant ────────────────────────────────────────────────────────────────

/** Find-or-create the viewer ↔ assistant-bot DM; returns its channel id. */
export async function getAssistantDmId(): Promise<string> {
  return ensureDm([VIEWER_ID, ASSISTANT_BOT_ID]);
}

/** Feature 1: post the viewer's question to the assistant DM and the bot reply. */
export async function askAssistant(channelId: string, text: string): Promise<void> {
  const q = text.trim();
  if (!channelId || !q) return;
  await addMessage({ channelId, userId: VIEWER_ID, text: q });
  const answer = await whoToContact(q, VIEWER_ID);
  await addMessage({ channelId, userId: ASSISTANT_BOT_ID, text: answer.answer });
  revalidatePath(`/c/${channelId}`);
}

/**
 * Feature 2: post the viewer's message, then return whether it was mis-routed
 * (so the UI can show a "send to the right person" nudge). The message is still
 * sent — the nudge offers to ALSO reach the correct owner.
 */
export async function postAndCheckRouting(
  channelId: string,
  text: string,
  threadTs?: string | null,
): Promise<RoutingVerdict> {
  const t = text.trim();
  if (!channelId || !t) return { misrouted: false };

  await addMessage({ channelId, userId: VIEWER_ID, text: t, threadTs: threadTs ?? null });
  revalidatePath(`/c/${channelId}`);

  // recipients: DM counterpart(s), or the people @-mentioned in a channel
  const channel = (await listChannels()).find((c) => c.id === channelId);
  const recipientIds =
    channel && (channel.kind === "im" || channel.kind === "mpim")
      ? channel.members.filter((m) => m !== VIEWER_ID && m !== ASSISTANT_BOT_ID)
      : parseMentions(t);

  if (!recipientIds.length) return { misrouted: false };
  return checkRouting({ text: t, authorId: VIEWER_ID, recipientIds, channelId });
}

/** Feature 2 button: forward the text to the correct owner's DM. Returns the DM id. */
export async function forwardToOwner(ownerId: string, text: string): Promise<string> {
  const dmId = await ensureDm([VIEWER_ID, ownerId]);
  await addMessage({ channelId: dmId, userId: VIEWER_ID, text: text.trim() });
  revalidatePath(`/c/${dmId}`);
  return dmId;
}
