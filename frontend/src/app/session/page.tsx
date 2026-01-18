"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sidebar } from "@/components/layout/Sidebar";
import { Camera } from "@/components/Camera";
import { OverlayCanvas } from "@/components/OverlayCanvas";
import { ScoreMeter } from "@/components/ScoreMeter";
import { ElevenLabsWidget } from "@/components/session/ElevenLabsWidget";
import { useElementSize } from "@/hooks/useElementSize";
import { useVideoMetrics } from "@/hooks/useVideoMetrics";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { alignHands, Point2D } from "@/lib/cv/alignment";
import { classifyFingerStates, matchLetter, HandState } from "@/lib/cv/asl-logic";
import { ScoringEngine } from "@/lib/cv/scoring";
import { useReferenceLandmarks } from "@/hooks/useReferenceLandmarks";
import { LetterGrid } from "@/components/session/LetterGrid";
import { motion, AnimatePresence } from "framer-motion";

const JOINT_NAMES: Record<number, string> = {
  0: "wrist",
  1: "thumb base", 2: "thumb", 3: "thumb knuckle", 4: "thumb tip",
  5: "index finger base", 6: "index finger", 7: "index knuckle", 8: "index tip",
  9: "middle finger base", 10: "middle finger", 11: "middle knuckle", 12: "middle tip",
  13: "ring finger base", 14: "ring finger", 15: "ring knuckle", 16: "ring tip",
  17: "pinky base", 18: "pinky finger", 19: "pinky knuckle", 20: "pinky tip"
};

