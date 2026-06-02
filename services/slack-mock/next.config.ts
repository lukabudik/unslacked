import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compile the shared workspace package (TS source, no build step).
  transpilePackages: ["@unslacked/db"],

  // The slack-mock is consumed by the Python backend as an HTTP API.
  // Allow cross-origin reads from the other dev services during the hackathon.
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
