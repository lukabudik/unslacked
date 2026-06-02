import { useEffect, useMemo, useRef } from "react";
import { ALL_ACTIVITY, resolveWsUrl, useSimSocket } from "./useSimSocket";
import type { Channel, ConnStatus, Message, User } from "./types";
import { fmtTime, initials, tokenizeText } from "./format";

const WS_URL = resolveWsUrl();

export function App() {
  const { state, setFocus } = useSimSocket(WS_URL);

  const usersByHandle = useMemo(() => {
    const m: Record<string, User> = {};
    for (const u of Object.values(state.users)) m[u.handle.toLowerCase()] = u;
    return m;
  }, [state.users]);

  const focusedMessages: Message[] =
    state.focus === ALL_ACTIVITY
      ? state.allMessages
      : state.messagesByChannel[state.focus] ?? [];

  const focusedChannel: Channel | undefined =
    state.focus === ALL_ACTIVITY ? undefined : state.channels[state.focus];

  const channels = state.channelOrder
    .map((id) => state.channels[id])
    .filter((c): c is Channel => !!c && c.kind === "channel");
  const dms = state.channelOrder
    .map((id) => state.channels[id])
    .filter((c): c is Channel => !!c && c.kind === "dm");

  const roster = useMemo(
    () =>
      Object.values(state.users).sort((a, b) => {
        const rank = (id: string) => {
          const s = state.agents[id]?.status;
          return s === "acting" ? 0 : s === "thinking" ? 1 : 2;
        };
        const ra = rank(a.id);
        const rb = rank(b.id);
        if (ra !== rb) return ra - rb;
        return a.team.localeCompare(b.team) || a.realName.localeCompare(b.realName);
      }),
    [state.users, state.agents],
  );

  const activeAgents = Object.values(state.agents).filter(
    (a) => a.status === "thinking" || a.status === "acting",
  ).length;

  return (
    <div className="app">
      <Header
        conn={state.conn}
        wsUrl={WS_URL}
        tick={state.tick}
        simClock={state.simClock}
        messageCount={state.messageCount}
        activeAgents={activeAgents}
        totalAgents={Object.keys(state.users).length}
        done={state.done}
      />

      <div className="body">
        <aside className="sidebar">
          <SectionTitle>Channels</SectionTitle>
          <ChannelItem
            label="All activity"
            sigil="✲"
            active={state.focus === ALL_ACTIVITY}
            count={0}
            onClick={() => setFocus(ALL_ACTIVITY)}
          />
          {channels.map((c) => (
            <ChannelItem
              key={c.id}
              label={c.name}
              sigil="#"
              active={state.focus === c.id}
              count={state.unread[c.id] ?? 0}
              onClick={() => setFocus(c.id)}
            />
          ))}

          {dms.length > 0 && <SectionTitle>Direct messages</SectionTitle>}
          {dms.map((c) => (
            <ChannelItem
              key={c.id}
              label={dmLabel(c, state.users)}
              sigil="◆"
              active={state.focus === c.id}
              count={state.unread[c.id] ?? 0}
              onClick={() => setFocus(c.id)}
            />
          ))}

          <SectionTitle>
            Agents{" "}
            <span className="muted">
              {activeAgents}/{roster.length} active
            </span>
          </SectionTitle>
          <div className="roster">
            {roster.map((u) => (
              <RosterRow
                key={u.id}
                user={u}
                status={state.agents[u.id]?.status ?? "idle"}
                note={state.agents[u.id]?.note}
              />
            ))}
          </div>
        </aside>

        <main className="main">
          <div className="channel-head">
            {state.focus === ALL_ACTIVITY ? (
              <>
                <span className="ch-sigil">✲</span>
                <span className="ch-name">All activity</span>
                <span className="muted">— firehose across every channel</span>
              </>
            ) : focusedChannel ? (
              <>
                <span className="ch-sigil">
                  {focusedChannel.kind === "dm" ? "◆" : "#"}
                </span>
                <span className="ch-name">
                  {focusedChannel.kind === "dm"
                    ? dmLabel(focusedChannel, state.users)
                    : focusedChannel.name}
                </span>
                <span className="muted">
                  {focusedChannel.members.length} members
                </span>
              </>
            ) : (
              <span className="muted">No channel</span>
            )}
          </div>

          <MessageList
            messages={focusedMessages}
            showChannel={state.focus === ALL_ACTIVITY}
            users={state.users}
            usersByHandle={usersByHandle}
            channels={state.channels}
          />
        </main>
      </div>
    </div>
  );
}

function dmLabel(c: Channel, users: Record<string, User>): string {
  const names = c.members
    .map((id) => users[id]?.realName ?? id)
    .filter(Boolean);
  return names.length ? names.join(", ") : c.name;
}

