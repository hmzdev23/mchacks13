"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSessionStore } from "@/store/sessionStore";
import { ASLMode } from "@/components/session/ASLMode";
import { DanceMode } from "@/components/session/DanceMode";
import { NormalMode } from "@/components/session/NormalMode";
import Link from "next/link";

export default function SessionPage() {
  const { mode, setMode } = useSessionStore();
  const searchParams = useSearchParams();

  useEffect(() => {
    const requested = searchParams.get("mode");
    if (requested === "asl" || requested === "dance" || requested === "normal") {
      setMode(requested);
    }
  }, [searchParams, setMode]);

  return (
    <main className="flex min-h-screen selection:bg-[var(--stone-300)] selection:text-[var(--stone-900)] bg-[var(--stone-100)]">
      <Sidebar />
      <div className="ml-[70px] w-[calc(100%-70px)] p-6 md:p-8 flex flex-col h-screen overflow-hidden relative">
        {/* Top Navigation - positioned in the top right corner with extra top margin */}
        <div className="absolute top-6 right-6 flex items-center gap-3 z-30">
          <Link href="/calibrate">
            <button className="text-xs px-4 py-2 rounded-lg border border-[var(--stone-300)] text-[var(--stone-600)] hover:bg-white transition-colors bg-white/80 backdrop-blur-sm">
              Recalibrate
            </button>
          </Link>
          <Link href="/">
            <button className="text-xs px-4 py-2 rounded-lg bg-[var(--stone-900)] text-white hover:bg-[var(--stone-800)] transition-colors">
              End Session
            </button>
          </Link>
        </div>

        {/* Mode-specific content */}
        {mode === 'asl' && <ASLMode />}
        {mode === 'dance' && <DanceMode />}
        {mode === 'normal' && <NormalMode />}
      </div>
    </main>
  );
}
