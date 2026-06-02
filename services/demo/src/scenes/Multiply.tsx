import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, random } from "remotion";
import { Background } from "../components/Background";
import { brand } from "../lib/theme";
import { interFamily, monoFamily } from "../lib/fonts";
import { data } from "../lib/data";
import { countUp, fmt } from "../lib/anim";

const MiniChain: React.FC<{ seed: number; appear: number }> = ({ seed, appear }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - appear, fps, config: { damping: 18 } });
  const dots = 2 + Math.floor(random(`d${seed}`) * 4);
  const isDM = random(`m${seed}`) > 0.68;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, opacity: s * 0.85, transform: `scale(${s})` }}>
      {Array.from({ length: dots }).map((_, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div style={{ width: 12, height: 2, background: isDM ? brand.gold : brand.inkFaint, opacity: 0.6 }} />}
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              background: i === dots - 1 ? brand.danger : isDM ? brand.gold : brand.inkDim,
            }}
          />
        </React.Fragment>
      ))}
    </div>
  );
};

export const Multiply: React.FC = () => {
  const frame = useCurrentFrame();
  const title = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const count = Math.round(countUp(frame, data.stats.chains, 20, 95));
  const statsIn = interpolate(frame, [150, 178], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = interpolate(frame, [253, 277], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const cols = 14, rows = 6;
  return (
    <AbsoluteFill style={{ fontFamily: interFamily, opacity: out }}>
      <Background glow={brand.danger} grid={false} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 90 }}>
        <div style={{ opacity: title, color: brand.ink, fontSize: 56, fontWeight: 900, letterSpacing: -1.5 }}>
          And this isn't one bad thread.
        </div>
        <div style={{ opacity: title, color: brand.inkDim, fontSize: 26, fontWeight: 500, marginTop: 10 }}>
          We labelled every routing chain in 6 weeks of Nimbus Logistics.
        </div>
      </AbsoluteFill>

      {/* field of mini-chains */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "26px 30px", marginTop: 40, width: 1500 }}>
          {Array.from({ length: cols * rows }).map((_, i) => (
            <MiniChain key={i} seed={i} appear={24 + (i % cols) * 2 + Math.floor(i / cols) * 8} />
          ))}
        </div>
      </AbsoluteFill>

      {/* big count */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ fontFamily: monoFamily, fontSize: 240, fontWeight: 700, color: brand.danger, letterSpacing: -8, textShadow: "0 0 80px rgba(231,76,60,0.45)", opacity: 0.92 }}>
          {fmt(count)}
        </div>
      </AbsoluteFill>

      {/* stat callouts */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 90 }}>
        <div style={{ display: "flex", gap: 60, opacity: statsIn, transform: `translateY(${(1 - statsIn) * 24}px)` }}>
          {[
            [`${data.stats.chains}`, "routing chains", brand.danger],
            [`${data.stats.handoffChains}`, "happen invisibly in DMs", brand.gold],
            [`${data.stats.deepChains}`, "take 4+ hand-offs", brand.accentBright],
          ].map(([v, l, c], i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: monoFamily, fontSize: 72, fontWeight: 700, color: c as string, letterSpacing: -2 }}>{v}</div>
              <div style={{ color: brand.inkDim, fontSize: 20, fontWeight: 500, marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
