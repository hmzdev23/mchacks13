"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Camera } from "@/components/Camera";
import { OverlayCanvas } from "@/components/OverlayCanvas";
import { ScoreMeter } from "@/components/ScoreMeter";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { alignHands, Point2D } from "@/lib/cv/alignment";
import { ScoringEngine } from "@/lib/cv/scoring";
import { expertHand } from "@/lib/packs/sampleExpert";

const scoringEngine = new ScoringEngine();

type Segment = { id: string; name: string; start: number; end: number };
type ScorePoint = { t: number; score: number };

function pickHand(results: ReturnType<typeof useMediaPipe>["results"]): Point2D[] | null {
  const hand = results.rightHand ?? results.leftHand;
  if (!hand) return null;
  return hand.landmarks.map(([x, y]) => [x, y] as Point2D);
}

function cueFromTopJoints(top: number[]) {
  if (top.includes(8) || top.includes(12)) return "Open fingers slightly wider.";
  if (top.includes(4)) return "Adjust your thumb position.";
  if (top.includes(0)) return "Center your wrist inside the ghost.";
  return "Match the ghost hand closely.";
}

function generateGhostFrames(base: Point2D[], totalFrames = 120): Point2D[][] {
  // Simple oscillation to simulate expert movement for loop training.
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

export default function SessionPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [score, setScore] = useState(0);
  const [topErrors, setTopErrors] = useState<number[]>([]);
  const [scoreHistory, setScoreHistory] = useState<ScorePoint[]>([]);
  const [playing, setPlaying] = useState(true);
  const [fadeGhost, setFadeGhost] = useState(true);
  const [ghostIndex, setGhostIndex] = useState(0);
  const [ghostOpacity, setGhostOpacity] = useState(0.9);
  const [recapOpen, setRecapOpen] = useState(false);

  const { results, loading, ready, error } = useMediaPipe(videoRef.current);

  const userHand = useMemo(() => pickHand(results), [results]);
  const ghostFrames = useMemo(() => generateGhostFrames(expertHand, 150), []);
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
    const ghost = ghostFrames[ghostIndex] ?? expertHand;
    const aligned = alignHands(ghost, userHand);
    return { alignedGhost: aligned.alignedExpert, liveHand: userHand };
  }, [userHand, ghostFrames, ghostIndex]);

  useEffect(() => {
    if (!liveHand || !alignedGhost) {
      scoringEngine.reset();
      setScore(0);
      setTopErrors([]);
      return;
    }
    const res = scoringEngine.score(liveHand, alignedGhost);
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
    <main className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Session</p>
            <h1 className="text-2xl font-semibold">Ghost overlay practice</h1>
          </div>
          <div className="flex items-center gap-3">
            <ScoreMeter score={score} trend={lastDelta} />
            <Link href="/calibrate" className="text-sm text-text-secondary underline">
              Recalibrate
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-[2fr_1fr] gap-6 items-start">
          <div className="rounded-2xl border border-border overflow-hidden bg-white shadow-md relative">
            <Camera ref={videoRef} className="aspect-video" mirrored />
            <OverlayCanvas
              width={1280}
              height={720}
              className="absolute inset-0"
              userHand={liveHand}
              ghostHand={alignedGhost}
              topErrors={topErrors}
              ghostOpacity={ghostOpacity}
            />
            {(!ready || loading || error) && (
              <div className="absolute inset-0 grid place-items-center text-text-secondary text-sm bg-white/60 backdrop-blur-sm text-center px-4">
                {error
                  ? `Camera error: ${error}`
                  : loading
                  ? "Starting MediaPipe…"
                  : "Allow camera to start the session…"}
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-white/80 border-t border-border px-4 py-3 flex flex-wrap gap-3 items-center backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="px-3 py-2 rounded-lg border border-border bg-bg-tertiary text-sm font-medium"
                >
                  {playing ? "Pause loop" : "Play loop"}
                </button>
                <button
                  onClick={() => setFadeGhost((f) => !f)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                    fadeGhost ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-bg-tertiary border-border"
                  }`}
                >
                  {fadeGhost ? "Fade training" : "Keep ghost solid"}
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-secondary uppercase tracking-[0.15em] text-[11px]">Segment</span>
                <select
                  value={selectedSegment.id}
                  onChange={(e) => {
                    const seg = segments.find((s) => s.id === e.target.value);
                    if (seg) {
                      setSelectedSegment(seg);
                      setGhostIndex(seg.start);
                    }
                  }}
                  className="border border-border rounded-md px-2 py-1 bg-white text-sm"
                >
                  {segments.map((seg) => (
                    <option key={seg.id} value={seg.id}>
                      {seg.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ml-auto flex items-center gap-3 text-xs text-text-secondary">
                <span>Loop {ghostIndex}/{selectedSegment.end}</span>
                <button
                  onClick={() => setRecapOpen(true)}
                  className="px-3 py-2 rounded-lg border border-border bg-bg-tertiary text-xs font-medium"
                >
                  End session
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-border bg-bg-tertiary shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-2">Live cue</p>
              <p className="text-lg font-medium">{cue}</p>
              <p className="text-sm text-text-secondary mt-2">Top joints: {topErrors.join(", ") || "tracking..."}</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-bg-tertiary shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-2">Loop tracker</p>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>Segment: {selectedSegment.name}</li>
                <li>Ghost phase-lock: {playing ? "Active" : "Paused"}</li>
                <li>Score trend: {lastDelta > 0 ? `↑ +${lastDelta}` : lastDelta < 0 ? `↓ ${lastDelta}` : "steady"}</li>
              </ul>
              <div className="mt-3 h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-150"
                  style={{
                    width: `${Math.min(
                      100,
                      ((ghostIndex - selectedSegment.start) / Math.max(1, selectedSegment.end - selectedSegment.start)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
            <div className="p-5 rounded-xl border border-border bg-bg-tertiary shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-2">Tracking</p>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>FPS: {results.fps || "…"}</li>
                <li>Hand: {results.rightHand ? "Right" : results.leftHand ? "Left" : "None detected"}</li>
                <li>Status: {loading ? "Starting MediaPipe…" : ready ? "Live" : "Waiting for camera"}</li>
                {error ? <li className="text-error">Error: {error}</li> : null}
              </ul>
            </div>
            <div className="p-5 rounded-xl border border-border bg-bg-tertiary shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-2">How to use</p>
              <ol className="text-sm text-text-secondary list-decimal list-inside space-y-1">
                <li>Center your hand in the frame; keep fingers visible.</li>
                <li>Slide your hand into the ghost outline.</li>
                <li>Open/rotate fingers until the score rises.</li>
                <li>Toggle fade to practice from memory.</li>
              </ol>
            </div>
          </div>
        </div>

        {recapOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm grid place-items-center px-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Recap</p>
                  <h2 className="text-xl font-semibold">Session summary</h2>
                </div>
                <button
                  onClick={() => setRecapOpen(false)}
                  className="px-3 py-2 text-sm rounded-md border border-border bg-bg-tertiary"
                >
                  Back to practice
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-border bg-bg-tertiary">
                  <p className="text-xs text-text-secondary">Average</p>
                  <p className="text-2xl font-semibold">{averageScore}</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-bg-tertiary">
                  <p className="text-xs text-text-secondary">Best</p>
                  <p className="text-2xl font-semibold">{bestScore}</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-bg-tertiary">
                  <p className="text-xs text-text-secondary">Trend</p>
                  <p className="text-2xl font-semibold">{lastDelta > 0 ? `+${lastDelta}` : lastDelta}</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-bg-tertiary p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-1">Last cue</p>
                <p className="text-sm">{cue}</p>
              </div>
              <div className="text-xs text-text-secondary">
                Tip: Replay the micro-drill with ghost fade to test recall, then turn it back on to verify alignment.
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
