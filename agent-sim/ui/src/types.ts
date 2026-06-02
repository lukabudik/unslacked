// Wire types — mirror agent-sim/README.md "WS event protocol".

export interface User {
  id: string;
  handle: string;
  realName: string;
  title: string;
  team: string;
  avatarColor: string;
}

export type ChannelKind = "channel" | "dm";

export interface Channel {
  id: string;
  name: string;
  kind: ChannelKind;
  members: string[];
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  ts: string; // ISO or epoch-ish string from the engine
  text: string;
  threadTs?: string;
}

export type AgentStatus = "thinking" | "acting" | "idle";

export interface SimConfig {
  agents?: number;
  ticks?: number;
  concurrency?: number;
  [k: string]: unknown;
}

// Server → UI events
export type WsEvent =
  | { t: "init"; users: User[]; channels: Channel[]; config: SimConfig }
  | { t: "message"; message: Message }
  | { t: "channel"; channel: Channel }
  | { t: "agent"; userId: string; status: AgentStatus; note?: string }
  | { t: "tick"; n: number; simClock: string }
  | { t: "done" };

export type ConnStatus = "connecting" | "open" | "closed" | "reconnecting";
