import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unslacked — Slack Mock",
  description: "Mock Slack workspace + canonical schema for the unslacked project",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased text-gray-900">{children}</body>
    </html>
  );
}
