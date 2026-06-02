"use client";

import { useEffect, useMemo, useState } from "react";

interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  is_bot: boolean;
  profile: { title?: string; department?: string; avatar_color?: string };
}
interface SlackChannel {
  id: string;
  name: string;
  is_im: boolean;
  is_private: boolean;
  topic: { value: string };
  num_members: number;
}
interface SlackMessage {
  ts: string;
  user: string;
  text: string;
  thread_ts?: string;
  channel: string;
}

const api = async <T,>(path: string): Promise<T> =>
  fetch(`/api/slack/${path}`).then((r) => r.json());

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Home() {
  const [users, setUsers] = useState<SlackUser[]>([]);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<SlackMessage[]>([]);

  const userMap = useMemo(() => {
    const m: Record<string, SlackUser> = {};
    for (const u of users) m[u.id] = u;
    return m;
  }, [users]);

  useEffect(() => {
    api<{ members: SlackUser[] }>("users.list").then((d) => setUsers(d.members ?? []));
    api<{ channels: SlackChannel[] }>("conversations.list").then((d) => {
      setChannels(d.channels ?? []);
      if (d.channels?.length) setActive(d.channels[0].id);
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    (async () => {
      const hist = await api<{ messages: SlackMessage[] }>(`conversations.history?channel=${active}`);
      const top = hist.messages ?? [];
      // pull replies for each top-level message so threads render inline
      const withReplies = await Promise.all(
        top.map(async (m) => {
          const r = await api<{ messages: SlackMessage[] }>(
            `conversations.replies?channel=${active}&ts=${m.ts ? encodeURIComponent(m.ts) : ""}`,
          );
          return r.messages ?? [m];
        }),
      );
      setMessages(withReplies.flat());
    })();
  }, [active]);

  const renderText = (text: string) =>
    text.split(/(<@[A-Z0-9_]+>)/g).map((part, i) => {
      const match = part.match(/^<@([A-Z0-9_]+)>$/);
      if (match) {
        const u = userMap[match[1]];
        return (
          <span key={i} className="rounded bg-blue-100 px-1 font-medium text-blue-700">
            @{u?.name ?? match[1]}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });

  const channelList = channels.filter((c) => !c.is_im);
  const dmList = channels.filter((c) => c.is_im);
  const activeChannel = channels.find((c) => c.id === active);

  return (
    <div className="flex h-screen overflow-hidden text-sm">
      {/* Sidebar */}
      <aside
        className="flex w-64 flex-col text-purple-100"
        style={{ backgroundColor: "var(--aubergine)" }}
      >
        <div
          className="flex h-14 items-center border-b border-white/10 px-4 text-base font-bold text-white"
          style={{ backgroundColor: "var(--aubergine-dark)" }}
        >
          Nimbus Logistics
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <Section title="Channels" />
          {channelList.map((c) => (
            <SidebarItem
              key={c.id}
              active={c.id === active}
              onClick={() => setActive(c.id)}
              label={`# ${c.name}`}
            />
          ))}
          <Section title="Direct messages" />
          {dmList.map((c) => (
            <SidebarItem
              key={c.id}
              active={c.id === active}
              onClick={() => setActive(c.id)}
              label={c.name}
            />
          ))}
        </div>
        <div className="border-t border-white/10 px-4 py-2 text-xs text-purple-300">
          {users.length} members · mock workspace
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col bg-white">
        <header className="flex h-14 items-center border-b px-5">
          <div>
            <div className="font-bold">
              {activeChannel?.is_im ? activeChannel.name : `# ${activeChannel?.name ?? ""}`}
            </div>
            {activeChannel?.topic?.value && (
              <div className="text-xs text-gray-500">{activeChannel.topic.value}</div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.map((m, i) => {
            const u = userMap[m.user];
            const isReply = Boolean(m.thread_ts) && m.thread_ts !== m.ts;
            return (
              <div key={`${m.ts}-${i}`} className={`mb-4 flex gap-3 ${isReply ? "ml-10" : ""}`}>
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-xs font-bold text-white"
                  style={{ backgroundColor: u?.profile?.avatar_color ?? "#4a154b" }}
                >
                  {initials(u?.real_name ?? m.user)}
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold">{u?.real_name ?? m.user}</span>
                    {u?.profile?.title && (
                      <span className="text-xs text-gray-400">{u.profile.title}</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-gray-800">{renderText(m.text)}</div>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <div className="mt-10 text-center text-gray-400">No messages yet.</div>
          )}
        </div>

        <div className="border-t px-5 py-3">
          <div className="rounded-lg border px-3 py-2 text-gray-400">
            Message {activeChannel?.is_im ? activeChannel.name : `#${activeChannel?.name ?? ""}`}
            <span className="ml-2 text-xs">(read-only mock — wire up posting next)</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <div className="mt-3 mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-purple-300">
      {title}
    </div>
  );
}

function SidebarItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full truncate rounded px-2 py-1 text-left ${
        active ? "bg-white/20 text-white" : "hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}
