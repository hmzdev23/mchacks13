"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Camera } from "@/components/Camera";
import { HandOverlayCanvas } from "@/components/HandOverlayCanvas";
import { ScoreMeter } from "@/components/ScoreMeter";
import { ElevenLabsWidget } from "@/components/session/ElevenLabsWidget";
import { useElementSize } from "@/hooks/useElementSize";
import { useVideoMetrics } from "@/hooks/useVideoMetrics";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { alignHands, Point2D } from "@/lib/cv/alignment";
import { classifyFingerStates, matchLetter } from "@/lib/cv/asl-logic";
import { ScoringEngine } from "@/lib/cv/scoring";
import { addOuterPalmNode } from "@/lib/cv/landmarks";
import { useReferenceLandmarks } from "@/hooks/useReferenceLandmarks";
import { LetterGrid } from "@/components/session/LetterGrid";
import { WordGrid } from "@/components/session/WordGrid";
import { PhraseInput } from "@/components/session/PhraseInput";
import { useSessionStore } from "@/store/sessionStore";
import { motion, AnimatePresence } from "framer-motion";
import { loadPack, loadLessonKeypoints } from "@/lib/packs/packLoader";
import { LessonMeta, KeypointFrame } from "@/lib/packs/types";

const JOINT_NAMES: Record<number, string> = {
  0: "wrist",
  1: "thumb base", 2: "thumb", 3: "thumb knuckle", 4: "thumb tip",
  5: "index finger base", 6: "index finger", 7: "index knuckle", 8: "index tip",
  9: "middle finger base", 10: "middle finger", 11: "middle knuckle", 12: "middle tip",
  13: "ring finger base", 14: "ring finger", 15: "ring knuckle", 16: "ring tip",
  17: "pinky base", 18: "pinky finger", 19: "pinky knuckle", 20: "pinky tip",
  21: "outer palm"
};

