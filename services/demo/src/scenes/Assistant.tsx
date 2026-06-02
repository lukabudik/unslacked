import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { slack, brand } from "../lib/theme";
import { interFamily } from "../lib/fonts";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/AdminIcons";
import { data } from "../lib/data";

const UMark: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.26, background: brand.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <Icon name="route" size={size * 0.56} />
  </div>
);

const Cursor: React.FC<{ x: number; y: number; click: number }> = ({ x, y, click }) => (
  <div style={{ position: "absolute", left: x, top: y, zIndex: 50 }}>
    {click > 0 && <div style={{ position: "absolute", left: -18, top: -18, width: 36, height: 36, borderRadius: 18, border: `2px solid ${brand.accentBright}`, opacity: (1 - click) * 0.9, transform: `scale(${0.4 + click * 1.1})` }} />}
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
  const draftIn = spring({ frame: frame - 24, fps, config: { damping: 20 } });
  const cardS = spring({ frame: frame - 56, fps, config: { damping: 15, stiffness: 120 } });
  // cursor travels to the "Reroute to Marek" button then clicks ~118
  const cx = interpolate(frame, [78, 116], [950, 1232], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cy = interpolate(frame, [78, 116], [1010, 958], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const click = interpolate(frame, [118, 140], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rerouted = frame >= 130;
  const successS = spring({ frame: frame - 130, fps, config: { damping: 16 } });

  // right assistant panel conversation (second half)
  const botQ = spring({ frame: frame - 150, fps, config: { damping: 18 } });
  const botTyping = frame >= 178 && frame < 198;
  const botA = spring({ frame: frame - 198, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ background: slack.bg, fontFamily: interFamily, display: "flex", flexDirection: "row", opacity: intro }}>
      {/* mini sidebar */}
      <div style={{ width: 220, background: slack.sidebar, color: slack.sidebarText, paddingTop: 16 }}>
        <div style={{ padding: "0 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.10)", color: "#fff", fontWeight: 800, fontSize: 18 }}>{data.company}</div>
        <div style={{ padding: "14px 16px 6px", fontSize: 13, opacity: 0.8 }}>Direct messages</div>
        {[a.dmWith.name, a.owner.name, "Sofia Petrov"].map((n, i) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 16px", fontSize: 15, background: i === 0 && !rerouted ? slack.sidebarActive : "transparent", color: i === 0 && !rerouted ? "#fff" : slack.sidebarText }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: slack.online }} /> {n}
          </div>
        ))}
        <div style={{ padding: "14px 16px 6px", fontSize: 13, opacity: 0.8 }}>Apps</div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 16px", fontSize: 15, color: "#fff" }}>
          <span style={{ width: 18, height: 18, borderRadius: 5, background: brand.accent, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="route" size={11} /></span> unslacked
        </div>
      </div>

      {/* center DM column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
        <div style={{ height: 60, borderBottom: `1px solid ${slack.border}`, display: "flex", alignItems: "center", gap: 12, padding: "0 22px" }}>
          <Avatar initials={(rerouted ? a.owner : a.dmWith).initials} color={(rerouted ? a.owner : a.dmWith).color} size={30} radius={7} />
          <span style={{ color: slack.ink, fontWeight: 800, fontSize: 19 }}>{(rerouted ? a.owner : a.dmWith).name}</span>
          <span style={{ color: slack.inkDim, fontSize: 14 }}>{(rerouted ? a.owner : a.dmWith).title}</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* the draft as a pending bubble */}
        <div style={{ padding: "0 22px", opacity: draftIn, transform: `translateY(${(1 - draftIn) * 12}px)`, display: "flex", gap: 12, marginBottom: 18 }}>
          <Avatar initials="ON" color="#4a154b" size={40} radius={9} />
          <div>
            <div style={{ color: slack.ink, fontWeight: 800, fontSize: 15.5 }}>You <span style={{ color: slack.inkDim, fontWeight: 400, fontSize: 12.5 }}>now</span></div>
            <div style={{ color: slack.ink, fontSize: 16.5, lineHeight: 1.45, marginTop: 2 }}>{a.draft}</div>
          </div>
        </div>

        {/* agent suggestion card OR success, just above composer */}
        <div style={{ padding: "0 22px 12px" }}>
          {!rerouted ? (
            <div style={{ opacity: cardS, transform: `translateY(${(1 - cardS) * 16}px)`, background: "#fff", border: `1.5px solid ${brand.accent}`, borderRadius: 14, padding: "14px 16px", boxShadow: "0 14px 40px rgba(18,100,163,0.18)", display: "flex", alignItems: "center", gap: 14 }}>
              <UMark size={38} />
              <div style={{ flex: 1 }}>
                <div style={{ color: slack.ink, fontSize: 16.5, lineHeight: 1.4 }}>
                  This looks like <b>{a.topic}</b> — owned by <b>{a.owner.name}</b> ({a.owner.title}), not {a.dmWith.name.split(" ")[0]}.
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ background: brand.accent, color: "#fff", borderRadius: 9, padding: "9px 16px", fontWeight: 700, fontSize: 15, transform: `scale(${1 + click * 0.06})` }}>Reroute to {a.owner.name.split(" ")[0]}</div>
                <div style={{ border: `1px solid ${slack.border}`, color: slack.inkDim, borderRadius: 9, padding: "9px 14px", fontWeight: 600, fontSize: 15 }}>Send anyway</div>
              </div>
            </div>
          ) : (
            <div style={{ opacity: successS, transform: `translateY(${(1 - successS) * 10}px)`, background: "rgba(43,172,118,0.10)", border: `1.5px solid ${slack.green}`, borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 15, background: slack.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>✓</div>
              <div style={{ color: slack.ink, fontSize: 16.5 }}>Rerouted to <b>{a.owner.name}</b> — straight to the owner. <span style={{ color: slack.green, fontWeight: 700 }}>3 hops skipped.</span></div>
            </div>
          )}
        </div>

        {/* composer */}
        <div style={{ padding: "0 22px 20px" }}>
          <div style={{ border: `1px solid ${slack.border}`, borderRadius: 10, padding: "12px 14px", color: slack.inkDim, fontSize: 15.5, display: "flex", justifyContent: "space-between" }}>
            <span>Message {(rerouted ? a.owner : a.dmWith).name.split(" ")[0]}</span>
            <span style={{ color: slack.green, fontWeight: 700 }}>➤</span>
          </div>
        </div>
      </div>

      {/* right assistant panel */}
      <div style={{ width: 440, borderLeft: `1px solid ${slack.border}`, background: "#fff", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 60, borderBottom: `1px solid ${slack.border}`, display: "flex", alignItems: "center", gap: 11, padding: "0 18px" }}>
          <UMark size={30} />
          <div>
            <div style={{ color: slack.ink, fontWeight: 800, fontSize: 16 }}>unslacked <span style={{ background: "#E8E8E8", color: "#616061", fontSize: 10.5, fontWeight: 700, borderRadius: 3, padding: "1px 5px" }}>APP</span></div>
            <div style={{ color: slack.inkDim, fontSize: 12.5 }}>ask me who to talk to — anytime</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", gap: 14, justifyContent: "flex-end" }}>
          {frame < 148 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, opacity: interpolate(frame, [120, 148], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
              <UMark size={46} />
              <div style={{ color: slack.inkDim, fontSize: 15, textAlign: "center", maxWidth: 280, lineHeight: 1.45 }}>
                Not sure who to ask? <br />Message me — I'll point you to the right person.
              </div>
            </div>
          )}
          {/* user question */}
          <div style={{ opacity: botQ, transform: `translateY(${(1 - botQ) * 10}px)`, alignSelf: "flex-end", maxWidth: 320, background: "#1264A3", color: "#fff", borderRadius: "14px 14px 4px 14px", padding: "10px 14px", fontSize: 15.5 }}>
            {a.bot.q}
          </div>
          {/* bot answer */}
          {(botTyping || botA > 0) && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <UMark size={30} />
              {botTyping ? (
                <div style={{ background: "#F4F6F8", borderRadius: 12, padding: "12px 16px", display: "flex", gap: 5 }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{ width: 7, height: 7, borderRadius: 4, background: slack.inkDim, opacity: 0.4 + 0.6 * Math.abs(Math.sin((frame - 178) / 4 + i)) }} />
                  ))}
                </div>
              ) : (
                <div style={{ opacity: botA, transform: `translateY(${(1 - botA) * 8}px)`, maxWidth: 350 }}>
                  <div style={{ background: "#F4F6F8", borderRadius: "14px 14px 14px 4px", padding: "12px 14px", fontSize: 15.5, color: slack.ink, lineHeight: 1.45 }}>
                    Courier payouts sit with <b>Payments Engineering</b> — that's <b>{a.bot.owner.name}</b>.
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, padding: "10px 12px", border: `1px solid ${slack.border}`, borderRadius: 12 }}>
                    <Avatar initials={a.bot.owner.initials} color={a.bot.owner.color} size={34} radius={8} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: slack.ink, fontWeight: 700, fontSize: 14.5 }}>{a.bot.owner.name}</div>
                      <div style={{ color: slack.inkDim, fontSize: 12.5 }}>{a.bot.owner.title}</div>
                    </div>
                    <div style={{ background: brand.accent, color: "#fff", borderRadius: 8, padding: "7px 13px", fontWeight: 700, fontSize: 13.5 }}>Intro me</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!rerouted && <Cursor x={cx} y={cy} click={click} />}
    </AbsoluteFill>
  );
};
