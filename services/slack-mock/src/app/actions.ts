"use server";

import { revalidatePath } from "next/cache";
import { addMessage, toggleReaction } from "@unslacked/db";
import { VIEWER_ID } from "@/lib/viewer";

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
