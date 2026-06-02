import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { interFamily } from "../lib/fonts";
import { brand } from "../lib/theme";

// The real admin Overview, captured from localhost:3000 (1920x2455). Slow pan top -> shadow org.
export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const IMG_H = 2455;
  const VIEW = 1080;
  const maxPan = IMG_H - VIEW; // 1375

  const intro = spring({ frame, fps: 30, config: { damping: 200 } });
  const pan = interpolate(frame, [10, durationInFrames - 10], [0, -Math.min(maxPan, 1180)], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const out = interpolate(frame, [durationInFrames - 14, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#0B0E14", fontFamily: interFamily, opacity: out }}>
      <AbsoluteFill style={{ opacity: fadeIn, transform: `scale(${0.985 + intro * 0.015})` }}>
        <Img src={staticFile("admin/admin-overview.png")} style={{ position: "absolute", top: 0, left: 0, width: 1920, transform: `translateY(${pan}px)` }} />
      </AbsoluteFill>

      {/* label chip */}
      <div style={{ position: "absolute", top: 28, left: 28, display: "flex", alignItems: "center", gap: 10, background: "rgba(11,14,20,0.82)", border: `1px solid ${brand.panelBorder}`, borderRadius: 999, padding: "8px 16px", backdropFilter: "blur(6px)", opacity: interpolate(frame, [16, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: brand.good }} />
        <span style={{ color: brand.ink, fontWeight: 700, fontSize: 18 }}>The unslacked dashboard</span>
        <span style={{ color: brand.inkDim, fontSize: 16 }}>· live, from your Slack</span>
      </div>
    </AbsoluteFill>
  );
};
