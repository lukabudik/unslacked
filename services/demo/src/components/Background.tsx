import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { brand } from "../lib/theme";

/** Deep cinematic backdrop: vignette + drifting radial glow + faint grid. */
export const Background: React.FC<{ glow?: string; grid?: boolean }> = ({ glow = brand.accent, grid = true }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 60;
  return (
    <AbsoluteFill style={{ background: brand.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 700px at ${50 + drift / 20}% 38%, ${glow}22, transparent 70%)`,
        }}
      />
      {grid && (
        <AbsoluteFill
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(circle at 50% 45%, black, transparent 80%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 45%, black, transparent 80%)",
          }}
        />
      )}
      <AbsoluteFill style={{ boxShadow: "inset 0 0 320px rgba(0,0,0,0.7)" }} />
    </AbsoluteFill>
  );
};
