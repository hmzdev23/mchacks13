"use client";

import Link from "next/link";

export default function CalibratePage() {
  return (
    <main className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <p className="text-sm uppercase tracking-[0.2em] text-text-secondary mb-6">Calibration</p>
        <h1 className="text-4xl font-semibold mb-4">Prepare your space</h1>
        <p className="text-lg text-text-secondary max-w-2xl mb-10">
          Find good lighting, center your hands in the frame, and allow camera access. We will guide you into the ghost overlay on the next
          screen.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { title: "Lighting", desc: "Face a light source; avoid backlight. Clear background helps tracking." },
            { title: "Framing", desc: "Keep both hands in view. Arms slightly forward for best landmark detection." },
            { title: "Connection", desc: "Use Chrome/Firefox. Close other camera apps for a stable 30 FPS." },
          ].map((card) => (
            <div key={card.title} className="rounded-xl border border-border bg-bg-tertiary/60 p-5 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex items-center gap-4">
          <Link
            href="/session"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-text-primary text-white font-medium shadow-md hover:opacity-90 transition"
          >
            Start session
            <span aria-hidden>→</span>
          </Link>
          <span className="text-sm text-text-secondary">You can revisit calibration anytime from the session menu.</span>
        </div>
      </div>
    </main>
  );
}
