"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StoreUser } from "@unslacked/db";
import { RichText } from "./RichText";
import { displayName } from "./utils";
import { forwardToOwner } from "@/app/actions";

/**
 * Feature 2: the proactive routing nudge. Shown just above the composer when a
 * message looks mis-routed. Renders the verdict reason (with `<@U_ID>` pills),
 * offers a one-click "Send to @Owner" forward, and a dismiss. Ephemeral client
 * state owned by the composer — it mounts only while a misrouted verdict is live.
 */
export function AssistantNudge({
  ownerId,
  reason,
  lastText,
  users,
  onDismiss,
}: {
  ownerId: string;
  reason: string;
  lastText: string;
  users: Record<string, StoreUser>;
  onDismiss: () => void;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [sentDmId, setSentDmId] = useState<string | null>(null);

  const ownerName = displayName(users, ownerId);

  async function onSend() {
    if (sending) return;
    setSending(true);
    try {
      const dmId = await forwardToOwner(ownerId, lastText);
      setSentDmId(dmId);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-2 flex items-start gap-2.5 rounded-xl border border-[#e0b34a]/50 bg-[#fff8e6] px-3 py-2.5 text-[13.5px] text-[#1d1c1d] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <span className="mt-px shrink-0 text-[15px]" aria-hidden>
        ✨
      </span>

      <div className="min-w-0 flex-1">
        {sentDmId ? (
          <button
            type="button"
            onClick={() => router.push(`/c/${sentDmId}`)}
            className="font-medium text-[#007a5a] hover:underline"
          >
            ✓ Sent — open chat
          </button>
        ) : (
          <>
            <p className="leading-snug">
              <span className="font-semibold">Heads up:</span>{" "}
              <RichText text={reason} users={users} />
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <button
                type="button"
                onClick={onSend}
                disabled={sending}
                className="rounded-md bg-[#007a5a] px-2.5 py-1 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#148567] disabled:opacity-60"
              >
                {sending ? "Sending…" : `Send to @${ownerName}`}
              </button>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="-mr-1 flex size-6 shrink-0 items-center justify-center rounded-md text-[#616061] hover:bg-black/5"
      >
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M5 5l10 10M15 5 5 15" />
        </svg>
      </button>
    </div>
  );
}
