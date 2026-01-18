"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Camera } from "@/components/Camera";
import { OverlayCanvas } from "@/components/OverlayCanvas";
import { ScoreMeter } from "@/components/ScoreMeter";
import { useElementSize } from "@/hooks/useElementSize";
import { useVideoMetrics } from "@/hooks/useVideoMetrics";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { alignHands, Point2D, HandTransform } from "@/lib/cv/alignment";
import { ScoringEngine } from "@/lib/cv/scoring";
import { expertHandLeft, expertHandRight } from "@/lib/packs/sampleExpert";

const DEBUG_OVERLAY = false;
const TEMPLATE_SWITCH_THRESHOLD = 0.92;

function cueFromTopJoints(top: number[]) {
  if (top.includes(8) || top.includes(12)) return "Open fingers slightly wider.";
  if (top.includes(4)) return "Adjust your thumb position.";
  if (top.includes(0)) return "Center your wrist inside the ghost.";
  return "Match the ghost hand closely.";
}

function fitError(user: Point2D[], aligned: Point2D[]) {
  if (!user.length || !aligned.length) return Number.POSITIVE_INFINITY;
  let total = 0;
  const count = Math.min(user.length, aligned.length);
  for (let i = 0; i < count; i += 1) {
    const dx = user[i][0] - aligned[i][0];
    const dy = user[i][1] - aligned[i][1];
    total += Math.hypot(dx, dy);
  }
  return total / count;
}

export default function SessionPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [score, setScore] = useState(0);
  const [topErrors, setTopErrors] = useState<number[]>([]);
  const scoringRef = useRef<{ Left: ScoringEngine; Right: ScoringEngine }>({
    Left: new ScoringEngine(),
    Right: new ScoringEngine(),
  });
  const transformRef = useRef<{
    Left: { Left: HandTransform | null; Right: HandTransform | null };
    Right: { Left: HandTransform | null; Right: HandTransform | null };
  }>({
    Left: { Left: null, Right: null },
    Right: { Left: null, Right: null },
  });
  const templateRef = useRef<{ Left: "Left" | "Right"; Right: "Left" | "Right" }>({
    Left: "Left",
    Right: "Right",
  });

  const { results, loading, ready, error } = useMediaPipe(videoRef.current, {
    swapHandedness: false,
    minHandScore: 0.6,
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

  const frame = useMemo(
    () => (videoWidth > 0 && videoHeight > 0 ? { width: videoWidth, height: videoHeight } : undefined),
    [videoWidth, videoHeight]
  );

  useEffect(() => {
    transformRef.current.Left.Left = null;
    transformRef.current.Left.Right = null;
    transformRef.current.Right.Left = null;
    transformRef.current.Right.Right = null;
    templateRef.current.Left = "Left";
    templateRef.current.Right = "Right";
  }, [videoWidth, videoHeight]);
  const alignmentResults = useMemo(
    () =>
      hands.map((hand) => {
        const candidates = [
          { template: "Left" as const, expert: expertHandLeft },
          { template: "Right" as const, expert: expertHandRight },
        ].map(({ template, expert }) => {
          const previous = transformRef.current[hand.side][template];
          const result = alignHands(expert, hand.points, {
            frame,
            anchor: "wrist",
            margin: 0,
            previous,
            smoothing: {
              alpha: 0.7,
              maxJumpPx: 160,
              maxScaleJump: 0.6,
              maxRotationDeg: 55,
            },
          });
          return { template, result, error: fitError(hand.points, result.alignedExpert) };
        });

        candidates.forEach((candidate) => {
          transformRef.current[hand.side][candidate.template] = candidate.result.transformPx;
        });

        const prevTemplate = templateRef.current[hand.side];
        const prevCandidate = candidates.find((candidate) => candidate.template === prevTemplate);
        let best = candidates.reduce((a, b) => (b.error < a.error ? b : a));

        if (prevCandidate && best.template !== prevTemplate) {
          if (best.error > prevCandidate.error * TEMPLATE_SWITCH_THRESHOLD) {
            best = prevCandidate;
          } else {
            templateRef.current[hand.side] = best.template;
          }
        } else if (!prevCandidate) {
          templateRef.current[hand.side] = best.template;
        }

        return best.result;
      }),
    [hands, frame]
  );
  const ghostHands = useMemo(() => alignmentResults.map((result) => result.alignedExpert), [alignmentResults]);
  const userHands = useMemo(() => hands.map((hand) => hand.points), [hands]);

  useEffect(() => {
    if (!hands.length || !ghostHands.length) {
      scoringRef.current.Left.reset();
      scoringRef.current.Right.reset();
      transformRef.current.Left.Left = null;
      transformRef.current.Left.Right = null;
      transformRef.current.Right.Left = null;
      transformRef.current.Right.Right = null;
      templateRef.current.Left = "Left";
      templateRef.current.Right = "Right";
      setScore(0);
      setTopErrors([]);
      return;
    }
    const toPixel = (point: Point2D) =>
      frame ? ([point[0] * frame.width, point[1] * frame.height] as Point2D) : point;
    const scores = hands.map((hand, idx) =>
      scoringRef.current[hand.side].score(hand.points.map(toPixel), ghostHands[idx].map(toPixel), {
        tolerancePx: 8,
      })
    );
    const avgScore = scores.reduce((acc, s) => acc + s.overall, 0) / scores.length;
    setScore(avgScore);
    const primaryIndex = hands.findIndex((hand) => hand.side === "Left");
    setTopErrors(scores[primaryIndex >= 0 ? primaryIndex : 0]?.topJoints ?? []);
  }, [hands, ghostHands]);

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
          <div ref={frameRef} className="rounded-2xl border border-border overflow-hidden bg-white shadow-md relative">
            <Camera ref={videoRef} className="aspect-video" mirrored />
            <OverlayCanvas
              width={width}
              height={height}
              videoWidth={videoWidth}
              videoHeight={videoHeight}
              className="absolute inset-0"
              userHands={userHands}
              ghostHands={ghostHands}
              mirror
              topErrors={topErrors}
              debug={DEBUG_OVERLAY}
              debugInfo={alignmentResults.map((result) => result.debug)}
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
                <li>
                  Hands:{" "}
                  {results.leftHand || results.rightHand
                    ? [results.leftHand ? "Left" : null, results.rightHand ? "Right" : null]
                        .filter(Boolean)
                        .join(" + ")
                    : "None detected"}
                </li>
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
              </ol>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
