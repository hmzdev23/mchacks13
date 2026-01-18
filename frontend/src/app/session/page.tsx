"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Camera } from "@/components/Camera";
import { OverlayCanvas } from "@/components/OverlayCanvas";
import { ScoreMeter } from "@/components/ScoreMeter";
import { ElevenLabsWidget } from "@/components/session/ElevenLabsWidget";
import { useElementSize } from "@/hooks/useElementSize";
import { useVideoMetrics } from "@/hooks/useVideoMetrics";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { alignHands, Point2D } from "@/lib/cv/alignment";
import { ScoringEngine } from "@/lib/cv/scoring";
import { getExpertHand } from "@/lib/packs/alphabet";
import { LetterGrid } from "@/components/session/LetterGrid";

function cueFromTopJoints(top: number[]) {
  if (top.includes(8) || top.includes(12)) return "Open fingers slightly wider.";
  if (top.includes(4)) return "Adjust your thumb position.";
  if (top.includes(0)) return "Center your wrist inside the ghost.";
  return "Match the ghost hand closely.";
}

export default function SessionPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [score, setScore] = useState(0);
  const [topErrors, setTopErrors] = useState<number[]>([]);
  const [selectedLetter, setSelectedLetter] = useState("A");
  const [isGridOpen, setIsGridOpen] = useState(false);
  const scoringRef = useRef<{ Left: ScoringEngine; Right: ScoringEngine }>({
    Left: new ScoringEngine(),
    Right: new ScoringEngine(),
  });

  const { results, loading, ready, error } = useMediaPipe(videoRef.current, {
    swapHandedness: true,
    minHandScore: 0.5,
  });
  const { width, height } = useElementSize(frameRef.current);
  const { width: videoWidth, height: videoHeight } = useVideoMetrics(videoRef.current);

  const leftHand = useMemo(
    () => (results.leftHand ? results.leftHand.landmarks.map(([x, y]) => [x, y] as Point2D) : null),
    [results]
  );
  const rightHand = useMemo(
    () => (results.rightHand ? results.rightHand.landmarks.map(([x, y]) => [x, y] as Point2D) : null),
    [results]
  );

  const hands = useMemo(() => {
    const entries: { side: "Left" | "Right"; points: Point2D[]; score: number }[] = [];
    if (leftHand && results.leftHand) entries.push({ side: "Left", points: leftHand, score: results.leftHand.score });
    if (rightHand && results.rightHand) entries.push({ side: "Right", points: rightHand, score: results.rightHand.score });
    return entries;
  }, [leftHand, rightHand, results]);

  const ghostHands = useMemo(() => {
    // If no hands detected, show the selected letter ghost
    if (hands.length === 0) {
      return [getExpertHand(selectedLetter)];
    }
    return hands.map((hand) =>
      alignHands(getExpertHand(selectedLetter), hand.points).alignedExpert
    );
  }, [hands]);
  const userHands = useMemo(() => hands.map((hand) => hand.points), [hands]);

  useEffect(() => {
    if (!hands.length || !ghostHands.length) {
      scoringRef.current.Left.reset();
      scoringRef.current.Right.reset();
      setScore(0);
      setTopErrors([]);
      return;
    }
    const scores = hands.map((hand, idx) => scoringRef.current[hand.side].score(hand.points, ghostHands[idx]));
    const avgScore = scores.reduce((acc, s) => acc + s.overall, 0) / scores.length;
    setScore(avgScore);
    const primaryIndex = hands.findIndex((hand) => hand.side === "Left");
    setTopErrors(scores[primaryIndex >= 0 ? primaryIndex : 0]?.topJoints ?? []);
  }, [hands, ghostHands]);

  const cue = useMemo(() => cueFromTopJoints(topErrors), [topErrors]);

  return (
    <main className="flex min-h-screen selection:bg-[var(--stone-300)] selection:text-[var(--stone-900)] bg-[var(--stone-100)]">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="ml-[70px] w-[calc(100%-70px)] p-6 md:p-8 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="flex justify-between items-center mb-6 flex-none">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>
                Session Active
              </p>
            </div>
            <h1 className="text-3xl text-[var(--stone-900)] tracking-tight" style={{ fontFamily: 'var(--font-heading)', fontWeight: 200 }}>
              Practice Letter: <span className="font-semibold">{selectedLetter}</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsGridOpen(true)}
              className="group flex items-center gap-3 bg-[var(--stone-900)] text-white px-5 py-2.5 rounded-full hover:bg-[var(--stone-800)] transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {selectedLetter}
              </div>
              <span className="text-sm font-medium">Change Letter</span>
              <svg className="w-4 h-4 text-white/60 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <LetterGrid
              isOpen={isGridOpen}
              onClose={() => setIsGridOpen(false)}
              onSelect={setSelectedLetter}
              currentLetter={selectedLetter}
            />

            <Link href="/calibrate">
              <button className="btn-secondary text-xs px-4 py-2 opacity-60 hover:opacity-100 transition-opacity">
                Recalibrate
              </button>
            </Link>
            <Link href="/">
              <button className="btn-primary text-xs px-4 py-2 bg-[var(--stone-900)] text-white hover:bg-[var(--stone-800)]">
                End Session
              </button>
            </Link>
          </div>
        </header>

        {/* Main Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">

          {/* Left Column: Camera (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6 h-full min-h-0">
            <div ref={frameRef} className="glass-heavy rounded-2xl border border-white/50 overflow-hidden shadow-xl relative flex-1 min-h-0">
              <Camera ref={videoRef} className="w-full h-full object-cover" mirrored />
              <OverlayCanvas
                width={width}
                height={height}
                videoWidth={videoWidth}
                videoHeight={videoHeight}
                className="absolute inset-0 w-full h-full"
                userHands={userHands}
                ghostHands={ghostHands}
                mirror
                topErrors={topErrors}
              />

              {/* MediaPipe Status Overlay */}
              {(!ready || loading || error) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--stone-100)]/80 backdrop-blur-md z-20">
                  {loading ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-8 h-8 rounded-full border-2 border-[var(--stone-300)] border-t-[var(--stone-900)] animate-spin" />
                      <p className="text-sm font-medium text-[var(--stone-600)]">Initializing Hand Tracking...</p>
                    </div>
                  ) : error ? (
                    <div className="text-[var(--color-error)] text-center max-w-sm px-6">
                      <p className="font-medium mb-1">Camera Error</p>
                      <p className="text-sm opacity-80">{error}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--stone-500)]">Waiting for camera access...</p>
                  )}
                </div>
              )}

              {/* Live Status Pill */}
              <div className="absolute top-4 left-4 z-10 glass-panel px-3 py-1.5 rounded-full flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${ready && !loading ? 'bg-emerald-500 animate-pulse' : 'bg-[var(--stone-400)]'}`} />
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--stone-600)]">
                  {results.fps ? `${Math.round(results.fps)} FPS` : "Ready"}
                </span>
              </div>
            </div>

            {/* Live Cue Banner */}
            <div className="h-24 glass-nav rounded-xl p-6 flex flex-col justify-center border border-white/50 relative overflow-hidden flex-none">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--stone-900)]" />
              <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                Live Correction
              </p>
              <p className="text-xl text-[var(--stone-800)] font-light" style={{ fontFamily: 'var(--font-heading)' }}>
                {cue}
              </p>
            </div>
          </div>

          {/* Right Column: Controls & AI (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6 h-full min-h-0">

            {/* Score Card - Fixed height at top */}
            <div className="glass-panel rounded-2xl p-6 border border-white/60 shadow-sm flex-none">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)]" style={{ fontFamily: 'var(--font-mono)' }}>
                    Accuracy Score
                  </p>
                  <h2 className="text-4xl font-light text-[var(--stone-900)] mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
                    {Math.round(score)}<span className="text-lg text-[var(--stone-400)] font-normal">%</span>
                  </h2>
                </div>
                <ScoreMeter score={score} />
              </div>
              <div className="w-full bg-[var(--stone-200)] h-1 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--stone-900)] transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                />
              </div>
            </div>

            {/* AI Coach Widget - Grows to fill ALL remaining space */}
            <div className="glass-heavy rounded-2xl border border-white/50 shadow-lg relative overflow-hidden flex-1 min-h-[500px]">
              <ElevenLabsWidget feedback={`Score: ${Math.round(score)}%. Suggestion: ${cue}`} score={score} />
            </div>

            {/* Removed Tracking Stats to give more room to AI Widget (stats are redundant or can be moved if needed) */}

          </div>
        </div>
      </div>
    </main>
  );
}
