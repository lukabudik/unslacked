import type { Metadata } from "next";
import "./globals.css";
import { Lato } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

// Slack's product UI is set in Lato; using it makes the mock read as authentic.
const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Unslacked — Slack Mock",
  description: "Mock Slack workspace + canonical schema for the unslacked project",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", lato.variable)}>
      <body className="bg-[#3f0e40] antialiased text-[#1d1c1d]">
        <TooltipProvider delay={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
