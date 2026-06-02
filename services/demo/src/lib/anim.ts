import { interpolate, spring, Easing } from "remotion";

export const ease = Easing.bezier(0.22, 1, 0.36, 1); // gentle "out-expo"-ish

/** Fade + rise on entrance. */
export function enter(frame: number, delay = 0, dur = 22) {
  const o = interpolate(frame, [delay, delay + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const y = interpolate(frame, [delay, delay + dur], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return { opacity: o, transform: `translateY(${y}px)` };
}

/** Fade out near the end of a scene for a clean cut. */
export function exitFade(frame: number, sceneDur: number, dur = 16) {
  return interpolate(frame, [sceneDur - dur, sceneDur], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** Springy pop (scale 0.8 -> 1). */
export function pop(frame: number, fps: number, delay = 0, damping = 14) {
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.7, stiffness: 120 } });
}

/** Count a number up to `to` over [delay, delay+dur]. */
export function countUp(frame: number, to: number, delay = 0, dur = 40) {
  const v = interpolate(frame, [delay, delay + dur], [0, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return v;
}

export function fmt(n: number) {
  return Math.round(n).toLocaleString("en-US");
}
