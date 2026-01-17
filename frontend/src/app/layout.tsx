import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecondHand - Learn from Invisible Teachers",
  description: "Real-time motion learning with ghost overlays and instant coaching.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