function cueFromTopJoints(top: number[]) {
  if (top.length === 0) return "Match the ghost hand closely.";
  const tips = top.filter(id => [4, 8, 12, 16, 20].includes(id));
  if (tips.length > 0) {
    const jointName = JOINT_NAMES[tips[0]];
    return `Move your ${jointName} to match the ghost.`;
  }
  if (top.includes(21)) return "Align the outer palm edge (pinky side).";
  const jointName = JOINT_NAMES[top[0]];
  return `Adjust your ${jointName}.`;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const HOLD_DURATION = 1500;

interface ASLModeProps {
  className?: string;
}

export function ASLMode({ className }: ASLModeProps) {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [score, setScore] = useState(0);
  const [topErrors, setTopErrors] = useState<number[]>([]);
  const [selectedLetter, setSelectedLetter] = useState("A");
  const [isGridOpen, setIsGridOpen] = useState(false);
  const [isWordGridOpen, setIsWordGridOpen] = useState(false);
  const [isPhraseInputOpen, setIsPhraseInputOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [contentType, setContentType] = useState<'letter' | 'word' | 'phrase'>('letter');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [phraseSequence, setPhraseSequence] = useState<string[]>([]);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [phraseGloss, setPhraseGloss] = useState<string>("");
  const [phraseHints, setPhraseHints] = useState<Record<string, string>>({});

  // Pack data for words
  const [packLessons, setPackLessons] = useState<LessonMeta[]>([]);
  const [wordKeypoints, setWordKeypoints] = useState<Point2D[] | null>(null);
  const [wordKeypointsLoading, setWordKeypointsLoading] = useState(false);

  // Load pack on mount
  useEffect(() => {
    loadPack("asl").then(pack => {
      setPackLessons(pack.lessons);
    }).catch(err => console.error("Failed to load ASL pack:", err));
  }, []);

  // Fetch reference landmarks for letters
  const { landmarks: letterLandmarks, isLoading: isReferenceLoading } = useReferenceLandmarks(selectedLetter);

  // Load word keypoints when a word is selected
  useEffect(() => {
    if (contentType !== 'word' || !selectedWordId) {
      setWordKeypoints(null);
      return;
    }

    const lesson = packLessons.find(l => l.id === selectedWordId);
    if (!lesson) return;

    setWordKeypointsLoading(true);
    loadLessonKeypoints(lesson.keypoints_url)
      .then((frames: KeypointFrame[]) => {
        // Get first frame's right_hand keypoints (or left_hand as fallback)
        const firstFrame = frames[0];
        if (firstFrame?.right_hand) {
          const points: Point2D[] = firstFrame.right_hand.map(([x, y]) => [x, y] as Point2D);
          setWordKeypoints(points);
        } else if (firstFrame?.left_hand) {
          const points: Point2D[] = firstFrame.left_hand.map(([x, y]) => [x, y] as Point2D);
          setWordKeypoints(points);
        }
      })
      .catch(err => console.error("Failed to load word keypoints:", err))
      .finally(() => setWordKeypointsLoading(false));
  }, [contentType, selectedWordId, packLessons]);

  // Load phrase sequence keypoints
  useEffect(() => {
    if (contentType !== 'phrase' || phraseSequence.length === 0) return;

    const currentLessonId = phraseSequence[phraseIndex];
    if (!currentLessonId) return;

    // Check if it's a letter lesson
    if (currentLessonId.startsWith('letter-')) {
      const letter = currentLessonId.replace('letter-', '').toUpperCase();
      setSelectedLetter(letter);
      setWordKeypoints(null);
      return;
    }

    // Otherwise load word keypoints
    const lesson = packLessons.find(l => l.id === currentLessonId);
    if (!lesson) return;

    setWordKeypointsLoading(true);
    loadLessonKeypoints(lesson.keypoints_url)
      .then((frames: KeypointFrame[]) => {
        const firstFrame = frames[0];
        if (firstFrame?.right_hand) {
          const points: Point2D[] = firstFrame.right_hand.map(([x, y]) => [x, y] as Point2D);
          setWordKeypoints(points);
        } else if (firstFrame?.left_hand) {
          const points: Point2D[] = firstFrame.left_hand.map(([x, y]) => [x, y] as Point2D);
          setWordKeypoints(points);
        }
      })
      .catch(err => console.error("Failed to load phrase keypoints:", err))
      .finally(() => setWordKeypointsLoading(false));
  }, [contentType, phraseSequence, phraseIndex, packLessons]);

  // Get the active reference landmarks based on content type
  const referenceLandmarks = useMemo(() => {
    if (contentType === 'word' && wordKeypoints) {
      return wordKeypoints;
    }
    if (contentType === 'phrase') {
      const currentLessonId = phraseSequence[phraseIndex];
      if (currentLessonId?.startsWith('letter-')) {
        return letterLandmarks;
      }
      if (wordKeypoints) {
        return wordKeypoints;
      }
    }
    return letterLandmarks;
  }, [contentType, wordKeypoints, letterLandmarks, phraseSequence, phraseIndex]);

  // Hold Timer State
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStartTimeRef = useRef<number | null>(null);

  const scoringRef = useRef<{ Left: ScoringEngine; Right: ScoringEngine }>({
    Left: new ScoringEngine(),
    Right: new ScoringEngine(),
  });

  const { results, loading, ready, error } = useMediaPipe(videoElement, {
    swapHandedness: true,
    minHandScore: 0.5,
    maxNumHands: 2,
    minDetectionConfidence: 0.7,
  });

  const { width, height } = useElementSize(frameRef.current);
  const { width: videoWidth, height: videoHeight } = useVideoMetrics(videoElement);

  // Process hands with outer palm node for better tracking
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

  const hands = useMemo(() => {
    const entries: { side: "Left" | "Right"; points: Point2D[]; score: number; rawLandmarks?: number[][] }[] = [];
    if (leftHand && results.leftHand) entries.push({ side: "Left", points: leftHand, score: results.leftHand.score, rawLandmarks: results.leftHand.landmarks });
    if (rightHand && results.rightHand) entries.push({ side: "Right", points: rightHand, score: results.rightHand.score, rawLandmarks: results.rightHand.landmarks });
    return entries;
  }, [leftHand, rightHand, results]);

  const ghostHands = useMemo(() => {
    if (hands.length === 0) return [referenceLandmarks];
    return hands.map((hand) => alignHands(referenceLandmarks, hand.points).alignedExpert);
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
      const fingerState = classifyFingerStates(hand.rawLandmarks);
      const { accuracy: booleanAccuracy } = matchLetter(fingerState, selectedLetter);
      const geometricResult = scoringRef.current[hand.side].score(hand.points, ghostHands[0]);
      const geometricScore = geometricResult.overall;
      const combinedScore = (booleanAccuracy * 0.7) + (geometricScore * 0.3);

      setScore(combinedScore);

      if (combinedScore >= 85 && !isCompleted) {
        const now = Date.now();
        if (!holdStartTimeRef.current) holdStartTimeRef.current = now;
        const elapsed = now - holdStartTimeRef.current;
        const progress = Math.min(100, (elapsed / HOLD_DURATION) * 100);
        setHoldProgress(progress);

        if (elapsed >= HOLD_DURATION) {
          setIsCompleted(true);
          setHoldProgress(100);
          holdStartTimeRef.current = null;
        }
      } else {
        holdStartTimeRef.current = null;
        setHoldProgress(0);
      }

      setTopErrors(geometricResult.topJoints ?? []);
    }
  }, [hands, ghostHands, selectedLetter, isCompleted]);

  const cue = useMemo(() => cueFromTopJoints(topErrors), [topErrors]);

  // Navigation handlers
  const handleNextLetter = () => {
    const currentIndex = ALPHABET.indexOf(selectedLetter);
    const nextIndex = (currentIndex + 1) % ALPHABET.length;
    setSelectedLetter(ALPHABET[nextIndex]);
    setIsCompleted(false);
    setHoldProgress(0);
    holdStartTimeRef.current = null;
  };

  const handleNextInPhrase = useCallback(() => {
    if (phraseIndex < phraseSequence.length - 1) {
      setPhraseIndex(phraseIndex + 1);
      setIsCompleted(false);
      setHoldProgress(0);
      holdStartTimeRef.current = null;
    }
  }, [phraseIndex, phraseSequence.length]);

  const handlePrevInPhrase = useCallback(() => {
    if (phraseIndex > 0) {
      setPhraseIndex(phraseIndex - 1);
      setIsCompleted(false);
      setHoldProgress(0);
      holdStartTimeRef.current = null;
    }
  }, [phraseIndex]);

  const handleWordSelect = useCallback((wordId: string, wordName: string) => {
    setSelectedWordId(wordId);
    setSelectedWord(wordName);
    setIsCompleted(false);
    setHoldProgress(0);
    holdStartTimeRef.current = null;
  }, []);

  const handlePhraseSubmit = useCallback((sequence: string[], gloss: string, hints: Record<string, string>) => {
    setPhraseSequence(sequence);
    setPhraseGloss(gloss);
    setPhraseHints(hints);
    setPhraseIndex(0);
    setIsCompleted(false);
    setHoldProgress(0);
    holdStartTimeRef.current = null;
  }, []);

  // Get current display name for phrase mode
  const getCurrentPhraseItemName = useCallback(() => {
    if (phraseSequence.length === 0) return null;
    const currentLessonId = phraseSequence[phraseIndex];
    if (currentLessonId?.startsWith('letter-')) {
      return currentLessonId.replace('letter-', '').toUpperCase();
    }
    const lesson = packLessons.find(l => l.id === currentLessonId);
    return lesson?.name.replace('Word ', '') || currentLessonId;
  }, [phraseSequence, phraseIndex, packLessons]);

  // Get title based on content type
  const getTitle = () => {
    switch (contentType) {
      case 'letter':
        return <>Practice Letter: <span className="font-semibold">{selectedLetter}</span></>;
      case 'word':
        return <>Practice Word: <span className="font-semibold">{selectedWord || 'Select a Word'}</span></>;
      case 'phrase':
        if (phraseSequence.length === 0) {
          return <>Practice Phrase: <span className="font-semibold">Enter a Phrase</span></>;
        }
        return (
          <>
            Phrase: <span className="font-semibold">{phraseGloss}</span>
            <span className="text-base text-[var(--stone-500)] ml-2">
              ({phraseIndex + 1}/{phraseSequence.length})
            </span>
          </>
        );
      default:
        return "ASL Practice";
    }
  };

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Header */}
      <header className="flex justify-between items-center mb-6 flex-none pr-52">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] uppercase tracking-widest text-[var(--stone-400)] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>
              ASL Session Active
            </p>
          </div>
          <h1 className="text-3xl text-[var(--stone-900)] tracking-tight" style={{ fontFamily: 'var(--font-heading)', fontWeight: 200 }}>
            {getTitle()}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Content Type Toggle */}
          <div className="flex items-center gap-1 bg-[var(--stone-200)] rounded-lg p-1">
            <button
              onClick={() => setContentType('letter')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${contentType === 'letter' ? 'bg-white shadow-sm text-[var(--stone-900)]' : 'text-[var(--stone-600)]'
                }`}
            >
              Letters
            </button>
            <button
              onClick={() => setContentType('phrase')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${contentType === 'phrase' ? 'bg-white shadow-sm text-[var(--stone-900)]' : 'text-[var(--stone-600)]'
                }`}
            >
              Phrases
            </button>
          </div>

          {/* Content Selector - varies by mode */}
          {contentType === 'letter' && (
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
          )}

          {contentType === 'word' && (
            <button
              onClick={() => setIsWordGridOpen(true)}
              className="group flex items-center gap-3 bg-[var(--stone-900)] text-white px-5 py-2.5 rounded-full hover:bg-[var(--stone-800)] transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              {selectedWord && (
                <div className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                  {selectedWord}
                </div>
              )}
              <span className="text-sm font-medium">{selectedWord ? 'Change Word' : 'Select Word'}</span>
              <svg className="w-4 h-4 text-white/60 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {contentType === 'phrase' && (
            <div className="flex items-center gap-2">
              {phraseSequence.length > 0 && (
                <>
                  <button
                    onClick={handlePrevInPhrase}
                    disabled={phraseIndex === 0}
                    className="p-2 rounded-full bg-[var(--stone-200)] hover:bg-[var(--stone-300)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5 text-[var(--stone-700)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="px-4 py-2 bg-[var(--stone-100)] rounded-lg text-sm font-medium text-[var(--stone-700)]">
                    {getCurrentPhraseItemName()}
                  </div>
                  <button
                    onClick={handleNextInPhrase}
                    disabled={phraseIndex >= phraseSequence.length - 1}
                    className="p-2 rounded-full bg-[var(--stone-200)] hover:bg-[var(--stone-300)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5 text-[var(--stone-700)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
              <button
                onClick={() => setIsPhraseInputOpen(true)}
                className="group flex items-center gap-3 bg-[var(--stone-900)] text-white px-5 py-2.5 rounded-full hover:bg-[var(--stone-800)] transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <span className="text-sm font-medium">{phraseSequence.length > 0 ? 'New Phrase' : 'Enter Phrase'}</span>
                <svg className="w-4 h-4 text-white/60 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          )}

          {/* Modals */}
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

          <WordGrid
            isOpen={isWordGridOpen}
            onClose={() => setIsWordGridOpen(false)}
            onSelect={handleWordSelect}
            currentWord={selectedWordId}
          />

          <PhraseInput
            isOpen={isPhraseInputOpen}
            onClose={() => setIsPhraseInputOpen(false)}
            onSubmit={handlePhraseSubmit}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        <div className="lg:col-span-8 flex flex-col gap-6 h-full min-h-0">
          <div ref={frameRef} className="glass-heavy rounded-2xl border border-white/50 overflow-hidden shadow-xl relative flex-1 min-h-0 bg-black">
            <Camera ref={setVideoElement} className="w-full h-full object-cover" mirrored />
            <HandOverlayCanvas
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

            {/* Reference Image */}
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

            {/* Loading/Error State */}
            {(!ready || loading || error) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--stone-100)]/80 backdrop-blur-md z-20">
                {loading ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--stone-300)] border-t-[var(--stone-900)] animate-spin" />
                    <p className="text-sm font-medium text-[var(--stone-600)]">Initializing Hand Tracking...</p>
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

            {/* FPS + Hands Debug */}
            <div className="absolute bottom-4 left-4 z-10 glass-panel px-3 py-1.5 rounded-full flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${ready && !loading ? 'bg-emerald-500 animate-pulse' : 'bg-[var(--stone-400)]'}`} />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--stone-600)]">
                {results.fps ? `${Math.round(results.fps)} FPS` : "Ready"}
              </span>
              <span className="text-[10px] text-[var(--stone-500)]">
                {results.leftHand && results.rightHand ? "2 hands" : results.leftHand || results.rightHand ? "1 hand" : "No hands"}
              </span>
            </div>
          </div>

          {/* Cue Bar */}
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
                      {contentType === 'letter' && <>You mastered <span className="font-semibold">{selectedLetter}</span>!</>}
                      {contentType === 'word' && <>You mastered <span className="font-semibold">{selectedWord}</span>!</>}
                      {contentType === 'phrase' && (
                        phraseIndex < phraseSequence.length - 1
                          ? <>Great! <span className="font-semibold">{getCurrentPhraseItemName()}</span> complete!</>
                          : <>You completed the phrase <span className="font-semibold">{phraseGloss}</span>!</>
                      )}
                    </p>
                  </div>
                  {contentType === 'letter' && (
                    <button
                      onClick={handleNextLetter}
                      className="bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                    >
                      Next Letter
                    </button>
                  )}
                  {contentType === 'word' && (
                    <button
                      onClick={() => setIsWordGridOpen(true)}
                      className="bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                    >
                      Choose Next Word
                    </button>
                  )}
                  {contentType === 'phrase' && (
                    phraseIndex < phraseSequence.length - 1 ? (
                      <button
                        onClick={handleNextInPhrase}
                        className="bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                      >
                        Next Sign
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsPhraseInputOpen(true)}
                        className="bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                      >
                        New Phrase
                      </button>
                    )
                  )}
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

        {/* Right Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full min-h-0">
          {/* Score Panel */}
          <div className={`glass-panel rounded-2xl p-6 border border-white/60 shadow-sm flex-none transition-colors duration-500 ${score >= 85 ? 'bg-emerald-50/50 border-emerald-200' : ''} relative overflow-hidden`}>
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
                {score >= 85 && holdProgress < 100 && (
                  <p className="text-xs text-emerald-600 font-bold animate-pulse mt-1">HOLD STEADY...</p>
                )}
              </div>
              <div className="relative">
                <ScoreMeter score={score} />
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

          {/* ElevenLabs Widget */}
          <div className="glass-heavy rounded-2xl border border-white/50 shadow-lg relative overflow-hidden flex-1 min-h-[400px]">
            <ElevenLabsWidget feedback={`Score: ${Math.round(score)}%. Suggestion: ${cue}`} score={score} />
          </div>
        </div>
      </div>
    </div>
  );
}
