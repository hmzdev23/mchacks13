"use client";

import Link from "next/link";
import { HoverEffect } from "@/components/ui/card-hover-effect";

const calibrationTips = [
  {
    title: "Lighting",
    description: "Face a light source; avoid backlight. Clear background helps tracking.",
    icon: (
      <svg className="w-8 h-8 text-[var(--stone-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  {
    title: "Framing",
    description: "Keep both hands in view. Arms slightly forward for best landmark detection.",
    icon: (
      <svg className="w-8 h-8 text-[var(--stone-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
      </svg>
    ),
  },
  {
    title: "Connection",
    description: "Use Chrome/Firefox. Close other camera apps for a stable 30 FPS.",
    icon: (
      <svg className="w-8 h-8 text-[var(--stone-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
      </svg>
    ),
  },
];

export default function CalibratePage() {
  return (
    <main className="min-h-screen bg-[var(--stone-100)]">
      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--stone-400)] mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
          Calibration
        </p>
        <h1 className="text-4xl md:text-5xl font-normal text-[var(--stone-900)] mb-4 tracking-tight" style={{ fontFamily: 'var(--font-heading)', fontWeight: 200 }}>
          Prepare your space
        </h1>
        <p className="text-base text-[var(--stone-500)] max-w-2xl mb-8 leading-relaxed">
          Find good lighting, center your hands in the frame, and allow camera access. We will guide you into the ghost overlay on the next screen.
        </p>

        {/* Hover Effect Cards */}
        <HoverEffect items={calibrationTips} className="py-6" />

        {/* Action Buttons */}
        <div className="mt-8 flex items-center gap-6">
          <Link
            href="/session"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--stone-900)] text-white text-sm font-medium shadow-lg hover:bg-[var(--stone-800)] transition-colors"
          >
            Start session
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
            </svg>
          </Link>
          <span className="text-sm text-[var(--stone-400)]">
            You can revisit calibration anytime from the session menu.
          </span>
        </div>
      </div>
    </main>
  );
}
