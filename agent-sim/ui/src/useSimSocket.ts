import { useCallback, useEffect, useReducer, useRef } from "react";
import type {
  AgentStatus,
  Channel,
  ConnStatus,
  Message,
  SimConfig,
  User,
  WsEvent,
} from "./types";

const DEFAULT_WS = "ws://localhost:8787";

export function resolveWsUrl(): string {
  try {
    const q = new URLSearchParams(window.location.search).get("ws");
    if (q) return q;
  } catch {
    /* ignore */
  }
  return DEFAULT_WS;
}

export interface AgentState {
  status: AgentStatus;
  note?: string;
  /** epoch ms of last status change — used to fade stale activity */
  changedAt: number;
}

export const ALL_ACTIVITY = "__all__";

export interface SimState {
  conn: ConnStatus;
  users: Record<string, User>;
  channels: Record<string, Channel>;
  channelOrder: string[]; // insertion order, stable
  messagesByChannel: Record<string, Message[]>;
  allMessages: Message[]; // firehose, interleaved
  agents: Record<string, AgentState>;
  unread: Record<string, number>; // channelId -> count since last focused
  tick: number;
  simClock: string;
  config: SimConfig;
  done: boolean;
  messageCount: number;
  /** which channel is focused; ALL_ACTIVITY for firehose */
  focus: string;
}

type Action =
  | { type: "conn"; conn: ConnStatus }
  | { type: "event"; event: WsEvent }
  | { type: "focus"; channelId: string };

const MAX_PER_CHANNEL = 500;
const MAX_FIREHOSE = 1000;

function initialState(): SimState {
  return {
    conn: "connecting",
    users: {},
    channels: {},
    channelOrder: [],
    messagesByChannel: {},
    allMessages: [],
    agents: {},
    unread: {},
    tick: 0,
    simClock: "",
    config: {},
    done: false,
    messageCount: 0,
    focus: ALL_ACTIVITY,
  };
}

function addChannel(state: SimState, ch: Channel): SimState {
  if (state.channels[ch.id]) {
    return { ...state, channels: { ...state.channels, [ch.id]: ch } };
  }
  return {
    ...state,
    channels: { ...state.channels, [ch.id]: ch },
    channelOrder: [...state.channelOrder, ch.id],
    messagesByChannel: { ...state.messagesByChannel, [ch.id]: [] },
    unread: { ...state.unread, [ch.id]: 0 },
  };
}

function cap<T>(arr: T[], max: number): T[] {
  return arr.length > max ? arr.slice(arr.length - max) : arr;
}

function reducer(state: SimState, action: Action): SimState {
  switch (action.type) {
    case "conn":
      return { ...state, conn: action.conn };

    case "focus": {
      return {
        ...state,
        focus: action.channelId,
        unread: { ...state.unread, [action.channelId]: 0 },
      };
    }

    case "event": {
      const ev = action.event;
      switch (ev.t) {
        case "init": {
          let next: SimState = {
            ...state,
            users: Object.fromEntries(ev.users.map((u) => [u.id, u])),
            config: ev.config ?? {},
            done: false,
          };
          for (const ch of ev.channels) next = addChannel(next, ch);
          return next;
        }

        case "channel":
          return addChannel(state, ev.channel);

        case "message": {
          const m = ev.message;
          // Auto-register channel if we somehow haven't seen it.
          let base = state;
          if (!base.channels[m.channelId]) {
            base = addChannel(base, {
              id: m.channelId,
              name: m.channelId,
              kind: "channel",
              members: [],
            });
          }
          const prev = base.messagesByChannel[m.channelId] ?? [];
          // ignore duplicates (e.g. a second socket / reconnect re-delivering)
          if (prev.some((x) => x.id === m.id)) return state;
          const isFocused =
            base.focus === m.channelId || base.focus === ALL_ACTIVITY;
          return {
            ...base,
            messagesByChannel: {
              ...base.messagesByChannel,
              [m.channelId]: cap([...prev, m], MAX_PER_CHANNEL),
            },
            allMessages: cap([...base.allMessages, m], MAX_FIREHOSE),
            messageCount: base.messageCount + 1,
            unread: isFocused
              ? base.unread
              : {
                  ...base.unread,
                  [m.channelId]: (base.unread[m.channelId] ?? 0) + 1,
                },
          };
        }

        case "agent":
          return {
            ...state,
            agents: {
              ...state.agents,
              [ev.userId]: {
                status: ev.status,
                note: ev.note,
                changedAt: Date.now(),
              },
            },
          };

        case "tick":
          return { ...state, tick: ev.n, simClock: ev.simClock };

        case "done":
          return { ...state, done: true };

        default:
          return state;
      }
    }

    default:
      return state;
  }
}

export function useSimSocket(url: string) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUser = useRef(false);

  const connect = useCallback(() => {
    closedByUser.current = false;
    dispatch({
      type: "conn",
      conn: retryRef.current === 0 ? "connecting" : "reconnecting",
    });

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0;
      dispatch({ type: "conn", conn: "open" });
    };

    ws.onmessage = (e) => {
      let ev: WsEvent;
      try {
        ev = JSON.parse(e.data);
      } catch {
        return;
      }
      if (ev && typeof ev.t === "string") dispatch({ type: "event", event: ev });
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (closedByUser.current) {
        dispatch({ type: "conn", conn: "closed" });
        return;
      }
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose will follow and handle reconnect.
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    };

    function scheduleReconnect() {
      dispatch({ type: "conn", conn: "reconnecting" });
      const delay = Math.min(1000 * 2 ** retryRef.current, 10000);
      retryRef.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => connect(), delay);
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      closedByUser.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const setFocus = useCallback((channelId: string) => {
    dispatch({ type: "focus", channelId });
  }, []);

  return { state, setFocus };
}
