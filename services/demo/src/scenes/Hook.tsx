import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Sequence } from "remotion";
import { Background } from "../components/Background";
import { brand } from "../lib/theme";
import { interFamily } from "../lib/fonts";
import { pop } from "../lib/anim";

const Words: React.FC<{ text: string; size: number; color?: string; weight?: number; delay?: number }> = ({
  text,
  size,
  color = brand.ink,
  weight = 800,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: size * 0.28, maxWidth: 1500 }}>
      {words.map((w, i) => {
        const s = pop(frame, fps, delay + i * 3);
        return (
          <span
            key={i}
            style={{
              fontSize: size,
              fontWeight: weight,
              color,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              opacity: s,
              transform: `translateY(${(1 - s) * 28}px)`,
              display: "inline-block",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [190, 213], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ fontFamily: interFamily, opacity: out }}>
      <Background glow={brand.accent} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: 120 }}>
        <Sequence durationInFrames={90} layout="none">
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
            <Words text="Who actually runs your company?" size={92} />
          </AbsoluteFill>
        </Sequence>
        <Sequence from={86} durationInFrames={160} layout="none">
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 26 }}>
            <Words text="It's not who's on the org chart." size={62} color={brand.inkDim} weight={600} />
            <Sequence from={48} layout="none">
              <Words text="It's who everyone keeps messaging." size={78} color={brand.accentBright} delay={0} />
            </Sequence>
          </AbsoluteFill>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
