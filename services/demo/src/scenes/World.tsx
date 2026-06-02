import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { SlackChrome, SlackMessage } from "../components/SlackMock";
import { data } from "../lib/data";
import { brand } from "../lib/theme";
import { interFamily } from "../lib/fonts";

const REACTIONS = [
  [{ emoji: "✅", n: 4 }, { emoji: "🙏", n: 2 }],
  [{ emoji: "🚨", n: 6 }],
  [],
  [{ emoji: "👀", n: 3 }],
  [{ emoji: "👍", n: 7 }, { emoji: "🔥", n: 2 }],
  [],
  [{ emoji: "🎉", n: 5 }],
];
const TIMES = ["9:02 AM", "9:14 AM", "9:31 AM", "9:48 AM", "10:05 AM", "10:22 AM", "10:40 AM", "11:03 AM", "11:19 AM", "11:35 AM"];

export const World: React.FC = () => {
  const frame = useCurrentFrame();
  const msgs = data.chaos.slice(0, 22);
  // continuous upward drift
  const scroll = interpolate(frame, [0, 168], [30, -760], { extrapolateRight: "clamp" });
  const intro = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const out = interpolate(frame, [150, 168], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const counterIn = interpolate(frame, [82, 104], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: out, fontFamily: interFamily }}>
      <SlackChrome activeChannel="general" topic="Company-wide chatter & cross-team questions" members={104}>
        <div style={{ position: "absolute", inset: 0, opacity: intro }}>
          <div style={{ transform: `translateY(${scroll}px)`, paddingTop: 16 }}>
            {msgs.map((m, i) => (
              <SlackMessage
                key={m.id}
                name={m.user.name}
                initials={m.user.initials}
                color={m.user.color}
                text={m.text}
                time={TIMES[i % TIMES.length]}
                reactions={REACTIONS[i % REACTIONS.length]}
              />
            ))}
          </div>
          {/* fade top/bottom for cinematic framing */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 70, background: "linear-gradient(#fff, transparent)" }} />
        </div>
      </SlackChrome>

      {/* stat lower-third */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 150, pointerEvents: "none" }}>
        <div
          style={{
            opacity: counterIn,
            transform: `translateY(${(1 - counterIn) * 20}px)`,
            background: "rgba(11,14,20,0.92)",
            border: `1px solid ${brand.panelBorder}`,
            borderRadius: 16,
            padding: "20px 38px",
            display: "flex",
            gap: 44,
            backdropFilter: "blur(6px)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          }}
        >
          {[
            [data.stats.messages.toLocaleString(), "messages"],
            [data.stats.people, "people"],
            [data.stats.channels, "channels"],
            [`${data.stats.weeks} weeks`, "of real history"],
          ].map(([v, l], i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ color: brand.ink, fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>{v}</div>
              <div style={{ color: brand.inkDim, fontSize: 16, fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
