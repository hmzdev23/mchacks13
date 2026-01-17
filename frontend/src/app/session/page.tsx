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

export default function SessionPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [score, setScore] = useState(0);
  const [topErrors, setTopErrors] = useState<number[]>([]);

  const { results, loading } = useMediaPipe(videoRef.current);

  const userHand = useMemo(() => pickHand(results), [results]);

  const { alignedGhost, liveHand } = useMemo(() => {
    if (!userHand) return { alignedGhost: null, liveHand: null };
    const aligned = alignHands(expertHand, userHand);
    return { alignedGhost: aligned.alignedExpert, liveHand: userHand };
  }, [userHand]);

  useEffect(() => {
    if (!liveHand || !alignedGhost) return;
    const res = scoringEngine.score(liveHand, alignedGhost);
    setScore(res.overall);
    setTopErrors(res.topJoints);
  }, [liveHand, alignedGhost]);

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
            <ScoreMeter score={score} />
            <Link href="/calibrate" className="text-sm text-text-secondary underline">
              Recalibrate
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-[2fr_1fr] gap-6 items-start">
          <div className="rounded-2xl border border-border overflow-hidden bg-white shadow-md relative">
            <Camera
              ref={videoRef}
              onReady={() => setReady(true)}
              className="aspect-video"
              mirrored
            />
            <OverlayCanvas
              width={1280}
              height={720}
              className="absolute inset-0"
              userHand={liveHand}
              ghostHand={alignedGhost}
              topErrors={topErrors}
            />
            {!ready && (
              <div className="absolute inset-0 grid place-items-center text-text-secondary text-sm bg-white/60 backdrop-blur-sm">
                Allow camera to start the session…
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-border bg-bg-tertiary shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-2">Live cue</p>
              <p className="text-lg font-medium">{cue}</p>
              <p className="text-sm text-text-secondary mt-2">Top joints: {topErrors.join(", ") || "tracking..."}</p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-bg-tertiary shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-2">Tracking</p>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>FPS: {results.fps || "…"}</li>
                <li>Hand: {results.rightHand ? "Right" : results.leftHand ? "Left" : "None detected"}</li>
                <li>Status: {loading ? "Starting MediaPipe…" : ready ? "Live" : "Waiting for camera"}</li>
              </ul>
            </div>
            <div className="p-5 rounded-xl border border-border bg-bg-tertiary shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-2">How to use</p>
              <ol className="text-sm text-text-secondary list-decimal list-inside space-y-1">
                <li>Center your hand in the frame; keep fingers visible.</li>
                <li>Slide your hand into the ghost outline.</li>
                <li>Open/rotate fingers until the score rises.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
