// Shared design tokens + timeline for the unslacked pitch video.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Brand
export const brand = {
  bg: "#0B0E14", // deep near-black
  bgAlt: "#10141C",
  panel: "#161B26",
  panelBorder: "#232A38",
  ink: "#E8EBF0",
  inkDim: "#9AA4B2",
  inkFaint: "#5C6675",
  accent: "#4A90D9", // unslacked blue
  accentBright: "#5EA9FF",
  danger: "#E74C3C", // routers / bottlenecks
  dangerGlow: "#FF6B5B",
  good: "#2BAC76",
  gold: "#E8912D",
  purple: "#9B59B6",
};

// Slack mock chrome (matches services/slack-mock)
export const slack = {
  sidebar: "#3F0E40",
  sidebarHover: "#522653",
  sidebarActive: "#1164A3",
  sidebarText: "#CFC3CF",
  sidebarTextActive: "#FFFFFF",
  bg: "#FFFFFF",
  ink: "#1D1C1D",
  inkDim: "#616061",
  link: "#1264A3",
  border: "#E2E2E2",
  hover: "#F8F8F8",
  green: "#007A5A",
  online: "#2BAC76",
};

// Admin dashboard chrome (matches services/admin, light theme)
export const admin = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  border: "#E5E7EB",
  ink: "#111827",
  inkDim: "#6B7280",
  accents: ["#2563EB", "#16A34A", "#06B6D4", "#9333EA", "#DC2626", "#EA580C"],
};

// Timeline is driven by the voiceover: each scene = lead-in + narration + a tail beat.
// Re-running `pnpm vo` updates vo-manifest.json and the whole video re-times itself.
import vo from "../data/vo-manifest.json";

export const VO_LEAD = 0.25; // seconds of silence before narration starts in a scene
const TAIL: Record<string, number> = {
  hook: 0.9,
  world: 0.8,
  trace: 1.6, // room for the "5 hand-offs. Zero answers." verdict to land
  multiply: 0.7,
  reveal: 1.7, // let the graph breathe
  dashboard: 1.2,
  automations: 1.0,
  assistant: 1.0,
  fix: 1.3,
  build: 1.2,
  close: 2.2, // hold on the logo
};

const sceneDur = (id: string) =>
  Math.round((VO_LEAD + ((vo.clips as Record<string, { duration: number }>)[id]?.duration ?? 4) + TAIL[id]) * FPS);

export const scenes = {
  hook: sceneDur("hook"),
  world: sceneDur("world"),
  trace: sceneDur("trace"),
  multiply: sceneDur("multiply"),
  reveal: sceneDur("reveal"),
  dashboard: sceneDur("dashboard"),
  automations: sceneDur("automations"),
  assistant: sceneDur("assistant"),
  fix: sceneDur("fix"),
  build: sceneDur("build"),
  close: sceneDur("close"),
} as const;

export const voClips = vo.clips as Record<string, { file: string; duration: number; text: string }>;

export const TRANSITION = 12; // crossfade frames between scenes

export const fontFamily =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
export const monoFamily =
  "'SF Mono', 'JetBrains Mono', ui-monospace, Menlo, monospace";
