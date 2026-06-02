import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, random } from "remotion";
import { brand } from "../lib/theme";
import { interFamily, monoFamily } from "../lib/fonts";
import { data } from "../lib/data";

const W = 1920, H = 1080;

// fixed callout positions (card top-left) + leader-line origin (lx,ly), spread to the corners
const ANCHORS = [
  { cardX: 70, cardY: 250, lx: 352, ly: 290 }, // upper-left
  { cardX: 1568, cardY: 250, lx: 1568, ly: 290 }, // upper-right
  { cardX: 1568, cardY: 760, lx: 1568, ly: 800 }, // lower-right
];

export const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { nodes, edges } = data.graph;
  const pos = Object.fromEntries(nodes.map((n) => [n.id, n]));

  // per-node arrival progress (chaos -> clustered)
  const arrival = (id: string, i: number) => {
    const delay = (i % 22) * 0.9;
    return spring({ frame: frame - delay, fps, config: { damping: 15, mass: 0.7, stiffness: 120 } });
  };
  const nodeXY = (n: (typeof nodes)[number], i: number) => {
    const a = arrival(n.id, i);
    const sx = random(`sx${n.id}`) * W;
    const sy = random(`sy${n.id}`) * H;
    return { x: sx + (n.x - sx) * a, y: sy + (n.y - sy) * a, a };
  };

  const edgeOpacity = interpolate(frame, [50, 88], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleIn = interpolate(frame, [70, 96], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const routerReveal = interpolate(frame, [110, 145], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = interpolate(frame, [199, 223], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // precompute settled positions for edges
  const settled = Object.fromEntries(nodes.map((n, i) => [n.id, nodeXY(n, i)]));
  const topRouterIds = new Set(data.topRouters.slice(0, 3).map((r) => r.id));

  return (
    <AbsoluteFill style={{ background: brand.bg, fontFamily: interFamily, opacity: out }}>
      <AbsoluteFill style={{ background: `radial-gradient(1100px 800px at 50% 50%, ${brand.accent}14, transparent 72%)` }} />

      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        {/* edges */}
        <g opacity={edgeOpacity}>
          {edges.map((e, i) => {
            const a = settled[e.from];
            const b = settled[e.to];
            if (!a || !b) return null;
            const hot = topRouterIds.has(e.from) || topRouterIds.has(e.to);
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={hot ? brand.dangerGlow : "#7C8AA0"}
                strokeWidth={hot ? 1.4 : 0.7}
                opacity={hot ? 0.42 : 0.1}
              />
            );
          })}
        </g>

        {/* nodes */}
        {nodes.map((n, i) => {
          const p = settled[n.id];
          const isTop = topRouterIds.has(n.id);
          const pulse = isTop ? 1 + Math.sin(frame / 8) * 0.08 * routerReveal : 1;
          const r = n.size * (0.85 + p.a * 0.15) * pulse * (n.isRouter ? 1.25 : 1);
          const fill = n.isRouter ? brand.danger : n.color;
          return (
            <g key={n.id}>
              {isTop && (
                <circle cx={p.x} cy={p.y} r={r + 10 + Math.sin(frame / 8) * 4} fill="none" stroke={brand.dangerGlow} strokeWidth={2} opacity={0.5 * routerReveal} />
              )}
              <circle cx={p.x} cy={p.y} r={r} fill={fill} opacity={p.a} stroke={n.isRouter ? "#fff" : "none"} strokeWidth={n.isRouter ? 1.5 : 0} />
            </g>
          );
        })}

        {/* leader lines from fixed callout anchors to the real node */}
        {ANCHORS.map((an, i) => {
          const r = data.topRouters[i];
          const n = pos[r.id];
          if (!n) return null;
          return (
            <g key={`l${i}`} opacity={routerReveal}>
              <line x1={an.lx} y1={an.ly} x2={n.x} y2={n.y} stroke={brand.dangerGlow} strokeWidth={1.4} strokeDasharray="3 4" opacity={0.7} />
              <circle cx={n.x} cy={n.y} r={4} fill={brand.dangerGlow} />
            </g>
          );
        })}
      </svg>

      {/* router callouts — fixed anchors so they never overlap the central cluster */}
      {ANCHORS.map((an, i) => {
        const r = data.topRouters[i];
        return (
          <div
            key={r.id}
            style={{
              position: "absolute",
              left: an.cardX,
              top: an.cardY,
              opacity: routerReveal,
              transform: `translateY(${(1 - routerReveal) * 12}px)`,
            }}
          >
            <div style={{ background: "rgba(11,14,20,0.94)", border: `1px solid ${brand.danger}`, borderRadius: 12, padding: "12px 16px", boxShadow: "0 16px 40px rgba(0,0,0,0.5)", width: 282 }}>
              <div style={{ color: brand.ink, fontWeight: 800, fontSize: 19 }}>{r.name}</div>
              <div style={{ color: brand.inkDim, fontSize: 14, marginBottom: 6 }}>{r.title || r.team}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: monoFamily, color: brand.dangerGlow, fontWeight: 700, fontSize: 28 }}>{r.count}×</span>
                <span style={{ color: brand.inkDim, fontSize: 14 }}>questions forwarded</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* title */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 56, pointerEvents: "none" }}>
        <div style={{ opacity: titleIn, transform: `translateY(${(1 - titleIn) * 16}px)`, textAlign: "center" }}>
          <div style={{ color: brand.inkDim, fontSize: 20, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase" }}>The graph nobody drew</div>
          <div style={{ color: brand.ink, fontSize: 72, fontWeight: 900, letterSpacing: -2, marginTop: 6 }}>
            Your <span style={{ color: brand.danger }}>shadow org chart</span>
          </div>
        </div>
      </AbsoluteFill>

      {/* legend */}
      <div style={{ position: "absolute", bottom: 46, left: 90, display: "flex", gap: 30, opacity: titleIn, color: brand.inkDim, fontSize: 17, alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 9 }}><span style={{ width: 14, height: 14, borderRadius: 7, background: brand.danger, border: "1.5px solid #fff" }} /> the routers everything flows through</span>
        <span style={{ display: "flex", alignItems: "center", gap: 9 }}><span style={{ width: 14, height: 14, borderRadius: 7, background: brand.accent }} /> people, coloured by team</span>
      </div>
    </AbsoluteFill>
  );
};
