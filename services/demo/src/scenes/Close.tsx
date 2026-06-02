import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Background } from "../components/Background";
import { brand } from "../lib/theme";
import { interFamily, monoFamily } from "../lib/fonts";

export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 13, stiffness: 130 } });
  const tag = interpolate(frame, [14, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const props = interpolate(frame, [34, 54], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const foot = interpolate(frame, [60, 82], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ fontFamily: interFamily }}>
      <Background glow={brand.accent} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ opacity: logo, transform: `scale(${0.85 + logo * 0.15})` }}>
          <span style={{ fontWeight: 900, fontSize: 104, color: brand.ink, letterSpacing: -3 }}>unslacked</span>
        </div>

        <div style={{ opacity: tag, transform: `translateY(${(1 - tag) * 14}px)`, color: brand.inkDim, fontSize: 38, fontWeight: 500, marginTop: 22 }}>
          See who <span style={{ color: brand.ink, fontWeight: 800 }}>really</span> runs your company.
        </div>

        <div style={{ opacity: props, display: "flex", gap: 50, marginTop: 54 }}>
          {[
            ["Find the hidden routers", brand.danger],
            ["Surface single points of failure", brand.gold],
            ["Route every question in one hop", brand.good],
          ].map(([t, c], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: c as string }} />
              <span style={{ color: brand.ink, fontSize: 22, fontWeight: 600 }}>{t}</span>
            </div>
          ))}
        </div>

        <div style={{ opacity: foot, marginTop: 64, color: brand.inkFaint, fontFamily: monoFamily, fontSize: 19, letterSpacing: 1 }}>
          from your Slack · in minutes · powered by parallel Claude agents
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
