import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { slack } from "../lib/theme";
import { interFamily } from "../lib/fonts";
import { Avatar } from "../components/Avatar";
import { data } from "../lib/data";

// the real "Unslacked Assistant" identity from slack-mock: gradient pill + sparkle
const AssistantAvatar: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.22, background: "linear-gradient(135deg, #7c3aed, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5, flexShrink: 0 }}>✨</div>
);

const Mention: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: "#1264a3", background: "rgba(29,155,209,0.10)", borderRadius: 3, padding: "0 3px", fontWeight: 600 }}>@{children}</span>
);

const Cursor: React.FC<{ x: number; y: number; click: number }> = ({ x, y, click }) => (
  <div style={{ position: "absolute", left: x, top: y, zIndex: 50 }}>
    {click > 0 && <div style={{ position: "absolute", left: -18, top: -18, width: 36, height: 36, borderRadius: 18, border: `2px solid ${slack.green}`, opacity: (1 - click) * 0.9, transform: `scale(${0.4 + click * 1.1})` }} />}
    <svg width="26" height="26" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.4))" }}>
      <path d="M5 3l14 7-6 2-2 6z" fill="#fff" stroke="#1d1c1d" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  </div>
);

export const Assistant: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = data.assistant;

  const intro = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  // phase A — routing nudge while DMing the wrong person
  const draftIn = spring({ frame: frame - 20, fps, config: { damping: 20 } });
  const nudgeS = spring({ frame: frame - 52, fps, config: { damping: 15, stiffness: 120 } });
  const cx = interpolate(frame, [108, 146], [950, 396], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cy = interpolate(frame, [108, 146], [1010, 974], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const click = interpolate(frame, [146, 168], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sent = frame >= 158;
  const sentS = spring({ frame: frame - 158, fps, config: { damping: 18 } });

  // phase B — chatting with the assistant like a person
  const switchT = interpolate(frame, [206, 226], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const phaseB = switchT >= 0.5;
  const askS = spring({ frame: frame - 236, fps, config: { damping: 18 } });
  const typing = frame >= 262 && frame < 286;
  const replyS = spring({ frame: frame - 286, fps, config: { damping: 18 } });

  const activeName = phaseB ? "Unslacked Assistant" : a.dmWith.name;

  return (
    <AbsoluteFill style={{ background: slack.bg, fontFamily: interFamily, display: "flex", flexDirection: "row", opacity: intro }}>
      {/* sidebar */}
      <div style={{ width: 250, background: slack.sidebar, color: slack.sidebarText, paddingTop: 16 }}>
        <div style={{ padding: "0 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.10)", color: "#fff", fontWeight: 800, fontSize: 18 }}>{data.company}</div>
        {/* pinned assistant */}
        <div style={{ margin: "12px 8px 4px", display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", borderRadius: 6, background: phaseB ? slack.sidebarActive : "transparent", color: phaseB ? "#fff" : slack.sidebarText, fontWeight: phaseB ? 700 : 600, fontSize: 15 }}>
          <span style={{ width: 20, height: 20, borderRadius: 5, background: "linear-gradient(135deg, #7c3aed, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✨</span>
          Unslacked Assistant
        </div>
        <div style={{ padding: "12px 16px 6px", fontSize: 13, opacity: 0.8 }}>Direct messages</div>
        {[a.dmWith, a.owner, { name: "Sofia Petrov", initials: "SP", color: "#1ABC9C" }].map((p: any, i) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 16px", margin: "0 8px", borderRadius: 6, fontSize: 15, background: !phaseB && i === 0 ? slack.sidebarActive : "transparent", color: !phaseB && i === 0 ? "#fff" : slack.sidebarText }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: slack.online }} /> {p.name}
          </div>
        ))}
      </div>

      {/* main DM column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
        {/* header */}
        <div style={{ height: 60, borderBottom: `1px solid ${slack.border}`, display: "flex", alignItems: "center", gap: 12, padding: "0 24px" }}>
          {phaseB ? <AssistantAvatar size={32} /> : <Avatar initials={a.dmWith.initials} color={a.dmWith.color} size={32} radius={7} />}
          <span style={{ color: slack.ink, fontWeight: 800, fontSize: 19 }}>{phaseB ? "Unslacked Assistant" : a.dmWith.name}</span>
          {phaseB ? (
            <span style={{ background: "#E8E8E8", color: "#616061", fontSize: 11, fontWeight: 800, borderRadius: 3, padding: "1px 6px", textTransform: "uppercase" }}>App</span>
          ) : (
            <span style={{ color: slack.inkDim, fontSize: 14 }}>{a.dmWith.title}</span>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* PHASE A — message body */}
        {switchT < 1 && (
          <div style={{ opacity: 1 - switchT, position: switchT > 0 ? "absolute" : "relative", bottom: switchT > 0 ? 96 : undefined, left: 0, right: 0 }}>
            <div style={{ padding: "0 24px", opacity: draftIn, transform: `translateY(${(1 - draftIn) * 12}px)`, display: "flex", gap: 12, marginBottom: 16 }}>
              <Avatar initials="ON" color="#4a154b" size={40} radius={9} />
              <div>
                <div style={{ color: slack.ink, fontWeight: 800, fontSize: 15.5 }}>You <span style={{ color: slack.inkDim, fontWeight: 400, fontSize: 12.5 }}>now</span></div>
                <div style={{ color: slack.ink, fontSize: 16.5, lineHeight: 1.45, marginTop: 2 }}>{a.draft}</div>
              </div>
            </div>
            {/* AssistantNudge — cream card above composer */}
            <div style={{ padding: "0 24px" }}>
              <div style={{ opacity: nudgeS, transform: `translateY(${(1 - nudgeS) * 12}px)`, display: "flex", alignItems: "flex-start", gap: 11, borderRadius: 12, border: "1px solid rgba(224,179,74,0.5)", background: "#fff8e6", padding: "12px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <span style={{ fontSize: 17, marginTop: 1 }}>✨</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: slack.ink, fontSize: 16.5, lineHeight: 1.45 }}>
                    <b>Heads up:</b> {a.topic} is owned by <Mention>{a.owner.name}</Mention> ({a.owner.title}), not <Mention>{a.dmWith.name}</Mention>.
                  </div>
                  <div style={{ marginTop: 10 }}>
                    {!sent ? (
                      <span style={{ background: slack.green, color: "#fff", borderRadius: 7, padding: "8px 14px", fontWeight: 700, fontSize: 14.5, transform: `scale(${1 + click * 0.06})`, display: "inline-block" }}>Send to @{a.owner.name.split(" ")[0]}</span>
                    ) : (
                      <span style={{ color: slack.green, fontWeight: 600, fontSize: 15, opacity: sentS }}>✓ Sent — straight to {a.owner.name.split(" ")[0]}, the real owner.</span>
                    )}
                  </div>
                </div>
                <span style={{ color: slack.inkDim, fontSize: 16 }}>✕</span>
              </div>
            </div>
          </div>
        )}

        {/* PHASE B — chatting with the assistant */}
        {switchT > 0 && (
          <div style={{ opacity: switchT, padding: "0 24px" }}>
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16, opacity: askS, transform: `translateY(${(1 - askS) * 10}px)` }}>
              <div style={{ display: "flex", gap: 12 }}>
                <Avatar initials="ON" color="#4a154b" size={40} radius={9} />
                <div>
                  <div style={{ color: slack.ink, fontWeight: 800, fontSize: 15.5 }}>You</div>
                  <div style={{ color: slack.ink, fontSize: 16.5, marginTop: 2 }}>{a.bot.q}</div>
                </div>
              </div>
            </div>
            {(typing || replyS > 0) && (
              <div style={{ display: "flex", gap: 12 }}>
                <AssistantAvatar size={40} />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: slack.ink, fontWeight: 800, fontSize: 15.5 }}>Unslacked Assistant</span>
                    <span style={{ background: "#E8E8E8", color: "#616061", fontSize: 10.5, fontWeight: 800, borderRadius: 3, padding: "1px 5px", textTransform: "uppercase" }}>App</span>
                  </div>
                  {typing ? (
                    <div style={{ display: "inline-flex", gap: 5, background: "#F4F6F8", borderRadius: 12, padding: "12px 16px", marginTop: 4 }}>
                      {[0, 1, 2].map((i) => (
                        <span key={i} style={{ width: 7, height: 7, borderRadius: 4, background: slack.inkDim, opacity: 0.4 + 0.6 * Math.abs(Math.sin((frame - 262) / 4 + i)) }} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ opacity: replyS, transform: `translateY(${(1 - replyS) * 8}px)` }}>
                      <div style={{ color: slack.ink, fontSize: 16.5, lineHeight: 1.45, marginTop: 2 }}>
                        For <b>courier payouts</b>, talk to <Mention>{a.bot.owner.name}</Mention> — {a.bot.owner.title}.
                      </div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginTop: 10, padding: "8px 12px", border: `1px solid ${slack.border}`, borderRadius: 10 }}>
                        <Avatar initials={a.bot.owner.initials} color={a.bot.owner.color} size={30} radius={7} />
                        <div>
                          <div style={{ color: slack.ink, fontWeight: 700, fontSize: 14.5 }}>{a.bot.owner.name}</div>
                          <div style={{ color: slack.inkDim, fontSize: 12.5 }}>Owns courier payouts · {a.bot.owner.team}</div>
                        </div>
                        <span style={{ background: slack.green, color: "#fff", borderRadius: 7, padding: "6px 12px", fontWeight: 700, fontSize: 13.5, marginLeft: 6 }}>Message</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* composer */}
        <div style={{ padding: "16px 24px 16px" }}>
          <div style={{ border: `1px solid ${slack.border}`, borderRadius: 10, padding: "12px 14px", color: slack.inkDim, fontSize: 15.5 }}>
            {phaseB ? "Ask me who owns what — e.g. “who handles billing?”" : `Message ${activeName.split(" ")[0]}`}
          </div>
        </div>
      </div>

      {!sent && !phaseB && <Cursor x={cx} y={cy} click={click} />}
    </AbsoluteFill>
  );
};
