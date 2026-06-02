import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Part of the pnpm monorepo: dependencies are hoisted to the repo root, so
  // point Turbopack at the workspace root rather than this package directory.
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