function Header(props: {
  conn: ConnStatus;
  wsUrl: string;
  tick: number;
  simClock: string;
  messageCount: number;
  activeAgents: number;
  totalAgents: number;
  done: boolean;
}) {
  return (
    <header className="header">
      <div className="brand">
        <span className="logo">unslacked</span>
        <span className="brand-sub">watch</span>
      </div>

      <div className="stats">
        <Stat label="tick" value={String(props.tick)} />
        {props.simClock && <Stat label="sim clock" value={props.simClock} />}
        <Stat label="messages" value={String(props.messageCount)} />
        <Stat
          label="active"
          value={`${props.activeAgents}/${props.totalAgents}`}
        />
      </div>

      <div className="conn">
        {props.done && <span className="badge done">run complete</span>}
        <span className={`conn-dot ${props.conn}`} />
        <span className="conn-label">{props.conn}</span>
        <span className="ws-url" title={props.wsUrl}>
          {props.wsUrl}
        </span>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="section-title">{children}</div>;
}

function ChannelItem(props: {
  label: string;
  sigil: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      className={`ch-item${props.active ? " active" : ""}`}
      onClick={props.onClick}
    >
      <span className="ch-item-sigil">{props.sigil}</span>
      <span className="ch-item-label">{props.label}</span>
      {props.count > 0 && <span className="unread">{props.count}</span>}
    </button>
  );
}

function RosterRow(props: {
  user: User;
  status: "thinking" | "acting" | "idle";
  note?: string;
}) {
  const { user, status, note } = props;
  return (
    <div className="roster-row" title={note ?? status}>
      <span className={`status-dot ${status}`} />
      <span
        className="avatar avatar-sm"
        style={{ background: user.avatarColor }}
      >
        {initials(user)}
      </span>
      <span className="roster-meta">
        <span className="roster-name">{user.realName}</span>
        <span className="roster-team">{user.team}</span>
      </span>
      {status !== "idle" && (
        <span className={`roster-status ${status}`}>
          {status === "thinking" ? "thinking" : "acting"}
        </span>
      )}
    </div>
  );
}

function MessageList(props: {
  messages: Message[];
  showChannel: boolean;
  users: Record<string, User>;
  usersByHandle: Record<string, User>;
  channels: Record<string, Channel>;
}) {
  const { messages, showChannel, users, usersByHandle, channels } = props;

  if (messages.length === 0) {
    return (
      <div className="stream empty">
        <div className="empty-state">
          <div className="empty-glyph">✲</div>
          <div>Waiting for the workspace to wake up…</div>
        </div>
      </div>
    );
  }

  return (
    <Stream count={messages.length}>
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        // Group consecutive messages by the same author in the same channel.
        const grouped =
          prev &&
          prev.userId === m.userId &&
          prev.channelId === m.channelId &&
          !showChannel;
        return (
          <MessageRow
            key={m.id}
            message={m}
            grouped={!!grouped}
            showChannel={showChannel}
            users={users}
            usersByHandle={usersByHandle}
            channels={channels}
          />
        );
      })}
    </Stream>
  );
}

function MessageRow(props: {
  message: Message;
  grouped: boolean;
  showChannel: boolean;
  users: Record<string, User>;
  usersByHandle: Record<string, User>;
  channels: Record<string, Channel>;
}) {
  const { message: m, grouped, showChannel, users, usersByHandle, channels } =
    props;
  const u = users[m.userId];
  const color = u?.avatarColor ?? "#7a7a7a";
  const name = u?.realName ?? m.userId;
  const tokens = tokenizeText(m.text, users, usersByHandle, channels);
  const ch = channels[m.channelId];

  return (
    <div className={`msg${grouped ? " grouped" : ""}`}>
      <div className="msg-gutter">
        {!grouped && (
          <span className="avatar" style={{ background: color }}>
            {u ? initials(u) : "?"}
          </span>
        )}
      </div>
      <div className="msg-body">
        {!grouped && (
          <div className="msg-head">
            <span className="msg-author" style={{ color }}>
              {name}
            </span>
            {u?.title && <span className="msg-title">{u.title}</span>}
            {showChannel && ch && (
              <span className="msg-channel">
                {ch.kind === "dm" ? "◆" : "#"}
                {ch.name}
              </span>
            )}
            <span className="msg-ts">{fmtTime(m.ts)}</span>
            {m.threadTs && <span className="msg-thread">↳ thread</span>}
          </div>
        )}
        <div className="msg-text">
          {tokens.map((t, i) => {
            if (t.type === "text") return <span key={i}>{t.value}</span>;
            if (t.type === "channel")
              return (
                <span key={i} className="pill pill-channel">
                  #{t.label}
                </span>
              );
            return (
              <span
                key={i}
                className="pill pill-mention"
                style={
                  t.color
                    ? { background: hexToRgba(t.color, 0.18), color: t.color }
                    : undefined
                }
              >
                @{t.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Container that auto-scrolls to the bottom when new messages land,
 *  unless the user has scrolled up to read history. */
function Stream({
  children,
  count,
}: {
  children: React.ReactNode;
  count: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedRef.current = dist < 80;
  };

  useEffect(() => {
    const el = ref.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [count]);

  return (
    <div className="stream" ref={ref} onScroll={onScroll}>
      {children}
      <div className="stream-end" />
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  if (isNaN(n)) return hex;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
