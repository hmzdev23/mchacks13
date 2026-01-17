/**
 * Root Layout
 * 
 * Sets up:
 * - Custom fonts (IBM Plex Sans Condensed, Manrope)
 * - Global metadata
 * - PBLK-inspired theme with stone palette
 */

import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Condensed, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexSansCondensed = IBM_Plex_Sans_Condensed({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
  variable: "--font-heading",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SecondHand - Learn from Invisible Teachers",
  description:
    "Real-time motion learning with AR ghost overlay. Master sign language, CPR, piano, and more.",
  keywords: ["motion learning", "AR", "sign language", "CPR", "gesture recognition", "AI coaching"],
  authors: [{ name: "SecondHand Team" }],
  openGraph: {
    title: "SecondHand - Learn from Invisible Teachers",
    description: "Real-time motion learning with AR ghost overlay",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${ibmPlexSansCondensed.variable} ${manrope.variable} ${ibmPlexMono.variable} antialiased bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]`}
      >
        {/* Main content */}
        {children}
      </body>
    </html>
  );
}
