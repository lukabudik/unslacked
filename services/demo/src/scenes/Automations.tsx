import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { interFamily } from "../lib/fonts";
import { brand } from "../lib/theme";

// The real /automations screen (1920x1080) with a callout on the Duvo provisioning.
export const Automations: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const out = interpolate(frame, [durationInFrames - 14, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // slow ken-burns toward the table's right side (where Duvo fit + Provision live)
  const z = interpolate(frame, [0, durationInFrames], [1.0, 1.06], { extrapolateRight: "clamp" });
  const px = interpolate(frame, [0, durationInFrames], [0, -40], { extrapolateRight: "clamp" });

  const callout = spring({ frame: frame - 60, fps: 30, config: { damping: 16 } });

  return (
    <AbsoluteFill style={{ background: "#0B0E14", fontFamily: interFamily, opacity: out }}>
      <AbsoluteFill style={{ opacity: fadeIn }}>
        <Img src={staticFile("admin/admin-automations.png")} style={{ position: "absolute", inset: 0, width: 1920, height: 1080, transform: `scale(${z}) translateX(${px}px)`, transformOrigin: "70% 45%" }} />
      </AbsoluteFill>

      {/* callout chip near the Provision / Duvo column */}
      <div style={{ position: "absolute", right: 120, top: 250, opacity: callout, transform: `translateY(${(1 - callout) * 14}px)` }}>
        <div style={{ background: "rgba(11,14,20,0.92)", border: `1px solid ${brand.good}`, borderRadius: 14, padding: "14px 18px", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", maxWidth: 360 }}>
          <div style={{ color: brand.good, fontWeight: 800, fontSize: 14, letterSpacing: 0.4 }}>ONE CLICK →</div>
          <div style={{ color: brand.ink, fontSize: 19, fontWeight: 600, marginTop: 4, lineHeight: 1.35 }}>
            auto-drafts a ready-to-ship brief into a <span style={{ color: brand.accentBright }}>Duvo AI</span> agent
          </div>
        </div>
      </div>

      {/* label chip */}
      <div style={{ position: "absolute", bottom: 28, left: 28, display: "flex", alignItems: "center", gap: 10, background: "rgba(11,14,20,0.82)", border: `1px solid ${brand.panelBorder}`, borderRadius: 999, padding: "8px 16px", opacity: interpolate(frame, [16, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <span style={{ color: brand.ink, fontWeight: 700, fontSize: 18 }}>Automation opportunities</span>
        <span style={{ color: brand.inkDim, fontSize: 16 }}>· ranked by hours recoverable</span>
      </div>
    </AbsoluteFill>
  );
};
