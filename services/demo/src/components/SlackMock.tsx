import React from "react";
import { slack } from "../lib/theme";
import { interFamily } from "../lib/fonts";
import { Avatar } from "./Avatar";
import { RichText } from "./RichText";
import { data } from "../lib/data";

const Hash = ({ c = slack.sidebarText }: { c?: string }) => (
  <span style={{ color: c, fontWeight: 500, marginRight: 8, fontSize: 17 }}>#</span>
);

export const SlackChrome: React.FC<{
  activeChannel: string;
  topic?: string;
  members?: number;
  children: React.ReactNode;
}> = ({ activeChannel, topic, members = 64, children }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        background: slack.bg,
        fontFamily: interFamily,
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <div style={{ width: 280, background: slack.sidebar, color: slack.sidebarText, display: "flex", flexDirection: "column", paddingTop: 14 }}>
        <div style={{ padding: "0 18px 14px", borderBottom: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>{data.company}</span>
          <span style={{ color: slack.sidebarText, fontSize: 13 }}>✎</span>
        </div>
        <div style={{ padding: "16px 16px 4px", fontSize: 14, opacity: 0.85 }}>Channels</div>
        {data.sidebar.channels.map((c) => {
          const active = c.name === activeChannel;
          return (
            <div
              key={c.name}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "5px 16px",
                margin: "0 8px",
                borderRadius: 6,
                background: active ? slack.sidebarActive : "transparent",
                color: active ? "#fff" : slack.sidebarText,
                fontWeight: active ? 700 : 400,
                fontSize: 16,
              }}
            >
              <span style={{ marginRight: 8, opacity: 0.8 }}>{c.private ? "🔒" : "#"}</span>
              {c.name}
            </div>
          );
        })}
        <div style={{ padding: "18px 16px 4px", fontSize: 14, opacity: 0.85 }}>Direct messages</div>
        {data.sidebar.dms.map((p) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", padding: "5px 16px", margin: "0 8px", fontSize: 16, color: slack.sidebarText }}>
            <div style={{ position: "relative", marginRight: 10 }}>
              <Avatar initials={p.initials} color={p.color} size={22} radius={5} />
              <span style={{ position: "absolute", right: -3, bottom: -3, width: 10, height: 10, borderRadius: 5, background: p.online ? slack.online : "transparent", border: p.online ? `2px solid ${slack.sidebar}` : `2px solid ${slack.sidebarText}`, boxSizing: "border-box" }} />
            </div>
            {p.name}
          </div>
        ))}
      </div>

      {/* Main column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header */}
        <div style={{ height: 64, borderBottom: `1px solid ${slack.border}`, display: "flex", alignItems: "center", padding: "0 24px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Hash c={slack.ink} />
            <span style={{ color: slack.ink, fontWeight: 800, fontSize: 20 }}>{activeChannel}</span>
            {topic && <span style={{ color: slack.inkDim, fontSize: 15, marginLeft: 18, fontWeight: 400 }}>{topic}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, color: slack.inkDim, fontSize: 15 }}>
            <span style={{ border: `1px solid ${slack.border}`, borderRadius: 8, padding: "5px 10px" }}>👥 {members}</span>
          </div>
        </div>
        {/* Body */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>{children}</div>
        {/* Composer */}
        <div style={{ padding: "8px 24px 20px" }}>
          <div style={{ border: `1px solid ${slack.border}`, borderRadius: 10, padding: "12px 14px", color: slack.inkDim, fontSize: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            Message #{activeChannel}
          </div>
        </div>
      </div>
    </div>
  );
};

export const SlackMessage: React.FC<{
  name: string;
  initials: string;
  color: string;
  text: string;
  time?: string;
  reactions?: { emoji: string; n: number }[];
  style?: React.CSSProperties;
  highlight?: boolean;
  badge?: string;
}> = ({ name, initials, color, text, time = "10:24 AM", reactions, style, highlight, badge }) => {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        padding: "8px 24px",
        background: highlight ? "rgba(74,144,217,0.08)" : "transparent",
        borderLeft: highlight ? `3px solid ${slack.link}` : "3px solid transparent",
        ...style,
      }}
    >
      <Avatar initials={initials} color={color} size={40} radius={9} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontWeight: 800, color: slack.ink, fontSize: 16.5 }}>{name}</span>
          {badge && (
            <span style={{ background: "#E8E8E8", color: "#616061", fontSize: 11, fontWeight: 700, borderRadius: 3, padding: "1px 5px" }}>{badge}</span>
          )}
          <span style={{ color: slack.inkDim, fontSize: 13 }}>{time}</span>
        </div>
        <div style={{ color: slack.ink, fontSize: 16.5, lineHeight: 1.46, marginTop: 1 }}>
          <RichText text={text} color={slack.ink} />
        </div>
        {reactions && reactions.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
            {reactions.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, background: "#F4F6F8", border: `1px solid ${slack.border}`, borderRadius: 12, padding: "1px 9px", fontSize: 14, color: slack.inkDim }}>
                <span>{r.emoji}</span>
                <span style={{ fontWeight: 700 }}>{r.n}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
