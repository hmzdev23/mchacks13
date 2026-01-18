"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera } from "@/components/Camera";
import { OverlayCanvas } from "@/components/OverlayCanvas";
import { ScoreMeter } from "@/components/ScoreMeter";
import { useElementSize } from "@/hooks/useElementSize";
import { useVideoMetrics } from "@/hooks/useVideoMetrics";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { alignHands, Point2D } from "@/lib/cv/alignment";
import { ScoringEngine } from "@/lib/cv/scoring";
import { expertHandLeft, expertHandRight } from "@/lib/packs/sampleExpert";
import { motion, AnimatePresence } from "framer-motion";

type Segment = { id: string; name: string; start: number; end: number };
type ScorePoint = { t: number; score: number };

function cueFromTopJoints(top: number[]) {
  if (top.includes(8) || top.includes(12)) return "Open fingers slightly wider.";
  if (top.includes(4)) return "Adjust your thumb position.";
  if (top.includes(0)) return "Center your wrist inside the ghost.";
  return "Match the ghost hand closely.";
}

function generateGhostFrames(base: Point2D[], totalFrames = 120): Point2D[][] {
  return Array.from({ length: totalFrames }, (_, frame) => {
    const phase = (frame / totalFrames) * Math.PI * 2;
    const wiggle = Math.sin(phase) * 0.01;
    const spread = Math.sin(phase * 2) * 0.005;
    return base.map(([x, y], idx) => {
      const factor = idx % 4 === 0 ? spread : wiggle;
      return [x + factor, y - factor] as Point2D;
    });
  });
}

function findBestGhostFrame(live: Point2D[] | null, frames: Point2D[][], segment: Segment): number | null {
  if (!live) return null;
  let bestIdx: number | null = null;
  let bestErr = Number.POSITIVE_INFINITY;
  for (let i = segment.start; i <= segment.end; i++) {
    const frame = frames[i];
    if (!frame || frame.length !== live.length) continue;
    let err = 0;
    for (let j = 0; j < live.length; j++) {
      const p = live[j];
      const q = frame[j];
      if (!p || !q) continue;
      err += Math.hypot(p[0] - q[0], p[1] - q[1]);
    }
    if (err < bestErr) {
      bestErr = err;
      bestIdx = i;
    }
  }
  return bestIdx;
}

interface DanceModeProps {
  className?: string;
}

