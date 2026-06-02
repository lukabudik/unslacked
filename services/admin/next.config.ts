import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This service is self-contained; pin the root so Next doesn't pick up a
  // parent lockfile when inferring the workspace root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
