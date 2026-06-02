import React from "react";
import { slack } from "../lib/theme";

/** Renders text with ⟦@mention⟧ and ⟦#channel⟧ markers styled like Slack. */
export const RichText: React.FC<{ text: string; color?: string }> = ({ text, color }) => {
  const parts = text.split(/(⟦[^⟧]+⟧)/g).filter((p) => p !== "");
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("⟦") && p.endsWith("⟧")) {
          const inner = p.slice(1, -1);
          return (
            <span
              key={i}
              style={{
                color: slack.link,
                background: "rgba(18,100,163,0.10)",
                borderRadius: 4,
                padding: "0 3px",
                fontWeight: 600,
              }}
            >
              {inner}
            </span>
          );
        }
        return (
          <span key={i} style={{ color }}>
            {p}
          </span>
        );
      })}
    </>
  );
};
