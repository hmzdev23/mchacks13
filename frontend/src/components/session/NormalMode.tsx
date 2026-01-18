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
import { addOuterPalmNode } from "@/lib/cv/landmarks";
import { loadRestingPose } from "@/lib/packs/packLoader";
import { KeypointFrame } from "@/lib/packs/types";

function cueFromTopJoints(top: number[]) {
  if (top.includes(8) || top.includes(12)) return "Open fingers slightly wider.";
  if (top.includes(4)) return "Adjust your thumb position.";
  if (top.includes(21)) return "Align the outer palm edge (pinky side).";
  if (top.includes(0)) return "Center your wrist inside the ghost.";
  return "Match the ghost hand closely.";
}

interface NormalModeProps {
  className?: string;
}

export function NormalMode({ className }: NormalModeProps) {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const scoringRef = useRef<{ Left: ScoringEngine; Right: ScoringEngine }>({
    Left: new ScoringEngine(),
    Right: new ScoringEngine(),
  });

  const [score, setScore] = useState(0);
  const [topErrors, setTopErrors] = useState<number[]>([]);
  const [restFrame, setRestFrame] = useState<KeypointFrame | null>(null);

  const { results, loading, ready, error } = useMediaPipe(videoElement, {
    swapHandedness: true,
    minHandScore: 0.5,
    maxNumHands: 2,
  });

  const { width, height } = useElementSize(frameRef.current);
  const { width: videoWidth, height: videoHeight } = useVideoMetrics(videoElement);

  // Load resting pose on mount
  useEffect(() => {
    let cancelled = false;
    const loadRest = async () => {
      try {
        const keypoints = await loadRestingPose("asl");
        if (cancelled) return;
        setRestFrame(keypoints[0] ?? null);
      } catch (err) {
        console.warn("Rest pose load error, using default:", err);
      }
    };
    loadRest();
    return () => { cancelled = true; };
  }, []);

  // Process hands with outer palm node
  const leftHand = useMemo(
    () => results.leftHand
      ? addOuterPalmNode(results.leftHand.landmarks.map(([x, y]) => [x, y] as Point2D))
      : null,
    [results]
  );
  const rightHand = useMemo(
    () => results.rightHand
      ? addOuterPalmNode(results.rightHand.landmarks.map(([x, y]) => [x, y] as Point2D))
      : null,
    [results]
  );

  const userHands = useMemo(() => {
    const entries: { side: "Left" | "Right"; points: Point2D[]; score: number }[] = [];
    if (leftHand && results.leftHand) entries.push({ side: "Left", points: leftHand, score: results.leftHand.score });
    if (rightHand && results.rightHand) entries.push({ side: "Right", points: rightHand, score: results.rightHand.score });
    return entries;
  }, [leftHand, rightHand, results]);

  // Get expert hands from resting frame
  const expertHandsBySide = useMemo(() => {
    const left = restFrame?.left_hand?.map(([x, y]) => [x, y] as Point2D) || null;
    const right = restFrame?.right_hand?.map(([x, y]) => [x, y] as Point2D) || null;
    return {
      Left: addOuterPalmNode(left),
      Right: addOuterPalmNode(right),
    };
  }, [restFrame]);

  const mirrorAroundWrist = (hand: Point2D[]): Point2D[] => {
    const wristX = hand[0]?.[0] ?? 0.5;
    return hand.map(([x, y]) => [2 * wristX - x, y] as Point2D);
  };

  const alignedHands = useMemo(() => {
    return userHands.map((hand) => {
      const expert =
        expertHandsBySide[hand.side] ||
        (hand.side === "Left" ? expertHandsBySide.Right : expertHandsBySide.Left);
      if (!expert) return { side: hand.side, user: hand.points, ghost: null };
      const expertForSide = expertHandsBySide[hand.side] ? expert : mirrorAroundWrist(expert);
      return {
        side: hand.side,
        user: hand.points,
        ghost: alignHands(expertForSide, hand.points).alignedExpert,
      };
    });
  }, [userHands, expertHandsBySide]);

  useEffect(() => {
    const active = alignedHands.filter((entry) => entry.ghost);
    if (!active.length) {
      scoringRef.current.Left.reset();
      scoringRef.current.Right.reset();
      setScore(0);
      setTopErrors([]);
      return;
    }
    const scores = active.map((entry) =>
      scoringRef.current[entry.side].score(entry.user, entry.ghost as Point2D[])
    );
    const avgScore = scores.reduce((acc, s) => acc + s.overall, 0) / scores.length;
    setScore(avgScore);
    const primary = active.findIndex((entry) => entry.side === "Left");
    const primaryScore = scores[primary >= 0 ? primary : 0];
    setTopErrors(primaryScore?.topJoints ?? []);
  }, [alignedHands]);

  const cue = useMemo(() => cueFromTopJoints(topErrors), [topErrors]);

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Header */}
      <header className="flex justify-between items-center mb-4 flex-none">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>
              Testing Mode
            </p>
          </div>
          <h1 className="text-2xl text-[var(--stone-900)] tracking-tight" style={{ fontFamily: 'var(--font-heading)', fontWeight: 200 }}>
            Resting Hand <span className="font-semibold">Calibration</span>
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
              userHands={alignedHands.map((entry) => entry.user)}
              ghostHands={alignedHands.flatMap((entry) => (entry.ghost ? [entry.ghost] : []))}
              mirror
              topErrors={topErrors}
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

            {/* FPS Badge */}
            <div className="absolute bottom-4 left-4 z-10 glass-panel px-3 py-1.5 rounded-full flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${ready && !loading ? 'bg-blue-500 animate-pulse' : 'bg-[var(--stone-400)]'}`} />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--stone-600)]">
                {results.fps ? `${Math.round(results.fps)} FPS` : "Ready"}
              </span>
            </div>
          </div>

          {/* Cue Bar */}
          <div className="h-20 glass-nav rounded-xl p-4 flex flex-col justify-center border border-white/50 relative overflow-hidden flex-none">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
            <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
              Alignment Feedback
            </p>
            <p className="text-lg text-[var(--stone-800)] font-light" style={{ fontFamily: 'var(--font-heading)' }}>
              {cue}
            </p>
          </div>
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full min-h-0">
          {/* Debug Panel */}
          <div className="glass-panel rounded-2xl p-5 border border-white/60 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)] mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
              Debug Info
            </p>
            <ul className="text-sm text-[var(--stone-600)] space-y-2">
              <li className="flex justify-between">
                <span>FPS:</span>
                <span className="font-mono font-medium">{results.fps || "..."}</span>
              </li>
              <li className="flex justify-between">
                <span>Hands Detected:</span>
                <span className="font-medium">
                  {results.leftHand && results.rightHand ? "Left + Right" : results.leftHand ? "Left" : results.rightHand ? "Right" : "None"}
                </span>
              </li>
              <li className="flex justify-between">
                <span>Left Score:</span>
                <span className="font-mono">{results.leftHand?.score.toFixed(3) || "N/A"}</span>
              </li>
              <li className="flex justify-between">
                <span>Right Score:</span>
                <span className="font-mono">{results.rightHand?.score.toFixed(3) || "N/A"}</span>
              </li>
              <li className="flex justify-between">
                <span>Status:</span>
                <span className={`font-medium ${ready ? 'text-blue-600' : ''}`}>
                  {loading ? "Starting..." : ready ? "Live" : "Waiting"}
                </span>
              </li>
            </ul>
          </div>

          {/* Top Errors */}
          <div className="glass-panel rounded-2xl p-5 border border-white/60 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)] mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
              Top Error Joints
            </p>
            <div className="flex flex-wrap gap-2">
              {topErrors.length > 0 ? topErrors.map((joint) => (
                <span key={joint} className="px-2 py-1 text-xs font-mono bg-red-100 text-red-700 rounded">
                  Joint {joint}
                </span>
              )) : (
                <span className="text-sm text-[var(--stone-500)]">No errors detected</span>
              )}
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="glass-panel rounded-2xl p-5 border border-white/60 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)] mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
              Score
            </p>
            <div className="text-4xl font-light text-[var(--stone-900)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {Math.round(score)}<span className="text-lg text-[var(--stone-400)]">%</span>
            </div>
            <div className="mt-3 w-full bg-[var(--stone-200)] h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="glass-panel rounded-2xl p-5 border border-white/60 shadow-sm flex-1">
            <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)] mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
              Testing Mode Info
            </p>
            <p className="text-sm text-[var(--stone-600)] mb-3">
              This mode shows a resting hand overlay to verify tracking and alignment quality.
            </p>
            <ul className="text-sm text-[var(--stone-600)] space-y-2">
              <li>- Supports both hands simultaneously</li>
              <li>- Uses 22-point tracking (with palm edge)</li>
              <li>- Debug panel shows raw detection scores</li>
              <li>- Use this to calibrate before practice</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
