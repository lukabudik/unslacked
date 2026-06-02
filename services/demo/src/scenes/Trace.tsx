import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Background } from "../components/Background";
import { Avatar } from "../components/Avatar";
import { RichText } from "../components/RichText";
import { data } from "../lib/data";
import { brand } from "../lib/theme";
import { interFamily, monoFamily } from "../lib/fonts";
import { pop } from "../lib/anim";

const HOP_GAP = 24; // frames between deflections — rapid-fire "forwarded… and forwarded…"
const FIRST = 18; // first hop appears

const Counter: React.FC<{ label: string; value: number | string; accent: string; delay: number }> = ({ label, value, accent, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = pop(frame, fps, delay);
  return (
    <div style={{ opacity: s, transform: `scale(${0.9 + s * 0.1})` }}>
      <div style={{ fontFamily: monoFamily, fontSize: 64, fontWeight: 700, color: accent, lineHeight: 1, letterSpacing: -2 }}>{value}</div>
      <div style={{ color: brand.inkDim, fontSize: 18, fontWeight: 500, marginTop: 6 }}>{label}</div>
    </div>
  );
};

export const Trace: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hops = data.hero.hops;
  const question = data.hero.messages[0];

  const revealed = hops.filter((_, i) => frame >= FIRST + i * HOP_GAP).length;
  const verdictStart = FIRST + hops.length * HOP_GAP + 16;
  const verdict = interpolate(frame, [verdictStart, verdictStart + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const threadDim = interpolate(frame, [verdictStart, verdictStart + 26], [1, 0.16], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // all 6 rows fit on screen — no scroll (it was covering the header)

  return (
    <AbsoluteFill style={{ fontFamily: interFamily }}>
      <Background glow={brand.danger} grid />

      {/* header */}
      <div style={{ position: "absolute", top: 54, left: 90, right: 90, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ color: brand.inkDim, fontSize: 26 }}>#</span>
          <span style={{ color: brand.ink, fontWeight: 800, fontSize: 30 }}>{data.hero.channel}</span>
          <span style={{ color: brand.inkFaint, fontSize: 20, marginLeft: 8 }}>· one real thread</span>
        </div>
        <div style={{ color: brand.inkDim, fontSize: 18, fontWeight: 500, fontFamily: monoFamily }}>watch a simple question travel</div>
      </div>

      {/* thread column */}
      <div style={{ position: "absolute", top: 156, left: 90, width: 1180, opacity: threadDim }}>
        {/* the question */}
        <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
          <Avatar initials={question.user.initials} color={question.user.color} size={48} radius={11} />
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ color: brand.ink, fontWeight: 800, fontSize: 21 }}>{question.user.name}</span>
              <span style={{ color: brand.good, fontSize: 14, fontWeight: 700, background: "rgba(43,172,118,0.14)", borderRadius: 6, padding: "2px 8px" }}>asks a question</span>
            </div>
            <div style={{ color: brand.ink, fontSize: 22, lineHeight: 1.4, marginTop: 4, maxWidth: 1040 }}>
              <RichText text={question.text} color={brand.ink} />
            </div>
          </div>
        </div>

        {/* deflections */}
        {hops.map((h, i) => {
          const appear = FIRST + i * HOP_GAP;
          if (frame < appear) return null;
          const s = spring({ frame: frame - appear, fps, config: { damping: 16, mass: 0.7, stiffness: 130 } });
          const isDM = h.mechanism === "handoff";
          return (
            <div key={i} style={{ display: "flex", gap: 16, marginBottom: 26, opacity: s, transform: `translateX(${(1 - s) * 40}px)` }}>
              {/* connector */}
              <div style={{ width: 48, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 2, flex: "0 0 14px", background: brand.panelBorder }} />
                <Avatar initials={h.from!.initials} color={h.from!.color} size={44} radius={10} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ color: brand.ink, fontWeight: 800, fontSize: 20 }}>{h.from!.name}</span>
                  <span
                    style={{
                      color: isDM ? brand.gold : brand.danger,
                      fontSize: 14.5,
                      fontWeight: 800,
                      background: isDM ? "rgba(232,145,45,0.16)" : "rgba(231,76,60,0.16)",
                      borderRadius: 7,
                      padding: "3px 10px",
                      letterSpacing: 0.2,
                    }}
                  >
                    {isDM ? "↪ forwards privately in a DM" : `↪ forwards to ${h.to.name}`}
                  </span>
                </div>
                <div style={{ color: brand.inkDim, fontSize: 19.5, lineHeight: 1.42, marginTop: 4, maxWidth: 980 }}>
                  <RichText text={h.text} color={brand.inkDim} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* live counters (right rail) */}
      <div style={{ position: "absolute", top: 150, right: 90, width: 320, display: "flex", flexDirection: "column", gap: 40, opacity: threadDim }}>
        <Counter label="hand-offs so far" value={revealed} accent={brand.danger} delay={FIRST} />
        <Counter label="people pulled in" value={revealed > 0 ? revealed + 1 : 0} accent={brand.gold} delay={FIRST + 6} />
        <Counter label="answers given" value={0} accent={brand.inkFaint} delay={FIRST + 12} />
      </div>

      {/* verdict */}
      {verdict > 0 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", opacity: verdict }}>
          <div style={{ transform: `scale(${0.96 + verdict * 0.04})` }}>
            <div style={{ color: brand.ink, fontSize: 84, fontWeight: 900, letterSpacing: -2, lineHeight: 1.05 }}>
              <span style={{ color: brand.danger }}>{data.hero.hops.length} hand-offs.</span> Zero answers.
            </div>
            <div style={{ color: brand.inkDim, fontSize: 34, fontWeight: 500, marginTop: 26, maxWidth: 1200 }}>
              Everyone forwards it. Nobody owns it. And when the answer finally comes by DM —
              <span style={{ color: brand.gold, fontWeight: 700 }}> the person who asked never sees who solved it.</span>
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