function cueFromTopJoints(top: number[]) {
  if (top.length === 0) return "Match the ghost hand closely.";

  // Prioritize tips
  const tips = top.filter(id => [4, 8, 12, 16, 20].includes(id));
  if (tips.length > 0) {
    const jointName = JOINT_NAMES[tips[0]];
    return `Move your ${jointName} to match the ghost.`;
  }

  // Fallback to other joints
  const jointName = JOINT_NAMES[top[0]];
  return `Adjust your ${jointName}.`;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Hold duration in ms
const HOLD_DURATION = 1500;

export default function SessionPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [score, setScore] = useState(0);
  const [topErrors, setTopErrors] = useState<number[]>([]);
  const [selectedLetter, setSelectedLetter] = useState("A");
  const [isGridOpen, setIsGridOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Fetch reference landmarks from backend
  const { landmarks: referenceLandmarks, isLoading: isReferenceLoading } = useReferenceLandmarks(selectedLetter);

  // Hold Timer State
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const holdStartTimeRef = useRef<number | null>(null);

  const scoringRef = useRef<{ Left: ScoringEngine; Right: ScoringEngine }>({
    Left: new ScoringEngine(),
    Right: new ScoringEngine(),
  });

  const { results, loading, ready, error } = useMediaPipe(videoRef.current, {
    swapHandedness: true,
    minHandScore: 0.5,
    maxNumHands: 1, // Enforce 1 hand
    minDetectionConfidence: 0.7, // Matched to SecondHand Draft
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
    const entries: { side: "Left" | "Right"; points: Point2D[]; score: number; rawLandmarks?: number[][] }[] = [];
    if (leftHand && results.leftHand) entries.push({ side: "Left", points: leftHand, score: results.leftHand.score, rawLandmarks: results.leftHand.landmarks });
    if (rightHand && results.rightHand) entries.push({ side: "Right", points: rightHand, score: results.rightHand.score, rawLandmarks: results.rightHand.landmarks });
    return entries;
  }, [leftHand, rightHand, results]);

  const ghostHands = useMemo(() => {
    if (hands.length === 0) {
      return [referenceLandmarks];
    }
    return hands.map((hand) =>
      alignHands(referenceLandmarks, hand.points).alignedExpert
    );
  }, [hands, referenceLandmarks]);
  const userHands = useMemo(() => hands.map((hand) => hand.points), [hands]);

  useEffect(() => {
    if (!hands.length) {
      setScore(0);
      setTopErrors([]);
      setHoldProgress(0);
      holdStartTimeRef.current = null;
      return;
    }

    const hand = hands[0];
    if (hand && hand.rawLandmarks) {
      // 1. Boolean Accuracy (0-100)
      const fingerState = classifyFingerStates(hand.rawLandmarks);
      const { accuracy: booleanAccuracy } = matchLetter(fingerState, selectedLetter);

      // 2. Geometric Score (0-100)
      const geometricResult = scoringRef.current[hand.side].score(hand.points, ghostHands[0]);
      const geometricScore = geometricResult.overall;

      // 3. Combined Score (Weighted)
      // Relaxed Logic: 70% Boolean (Easy), 30% Geometric (Hard)
      const combinedScore = (booleanAccuracy * 0.7) + (geometricScore * 0.3);

      setScore(combinedScore);

      // 4. Hold Logic
      if (combinedScore >= 85 && !isCompleted) {
        const now = Date.now();
        if (!holdStartTimeRef.current) {
          holdStartTimeRef.current = now;
        }

        const elapsed = now - holdStartTimeRef.current;
        const progress = Math.min(100, (elapsed / HOLD_DURATION) * 100);
        setHoldProgress(progress);

        if (elapsed >= HOLD_DURATION) {
          setIsCompleted(true);
          setHoldProgress(100); // Ensure full ring
          holdStartTimeRef.current = null; // Reset
        }
      } else {
        // Reset if score drops
        holdStartTimeRef.current = null;
        setHoldProgress(0);
      }

      // Errors
      const scores = hands.map((hand, idx) => scoringRef.current[hand.side].score(hand.points, ghostHands[idx]));
      const primaryIndex = hands.findIndex((hand) => hand.side === "Left");
      setTopErrors(scores[primaryIndex >= 0 ? primaryIndex : 0]?.topJoints ?? []);
    }

  }, [hands, ghostHands, selectedLetter, isCompleted]);

  const cue = useMemo(() => cueFromTopJoints(topErrors), [topErrors]);

  const handleNextLetter = () => {
    const currentIndex = ALPHABET.indexOf(selectedLetter);
    const nextIndex = (currentIndex + 1) % ALPHABET.length;
    setSelectedLetter(ALPHABET[nextIndex]);
    setIsCompleted(false);
    setHoldProgress(0);
    holdStartTimeRef.current = null;
  };

  return (
    <main className="flex min-h-screen selection:bg-[var(--stone-300)] selection:text-[var(--stone-900)] bg-[var(--stone-100)]">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="ml-[70px] w-[calc(100%-70px)] p-6 md:p-8 flex flex-col h-screen overflow-hidden relative">

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
              onSelect={(l) => {
                setSelectedLetter(l);
                setIsCompleted(false);
                setHoldProgress(0);
                holdStartTimeRef.current = null;
              }}
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

              {/* Reference Image Overlay (Top Right) */}
              <div className="absolute top-4 right-4 w-32 h-32 rounded-xl overflow-hidden glass-panel border border-white/40 shadow-lg transition-opacity duration-300 hover:opacity-100 opacity-80 z-20">
                <div className="relative w-full h-full bg-white">
                  <Image
                    src={`/asl-images/${selectedLetter}.png`}
                    alt={`ASL Letter ${selectedLetter}`}
                    fill
                    className="object-contain p-2"
                  />
                </div>
              </div>

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

            {/* Live Cue Banner OR Success Alert */}
            <div className="h-24 glass-nav rounded-xl p-6 flex flex-col justify-center border border-white/50 relative overflow-hidden flex-none">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--stone-900)]" />
              <AnimatePresence mode="wait">
                {isCompleted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between w-full h-full"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-xs font-bold tracking-widest uppercase">COMPLETE</p>
                      </div>
                      <p className="text-xl text-[var(--stone-900)] font-light mt-1">
                        You mastered <span className="font-semibold">{selectedLetter}</span>!
                      </p>
                    </div>
                    <button
                      onClick={handleNextLetter}
                      className="bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                    >
                      Next Letter
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="cue"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                      Live Correction
                    </p>
                    <p className="text-xl text-[var(--stone-800)] font-light" style={{ fontFamily: 'var(--font-heading)' }}>
                      {cue}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column: Controls & AI (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6 h-full min-h-0">

            {/* Score Card - Fixed height at top */}
            <div className={`glass-panel rounded-2xl p-6 border border-white/60 shadow-sm flex-none transition-colors duration-500 ${score >= 85 ? 'bg-emerald-50/50 border-emerald-200' : ''} relative overflow-hidden`}>

              {/* Hold Progress Background */}
              {holdProgress > 0 && (
                <div
                  className="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-100 ease-linear z-10"
                  style={{ width: `${holdProgress}%` }}
                />
              )}

              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)]" style={{ fontFamily: 'var(--font-mono)' }}>
                    Accuracy Score
                  </p>
                  <h2 className="text-4xl font-light text-[var(--stone-900)] mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
                    {Math.round(score)}<span className="text-lg text-[var(--stone-400)] font-normal">%</span>
                  </h2>
                  {/* Hold Instruction */}
                  {score >= 85 && holdProgress < 100 && (
                    <p className="text-xs text-emerald-600 font-bold animate-pulse mt-1">HOLD STEADY...</p>
                  )}
                </div>
                <div className="relative">
                  <ScoreMeter score={score} />
                  {/* Optional: Add a ring around ScoreMeter for hold progress if preferred */}
                  {holdProgress > 0 && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500" strokeDasharray="289" strokeDashoffset={289 - (289 * holdProgress / 100)} />
                    </svg>
                  )}
                </div>
              </div>
              <div className="w-full bg-[var(--stone-200)] h-1 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${score >= 85 ? 'bg-emerald-500' : 'bg-[var(--stone-900)]'}`}
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
