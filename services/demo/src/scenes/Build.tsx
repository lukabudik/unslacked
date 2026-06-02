import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Background } from "../components/Background";
import { brand } from "../lib/theme";
import { interFamily, monoFamily } from "../lib/fonts";
import { Icon } from "../components/AdminIcons";
import { data } from "../lib/data";

const STAGES = [
  { icon: "network", title: "A real Slack", sub: "we built a fully-working Slack — UI and all", note: "agents had to actually message each other", color: brand.accentBright },
  { icon: "activity", title: "100 AI agents", sub: "messaging in real time for six weeks", note: `${data.stats.messages.toLocaleString()} msgs · an organic company`, color: brand.gold },
  { icon: "waypoints", title: "The routing engine", sub: "parallel Claude agents read every thread", note: `${data.stats.chains} hand-off chains found`, color: brand.danger },
  { icon: "dashboard", title: "The dashboard", sub: "the shadow org chart, revealed", note: "who really runs the company", color: brand.good },
];

export const Build: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const title = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = interpolate(frame, [durationInFrames - 22, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const appear = [70, 150, 250, 330];

  return (
    <AbsoluteFill style={{ fontFamily: interFamily, opacity: out }}>
      <Background glow={brand.accent} grid />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 110 }}>
        <div style={{ opacity: title, textAlign: "center" }}>
          <div style={{ color: brand.inkDim, fontSize: 19, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase" }}>Built this weekend</div>
          <div style={{ color: brand.ink, fontSize: 56, fontWeight: 900, letterSpacing: -1.5, marginTop: 8 }}>Four pieces, from scratch.</div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "stretch", gap: 0, marginTop: 50 }}>
          {STAGES.map((s, i) => {
            const sp = spring({ frame: frame - appear[i], fps, config: { damping: 16, stiffness: 110 } });
            const arrow = i > 0 ? interpolate(frame, [appear[i] - 18, appear[i]], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
            return (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div style={{ display: "flex", alignItems: "center", width: 64, justifyContent: "center" }}>
                    <div style={{ height: 3, width: 64 * arrow, background: brand.panelBorder, position: "relative" }}>
                      <span style={{ position: "absolute", right: -2, top: -5, color: brand.inkFaint, fontSize: 16, opacity: arrow }}>▶</span>
                    </div>
                  </div>
                )}
                <div style={{ width: 320, opacity: sp, transform: `translateY(${(1 - sp) * 24}px)`, background: brand.panel, border: `1px solid ${brand.panelBorder}`, borderTop: `3px solid ${s.color}`, borderRadius: 16, padding: "22px 22px 20px", boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: s.color + "22", color: s.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={s.icon} size={24} />
                  </div>
                  <div style={{ color: brand.ink, fontWeight: 800, fontSize: 23, marginTop: 16 }}>{s.title}</div>
                  <div style={{ color: brand.inkDim, fontSize: 16, marginTop: 6, lineHeight: 1.4, minHeight: 46 }}>{s.sub}</div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${brand.panelBorder}`, color: s.color, fontSize: 13.5, fontWeight: 600, fontFamily: monoFamily }}>{s.note}</div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