export function DanceMode({ className }: DanceModeProps) {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const scoringEngineRef = useRef(new ScoringEngine());

  const [score, setScore] = useState(0);
  const [topErrors, setTopErrors] = useState<number[]>([]);
  const [scoreHistory, setScoreHistory] = useState<ScorePoint[]>([]);
  const [playing, setPlaying] = useState(true);
  const [fadeGhost, setFadeGhost] = useState(true);
  const [ghostIndex, setGhostIndex] = useState(0);
  const [ghostOpacity, setGhostOpacity] = useState(0.9);
  const [recapOpen, setRecapOpen] = useState(false);

  const { results, loading, ready, error } = useMediaPipe(videoElement, {
    swapHandedness: true,
    minHandScore: 0.5,
  });

  const { width, height } = useElementSize(frameRef.current);
  const { width: videoWidth, height: videoHeight } = useVideoMetrics(videoElement);

  const userHand = useMemo(() => {
    const hand = results.rightHand ?? results.leftHand;
    if (!hand) return null;
    return hand.landmarks.map(([x, y]) => [x, y] as Point2D);
  }, [results]);

  const ghostFrames = useMemo(() => generateGhostFrames(expertHandLeft, 150), []);
  const segments: Segment[] = useMemo(
    () => [
      { id: "setup", name: "Setup (anchor)", start: 0, end: 49 },
      { id: "micro-drill", name: "Micro-drill loop", start: 50, end: 99 },
      { id: "speed-pass", name: "Speed pass", start: 100, end: 149 },
    ],
    []
  );
  const [selectedSegment, setSelectedSegment] = useState<Segment>(segments[1]);

  const { alignedGhost, liveHand } = useMemo(() => {
    if (!userHand) return { alignedGhost: null, liveHand: null };
    const ghost = ghostFrames[ghostIndex] ?? expertHandLeft;
    const aligned = alignHands(ghost, userHand);
    return { alignedGhost: aligned.alignedExpert, liveHand: userHand };
  }, [userHand, ghostFrames, ghostIndex]);

  useEffect(() => {
    if (!liveHand || !alignedGhost) {
      scoringEngineRef.current.reset();
      setScore(0);
      setTopErrors([]);
      return;
    }
    const res = scoringEngineRef.current.score(liveHand, alignedGhost);
    setScore(res.overall);
    setTopErrors(res.topJoints);
    setScoreHistory((prev) => {
      const next = [...prev, { t: Date.now(), score: res.overall }];
      return next.slice(-200);
    });
  }, [liveHand, alignedGhost]);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setGhostIndex((idx) => {
        const next = idx + 1;
        return next > selectedSegment.end || next < selectedSegment.start ? selectedSegment.start : next;
      });
    }, 1000 / 30);
    return () => clearInterval(interval);
  }, [playing, selectedSegment]);

  useEffect(() => {
    const span = selectedSegment.end - selectedSegment.start || 1;
    const progress = Math.max(0, Math.min(1, (ghostIndex - selectedSegment.start) / span));
    setGhostOpacity(fadeGhost ? Math.max(0.2, 1 - progress) : 0.9);
  }, [ghostIndex, selectedSegment, fadeGhost]);

  useEffect(() => {
    const target = findBestGhostFrame(liveHand, ghostFrames, selectedSegment);
    if (target === null) return;
    setGhostIndex((idx) => Math.round(idx * 0.7 + target * 0.3));
  }, [liveHand, ghostFrames, selectedSegment]);

  const averageScore = useMemo(() => {
    if (!scoreHistory.length) return 0;
    return Math.round(scoreHistory.reduce((a, b) => a + b.score, 0) / scoreHistory.length);
  }, [scoreHistory]);
  const bestScore = useMemo(() => (scoreHistory.length ? Math.max(...scoreHistory.map((p) => p.score)) : 0), [scoreHistory]);
  const lastDelta = useMemo(() => {
    if (scoreHistory.length < 2) return 0;
    const last = scoreHistory[scoreHistory.length - 1].score;
    const prev = scoreHistory[scoreHistory.length - 6]?.score ?? scoreHistory[0].score;
    return Math.round(last - prev);
  }, [scoreHistory]);

  const cue = useMemo(() => cueFromTopJoints(topErrors), [topErrors]);

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Header */}
      <header className="flex justify-between items-center mb-4 flex-none">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>
              Dance Mode Active
            </p>
          </div>
          <h1 className="text-2xl text-[var(--stone-900)] tracking-tight" style={{ fontFamily: 'var(--font-heading)', fontWeight: 200 }}>
            Loop Training: <span className="font-semibold">{selectedSegment.name}</span>
          </h1>
        </div>
        <ScoreMeter score={score} />
      </header>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Video Area */}
        <div className="lg:col-span-8 flex flex-col gap-4 h-full min-h-0">
          <div ref={frameRef} className="glass-heavy rounded-2xl border border-white/50 overflow-hidden shadow-xl relative flex-1 min-h-0 bg-black">
            <Camera ref={setVideoElement} className="w-full h-full object-cover" mirrored />
            <OverlayCanvas
              width={width}
              height={height}
              videoWidth={videoWidth}
              videoHeight={videoHeight}
              className="absolute inset-0 w-full h-full"
              userHands={liveHand ? [liveHand] : []}
              ghostHands={alignedGhost ? [alignedGhost] : []}
              mirror
              topErrors={topErrors}
              ghostOpacity={ghostOpacity}
            />

            {(!ready || loading || error) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--stone-100)]/80 backdrop-blur-md z-20">
                {loading ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--stone-300)] border-t-[var(--stone-900)] animate-spin" />
                    <p className="text-sm font-medium text-[var(--stone-600)]">Initializing...</p>
                  </div>
                ) : error ? (
                  <div className="text-red-500 text-center max-w-sm px-6">
                    <p className="font-medium mb-1">Camera Error</p>
                    <p className="text-sm opacity-80">{error}</p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--stone-500)]">Waiting for camera access...</p>
                )}
              </div>
            )}

            {/* Loop Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-white/80 border-t border-[var(--stone-200)] px-4 py-3 flex flex-wrap gap-3 items-center backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="px-3 py-2 rounded-lg border border-[var(--stone-200)] bg-white text-sm font-medium hover:bg-[var(--stone-50)]"
                >
                  {playing ? "Pause loop" : "Play loop"}
                </button>
                <button
                  onClick={() => setFadeGhost((f) => !f)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                    fadeGhost ? "bg-purple-50 border-purple-200 text-purple-800" : "bg-white border-[var(--stone-200)]"
                  }`}
                >
                  {fadeGhost ? "Fade training" : "Keep ghost solid"}
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--stone-500)] uppercase tracking-[0.15em] text-[11px]">Segment</span>
                <select
                  value={selectedSegment.id}
                  onChange={(e) => {
                    const seg = segments.find((s) => s.id === e.target.value);
                    if (seg) {
                      setSelectedSegment(seg);
                      setGhostIndex(seg.start);
                    }
                  }}
                  className="border border-[var(--stone-200)] rounded-md px-2 py-1 bg-white text-sm"
                >
                  {segments.map((seg) => (
                    <option key={seg.id} value={seg.id}>
                      {seg.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ml-auto flex items-center gap-3 text-xs text-[var(--stone-500)]">
                <span>Loop {ghostIndex}/{selectedSegment.end}</span>
                <button
                  onClick={() => setRecapOpen(true)}
                  className="px-3 py-2 rounded-lg border border-[var(--stone-200)] bg-white text-xs font-medium hover:bg-[var(--stone-50)]"
                >
                  Session Recap
                </button>
              </div>
            </div>
          </div>

          {/* Cue Bar */}
          <div className="h-20 glass-nav rounded-xl p-4 flex flex-col justify-center border border-white/50 relative overflow-hidden flex-none">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
            <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
              Live Correction
            </p>
            <p className="text-lg text-[var(--stone-800)] font-light" style={{ fontFamily: 'var(--font-heading)' }}>
              {cue}
            </p>
          </div>
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full min-h-0">
          {/* Loop Tracker */}
          <div className="glass-panel rounded-2xl p-5 border border-white/60 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)] mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
              Loop Tracker
            </p>
            <ul className="text-sm text-[var(--stone-600)] space-y-2">
              <li className="flex justify-between">
                <span>Segment:</span>
                <span className="font-medium">{selectedSegment.name}</span>
              </li>
              <li className="flex justify-between">
                <span>Ghost phase-lock:</span>
                <span className={`font-medium ${playing ? 'text-purple-600' : ''}`}>{playing ? "Active" : "Paused"}</span>
              </li>
              <li className="flex justify-between">
                <span>Score trend:</span>
                <span className={`font-medium ${lastDelta > 0 ? 'text-emerald-600' : lastDelta < 0 ? 'text-red-500' : ''}`}>
                  {lastDelta > 0 ? `+${lastDelta}` : lastDelta < 0 ? `${lastDelta}` : "steady"}
                </span>
              </li>
            </ul>
            <div className="mt-4 h-2 rounded-full bg-[var(--stone-200)] overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-150"
                style={{
                  width: `${Math.min(100, ((ghostIndex - selectedSegment.start) / Math.max(1, selectedSegment.end - selectedSegment.start)) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Tracking Panel */}
          <div className="glass-panel rounded-2xl p-5 border border-white/60 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)] mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
              Tracking
            </p>
            <ul className="text-sm text-[var(--stone-600)] space-y-2">
              <li className="flex justify-between">
                <span>FPS:</span>
                <span className="font-medium">{results.fps || "..."}</span>
              </li>
              <li className="flex justify-between">
                <span>Hands:</span>
                <span className="font-medium">
                  {results.leftHand && results.rightHand ? "Both" : results.leftHand ? "Left" : results.rightHand ? "Right" : "None"}
                </span>
              </li>
              <li className="flex justify-between">
                <span>Status:</span>
                <span className={`font-medium ${ready ? 'text-emerald-600' : ''}`}>
                  {loading ? "Starting..." : ready ? "Live" : "Waiting"}
                </span>
              </li>
            </ul>
          </div>

          {/* Instructions */}
          <div className="glass-panel rounded-2xl p-5 border border-white/60 shadow-sm flex-1">
            <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)] mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
              How to Use
            </p>
            <ol className="text-sm text-[var(--stone-600)] list-decimal list-inside space-y-2">
              <li>Center your hand in the frame</li>
              <li>Match the ghost hand timing</li>
              <li>Toggle fade to practice from memory</li>
              <li>Use segment selector for drills</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Recap Modal */}
      <AnimatePresence>
        {recapOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm grid place-items-center px-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-[var(--stone-200)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--stone-400)]">Recap</p>
                  <h2 className="text-xl font-semibold text-[var(--stone-900)]">Session Summary</h2>
                </div>
                <button
                  onClick={() => setRecapOpen(false)}
                  className="px-3 py-2 text-sm rounded-md border border-[var(--stone-200)] hover:bg-[var(--stone-50)]"
                >
                  Back to practice
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-[var(--stone-200)] bg-[var(--stone-50)]">
                  <p className="text-xs text-[var(--stone-500)]">Average</p>
                  <p className="text-2xl font-semibold text-[var(--stone-900)]">{averageScore}</p>
                </div>
                <div className="p-3 rounded-lg border border-[var(--stone-200)] bg-[var(--stone-50)]">
                  <p className="text-xs text-[var(--stone-500)]">Best</p>
                  <p className="text-2xl font-semibold text-[var(--stone-900)]">{Math.round(bestScore)}</p>
                </div>
                <div className="p-3 rounded-lg border border-[var(--stone-200)] bg-[var(--stone-50)]">
                  <p className="text-xs text-[var(--stone-500)]">Trend</p>
                  <p className="text-2xl font-semibold text-[var(--stone-900)]">{lastDelta > 0 ? `+${lastDelta}` : lastDelta}</p>
                </div>
              </div>
              <div className="rounded-lg border border-[var(--stone-200)] bg-[var(--stone-50)] p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--stone-400)] mb-1">Last Cue</p>
                <p className="text-sm text-[var(--stone-700)]">{cue}</p>
              </div>
              <div className="text-xs text-[var(--stone-500)]">
                Tip: Replay the micro-drill with ghost fade to test recall, then turn it back on to verify alignment.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
