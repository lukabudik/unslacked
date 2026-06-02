import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Background } from "../components/Background";
import { Avatar } from "../components/Avatar";
import { brand } from "../lib/theme";
import { interFamily, monoFamily } from "../lib/fonts";
import { data } from "../lib/data";

export const Fix: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { asker, owner, hops } = data.hero;
  const mids = hops.map((h) => h.from!).filter(Boolean);

  const title = interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const collapse = interpolate(frame, [38, 72], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const beam = interpolate(frame, [70, 94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const metric = beam;
  const ruleS = spring({ frame: frame - 96, fps, config: { damping: 16, stiffness: 120 } });
  const out = interpolate(frame, [durationInFrames - 22, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const Node: React.FC<{ initials: string; color: string; label: string; big?: boolean }> = ({ initials, color, label, big }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
      <Avatar initials={initials} color={color} size={big ? 78 : 70} radius={17} ring={big ? "rgba(43,172,118,0.4)" : undefined} />
      <span style={{ color: brand.ink, fontSize: 16, fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );

  return (
    <AbsoluteFill style={{ fontFamily: interFamily, opacity: out }}>
      <Background glow={brand.good} grid={false} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 96 }}>
        <div style={{ opacity: title, color: brand.ink, fontSize: 60, fontWeight: 900, letterSpacing: -1.5 }}>
          From five hops to <span style={{ color: brand.good }}>one</span>.
        </div>
      </AbsoluteFill>

      {/* chain */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", marginTop: -120, height: 120 }}>
          {/* green direct beam with arrowhead, behind */}
          <svg width={760} height={40} style={{ position: "absolute", left: 90, top: 30, overflow: "visible" }}>
            <defs>
              <marker id="ah" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={brand.good} /></marker>
            </defs>
            <line x1={0} y1={3} x2={580 * beam} y2={3} stroke={brand.good} strokeWidth={5} opacity={beam} markerEnd={beam > 0.9 ? "url(#ah)" : undefined} style={{ filter: `drop-shadow(0 0 10px ${brand.good})` }} />
          </svg>

          <Node initials={asker.initials} color={asker.color} label={asker.name.split(" ")[0] + " asks"} />
          {/* collapsing middlemen */}
          <div style={{ display: "flex", alignItems: "center", overflow: "hidden", width: (1 - collapse) * (mids.length * 96), opacity: 1 - collapse }}>
            {mids.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                <span style={{ color: brand.danger, fontSize: 24, margin: "0 6px" }}>→</span>
                <Avatar initials={m.initials} color={m.color} size={52} radius={12} />
              </div>
            ))}
            <span style={{ color: brand.danger, fontSize: 24, margin: "0 6px" }}>→</span>
          </div>
          <div style={{ width: 90 + 470 * collapse }} />
          <Node initials={owner.initials} color={owner.color} label={owner.name.split(" ")[0] + " owns it"} big />
        </div>
      </AbsoluteFill>

      {/* metric */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ marginTop: 70, display: "flex", gap: 44, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: monoFamily, fontSize: 42, fontWeight: 700, color: brand.danger, textDecoration: collapse > 0.5 ? "line-through" : "none", opacity: 1 - collapse * 0.5 }}>{hops.length} hops</div>
            <div style={{ color: brand.inkDim, fontSize: 16 }}>days of waiting</div>
          </div>
          <div style={{ color: brand.good, fontSize: 30, opacity: metric }}>▶</div>
          <div style={{ textAlign: "center", opacity: metric, transform: `scale(${0.9 + metric * 0.1})` }}>
            <div style={{ fontFamily: monoFamily, fontSize: 48, fontWeight: 700, color: brand.good }}>1 message</div>
            <div style={{ color: brand.inkDim, fontSize: 16 }}>straight to the owner</div>
          </div>
        </div>
      </AbsoluteFill>

      {/* routing rule card — prominent, centered, stays */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 88 }}>
        <div style={{ opacity: ruleS, transform: `translateY(${(1 - ruleS) * 24}px) scale(${0.96 + ruleS * 0.04})`, background: brand.panel, border: `1.5px solid ${brand.good}`, borderRadius: 18, padding: "20px 30px", display: "flex", alignItems: "center", gap: 20, boxShadow: `0 24px 60px rgba(0,0,0,0.55)`, maxWidth: 1180 }}>
          <div style={{ background: brand.good, color: "#0B0E14", borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 15, whiteSpace: "nowrap" }}>NEW ROUTING RULE</div>
          <div style={{ color: brand.ink, fontSize: 23, fontWeight: 500, lineHeight: 1.35 }}>
            Questions like <span style={{ color: brand.accentBright, fontWeight: 700 }}>“{data.hero.topic}”</span> → go straight to{" "}
            <span style={{ color: brand.good, fontWeight: 800 }}>{owner.name}</span>.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
