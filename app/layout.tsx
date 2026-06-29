import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Lexend } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Lexend — the dyslexia-optimized body font for the kiosk and the rest of the
// internal dashboard. Switched May 5, 2026 from Poppins on peer-reviewed
// dyslexia evidence (Shaver-Troup; BDA 2023). Poppins remains in the CSS
// fallback stack for graceful degradation. Terminal-recipient pages (the
// invitation flow) keep their locked Playfair design — those are not loaded
// here. See lib/design-tokens.ts for the body alias and globals.css for the
// CSS variable wiring.
const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RePrime Command Center",
  description: "CRE command center",
  icons: [{ rel: "icon", url: "/icon.svg" }],
};

// Next 16 split viewport out of metadata. Same effective output as before:
// <meta name="viewport" content="width=device-width, initial-scale=1">
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${lexend.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning on <html>/<body> only: browser extensions
          (Grammarly, password managers, the Chrome agent) inject attributes/text
          into these elements before React hydrates, which surfaced as a residual
          React #418 text-content mismatch. This suppresses ONLY these two
          elements' own attributes/text — never their children — so real content
          mismatches are still reported. */}
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
