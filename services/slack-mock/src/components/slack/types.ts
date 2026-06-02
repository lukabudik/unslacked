import type { StoreUser, StoreChannel, StoreMessage, ReactionGroup } from "@unslacked/db";

export type { StoreUser, StoreChannel, StoreMessage, ReactionGroup };

export type UserMap = Record<string, StoreUser>;

/** Lightweight shape passed to the client sidebar (no functions, serializable). */
export interface SidebarChannel {
  id: string;
  name: string;
  kind: string;
  isArchived: boolean;
  /** display label already resolved (DM -> other member name, etc.) */
  label: string;
  /** for DMs: the other user's presence info */
  dm?: {
    statusEmoji: string | null;
    isBot: boolean;
    /** deterministic "online" flag just for visual flavor */
    online: boolean;
  };
}
