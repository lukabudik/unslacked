import React from "react";

export const Avatar: React.FC<{
  initials: string;
  color: string;
  size?: number;
  radius?: number;
  ring?: string;
}> = ({ initials, color, size = 36, radius, ring }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? size * 0.22,
        background: color,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.4,
        flexShrink: 0,
        boxShadow: ring ? `0 0 0 3px ${ring}` : undefined,
        letterSpacing: -0.5,
      }}
    >
      {initials}
    </div>
  );
};
