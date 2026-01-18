"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Camera } from "@/components/Camera";
import { OverlayCanvas } from "@/components/OverlayCanvas";
import { ScoreMeter } from "@/components/ScoreMeter";
import { useElementSize } from "@/hooks/useElementSize";
import { useVideoMetrics } from "@/hooks/useVideoMetrics";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { alignHands, Point2D } from "@/lib/cv/alignment";
import { ScoringEngine } from "@/lib/cv/scoring";
import { addOuterPalmNode } from "@/lib/cv/landmarks";
import { loadLessonKeypoints, loadLessonSegments, loadPack, loadPhrases } from "@/lib/packs/packLoader";
import { KeypointFrame, LessonMeta, LessonSegments, PackMeta, PhraseEntry } from "@/lib/packs/types";

function cueFromTopJoints(top: number[]) {
  if (top.includes(8) || top.includes(12)) return "Open fingers slightly wider.";
  if (top.includes(4)) return "Adjust your thumb position.";
  if (top.includes(21)) return "Align the outer palm edge (pinky side).";
  if (top.includes(0)) return "Center your wrist inside the ghost.";
  return "Match the ghost hand closely.";
}

export default function SessionPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const scoringRef = useRef<{ Left: ScoringEngine; Right: ScoringEngine }>({
    Left: new ScoringEngine(),
    Right: new ScoringEngine(),
  });
  const advanceRef = useRef(false);

  const [score, setScore] = useState(0);
  const [topErrors, setTopErrors] = useState<number[]>([]);
  const [pack, setPack] = useState<PackMeta | null>(null);
  const [phrases, setPhrases] = useState<PhraseEntry[]>([]);
  const [practiceMode, setPracticeMode] = useState<"normal" | "guided">("guided");
  const [isLearning, setIsLearning] = useState(false);
  const [mode, setMode] = useState<"phrase" | "lesson">("phrase");
  const [phraseSource, setPhraseSource] = useState<"library" | "custom">("library");
  const [customPhrase, setCustomPhrase] = useState("");
  const [phraseError, setPhraseError] = useState<string | null>(null);
  const [nlpStatus, setNlpStatus] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [selectedPhraseId, setSelectedPhraseId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [sequence, setSequence] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [frames, setFrames] = useState<KeypointFrame[]>([]);
  const [segments, setSegments] = useState<LessonSegments | null>(null);
  const [loopMode, setLoopMode] = useState(true);
  const [frameIndex, setFrameIndex] = useState(0);
  const holdStartRef = useRef<number | null>(null);
  const lastPromptRef = useRef<number>(0);
  const [restFrame, setRestFrame] = useState<KeypointFrame | null>(null);

  const { results, loading, ready, error } = useMediaPipe(videoRef.current, {
    swapHandedness: true,
    minHandScore: 0.6,
  });
  const { width, height } = useElementSize(frameRef.current);
  const { width: videoWidth, height: videoHeight } = useVideoMetrics(videoRef.current);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const [packData, phraseData] = await Promise.all([loadPack("asl"), loadPhrases("asl")]);
        if (cancelled) return;
        setPack(packData);
        setPhrases(phraseData.phrases);
        setSelectedPhraseId(phraseData.phrases[0]?.id || "");
        const defaultLesson = packData.lessons.find((lesson) => lesson.type === "word") || packData.lessons[0];
        setSelectedLessonId(defaultLesson?.id || "");
      } catch (err) {
        console.error("Pack load error", err);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadRest = async () => {
      if (!pack) return;
      const restLesson = pack.lessons.find((lesson) => lesson.id === "letter-b") || pack.lessons[0];
      if (!restLesson) return;
      try {
        const keypoints = await loadLessonKeypoints(restLesson.keypoints_url);
        if (cancelled) return;
        setRestFrame(keypoints[0] ?? null);
      } catch (err) {
        console.warn("Rest pose load error", err);
      }
    };
    loadRest();
    return () => {
      cancelled = true;
    };
  }, [pack]);

  const activePhrase = useMemo(
    () => phrases.find((phrase) => phrase.id === selectedPhraseId) || null,
    [phrases, selectedPhraseId]
  );

  useEffect(() => {
    if (mode === "phrase" && phraseSource === "library" && activePhrase) {
      setSequence(activePhrase.sequence);
      setCurrentIndex(0);
    }
  }, [mode, activePhrase, phraseSource]);

  useEffect(() => {
    if (mode === "lesson" && selectedLessonId) {
      setSequence([selectedLessonId]);
      setCurrentIndex(0);
    }
  }, [mode, selectedLessonId]);

  useEffect(() => {
    if (mode === "phrase") {
      setLoopMode(false);
    }
  }, [mode]);

  useEffect(() => {
    if (practiceMode === "normal") {
      setIsLearning(false);
    }
  }, [practiceMode]);

  useEffect(() => {
    setIsLearning(false);
    holdStartRef.current = null;
    lastPromptRef.current = 0;
    advanceRef.current = false;
  }, [mode, phraseSource, selectedPhraseId, selectedLessonId, sequence]);

  const currentLessonId = sequence[currentIndex] || "";
  const currentLesson: LessonMeta | null = useMemo(() => {
    if (!pack || !currentLessonId) return null;
    return pack.lessons.find((lesson) => lesson.id === currentLessonId) || null;
  }, [pack, currentLessonId]);

  const lessonMap = useMemo(() => {
    const words = new Map<string, string>();
    const letters = new Set<string>();
    if (!pack) return { words, letters };
    pack.lessons.forEach((lesson) => {
      if (lesson.type === "word") {
        const key = lesson.id.replace("word-", "");
        words.set(key, lesson.id);
      }
      if (lesson.type === "letter") {
        letters.add(lesson.id.replace("letter-", ""));
      }
    });
    return { words, letters };
  }, [pack]);

  const targetScore = useMemo(() => {
    switch (currentLesson?.difficulty) {
      case "hard":
        return 88;
      case "medium":
        return 82;
      case "easy":
        return 75;
      default:
        return 80;
    }
  }, [currentLesson?.difficulty]);

  const holdDurationMs = useMemo(() => {
    switch (currentLesson?.difficulty) {
      case "hard":
        return 900;
      case "medium":
        return 700;
      case "easy":
        return 500;
      default:
        return 650;
    }
  }, [currentLesson?.difficulty]);

  const holdSeconds = (holdDurationMs / 1000).toFixed(1);
  const canLearn = practiceMode === "guided" && sequence.length > 0;

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = async (text: string) => {
    if (!ttsEnabled) return;
    try {
      const response = await fetch(`${apiBase}/api/voice/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("TTS failed");
      const data = await response.json();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`);
      audioRef.current = audio;
      await audio.play();
    } catch (err) {
      console.warn("TTS error, falling back to SpeechSynthesis");
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  useEffect(() => {
    if (!isLearning) {
      holdStartRef.current = null;
      lastPromptRef.current = 0;
      advanceRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }
    holdStartRef.current = null;
    lastPromptRef.current = performance.now();
    advanceRef.current = false;
  }, [isLearning]);

  const applyCustomPhrase = () => {
    if (!pack) return;
    const normalized = customPhrase
      .toLowerCase()
      .replace(/[^a-z\s']/g, " ")
      .replace(/'/g, "")
      .trim();
    const tokens = normalized.split(/\s+/).filter(Boolean);
    if (!tokens.length) {
      setPhraseError("Enter a phrase with real words.");
      return;
    }
    if (tokens.length > 20) {
      setPhraseError("Phrase too long. Limit to 20 words.");
      return;
    }

    const wordPatterns = Array.from(lessonMap.words.keys())
      .map((key) => ({ key, tokens: key.split("-") }))
      .sort((a, b) => b.tokens.length - a.tokens.length);

    const sequenceIds: string[] = [];
    let i = 0;
    while (i < tokens.length) {
      let matched = false;
      for (const pattern of wordPatterns) {
        const slice = tokens.slice(i, i + pattern.tokens.length);
        if (slice.join("-") === pattern.key) {
          const lessonId = lessonMap.words.get(pattern.key);
          if (lessonId) sequenceIds.push(lessonId);
          i += pattern.tokens.length;
          matched = true;
          break;
        }
      }
      if (matched) continue;
      const word = tokens[i];
      for (const ch of word.split("")) {
        if (!lessonMap.letters.has(ch)) {
          setPhraseError(`Missing letter lesson for "${ch.toUpperCase()}".`);
          return;
        }
        sequenceIds.push(`letter-${ch}`);
      }
      i += 1;
    }

    setPhraseError(null);
    setSequence(sequenceIds);
    setCurrentIndex(0);
  };

  const applyCustomPhraseWithNLP = async () => {
    if (!pack) return;
    const vocab = Array.from(lessonMap.words.keys()).map((key) => key.replace(/-/g, " "));
    const vocabMap: Record<string, string> = {};
    lessonMap.words.forEach((lessonId, key) => {
      vocabMap[key.replace(/-/g, " ")] = lessonId;
    });
    const letters = Array.from(lessonMap.letters);

    try {
      setNlpStatus("Parsing phrase with NLP...");
      const response = await fetch(`${apiBase}/api/nlp/phrase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phrase: customPhrase,
          max_words: 20,
          vocabulary: vocab,
          vocab_map: vocabMap,
          letters,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "NLP failed");
      }
      const data = await response.json();
      setPhraseError(null);
      setSequence(data.sequence);
      setCurrentIndex(0);
      setNlpStatus(null);
    } catch (err: any) {
      console.warn("NLP error, falling back to deterministic parse", err);
      setNlpStatus("NLP failed, using fallback parser.");
      applyCustomPhrase();
      setTimeout(() => setNlpStatus(null), 2000);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadLesson = async () => {
      if (!currentLesson) return;
      try {
        const [keypoints, segs] = await Promise.all([
          loadLessonKeypoints(currentLesson.keypoints_url),
          loadLessonSegments(currentLesson.segments_url),
        ]);
        if (cancelled) return;
        setFrames(keypoints);
        setSegments(segs);
        setFrameIndex(0);
        advanceRef.current = false;
      } catch (err) {
        console.error("Lesson load error", err);
        setFrames([]);
        setSegments(null);
      }
    };
    loadLesson();
    return () => {
      cancelled = true;
    };
  }, [currentLesson]);

  useEffect(() => {
    holdStartRef.current = null;
    lastPromptRef.current = performance.now();
    advanceRef.current = false;
  }, [currentLessonId]);

  useEffect(() => {
    if (!frames.length || !pack) return;
    if (practiceMode === "normal") {
      setFrameIndex(0);
      return;
    }
    let cancelled = false;
    const fps = pack.fps || 30;
    const segment = loopMode && segments?.segments?.[0] ? segments.segments[0] : null;
    const segmentStart = segment?.start_frame ?? 0;
    const segmentEnd = segment?.end_frame ?? frames.length - 1;
    const segmentLength = Math.max(1, segmentEnd - segmentStart + 1);
    let startTime = performance.now();

    const tick = () => {
      if (cancelled) return;
      const elapsed = performance.now() - startTime;
      let idx = Math.floor((elapsed * fps) / 1000);
      if (loopMode) {
        idx = segmentStart + (idx % segmentLength);
      } else if (idx >= frames.length) {
        idx = frames.length - 1;
      }
      setFrameIndex(idx);
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
    };
  }, [frames, pack, loopMode, segments, mode, sequence.length, practiceMode, isLearning]);

  const leftHand = useMemo(
    () =>
      results.leftHand
        ? addOuterPalmNode(results.leftHand.landmarks.map(([x, y]) => [x, y] as Point2D))
        : null,
    [results]
  );
  const rightHand = useMemo(
    () =>
      results.rightHand
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

  const currentFrame = frames[frameIndex] || null;
  const referenceFrame = practiceMode === "normal" ? restFrame : currentFrame;
  const expertHandsBySide = useMemo(() => {
    const left = referenceFrame?.left_hand?.map(([x, y]) => [x, y] as Point2D) || null;
    const right = referenceFrame?.right_hand?.map(([x, y]) => [x, y] as Point2D) || null;
    return {
      Left: addOuterPalmNode(left),
      Right: addOuterPalmNode(right),
    };
  }, [referenceFrame]);

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
      holdStartRef.current = null;
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

    if (!isLearning || !currentLesson) {
      holdStartRef.current = null;
      return;
    }

    const now = performance.now();
    if (avgScore >= targetScore) {
      if (!holdStartRef.current) {
        holdStartRef.current = now;
      }
      if (now - holdStartRef.current >= holdDurationMs && !advanceRef.current) {
        advanceRef.current = true;
        holdStartRef.current = null;
        if (mode === "phrase" && currentIndex < sequence.length - 1) {
          setCurrentIndex((prev) => Math.min(prev + 1, sequence.length - 1));
        } else {
          setIsLearning(false);
          const message =
            mode === "phrase" && sequence.length > 1
              ? "Nice work. You completed the phrase."
              : "Nice work. Lesson complete.";
          speak(message);
        }
      }
    } else {
      holdStartRef.current = null;
      if (now - lastPromptRef.current >= 4500) {
        lastPromptRef.current = now;
        const prompt = cueFromTopJoints(primaryScore?.topJoints ?? []);
        speak(prompt);
      }
    }
  }, [
    alignedHands,
    practiceMode,
    isLearning,
    currentLesson?.id,
    targetScore,
    holdDurationMs,
    mode,
    currentIndex,
    sequence.length,
  ]);

  const cue = useMemo(() => cueFromTopJoints(topErrors), [topErrors]);
  const displayedLesson =
    practiceMode === "normal" ? "Resting hand posture" : currentLesson?.name || "Loading lesson";
  const stepText =
    practiceMode === "normal"
      ? "Normal tracking mode"
      : mode === "phrase" && sequence.length > 1
      ? `Step ${currentIndex + 1} of ${sequence.length}`
      : "Single lesson";
  const statusText =
    practiceMode === "normal"
      ? "Normal mode: verify tracking and alignment."
      : isLearning
      ? `Hold ≥${Math.round(targetScore)}% for ${holdSeconds}s to advance.`
      : "Ready. Click Learn to start coaching.";

  useEffect(() => {
    if (!currentLesson || !isLearning || practiceMode !== "guided") return;
    const label =
      currentLesson.type === "letter"
        ? `Spell letter ${currentLesson.id.replace("letter-", "").toUpperCase()}`
        : `Next sign: ${currentLesson.name.replace(/^Word /, "")}`;
    speak(label);
  }, [currentLesson?.id, isLearning, practiceMode]);

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Session</p>
            <h1 className="text-2xl font-semibold">ASL practice session</h1>
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
              userHands={alignedHands.map((entry) => entry.user)}
              ghostHands={alignedHands.flatMap((entry) => (entry.ghost ? [{ side: entry.side, points: entry.ghost }] : []))}
              mirror
              topErrors={topErrors}
            />
            {(!ready || loading || error) && (
              <div className="absolute inset-0 grid place-items-center text-text-secondary text-sm bg-white/60 backdrop-blur-sm text-center px-4">
                {error
                  ? `Camera error: ${error}`
                  : loading
                  ? "Starting MediaPipe..."
                  : "Allow camera to start the session..."}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-border bg-bg-tertiary shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-2">Lesson</p>
              <p className="text-lg font-medium">{displayedLesson}</p>
              <p className="text-sm text-text-secondary mt-1">{stepText}</p>
              <p className="text-xs text-text-secondary mt-2">{statusText}</p>
              {currentLesson?.description ? (
                <p className="text-sm text-text-secondary mt-2">{currentLesson.description}</p>
              ) : null}
            </div>

            <div className="p-5 rounded-xl border border-border bg-bg-tertiary shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Practice</p>
                <div className="flex gap-2">
                  <button
                    className={`px-3 py-1 rounded-full text-xs ${practiceMode === "normal" ? "bg-text-primary text-white" : "border border-border"}`}
                    onClick={() => setPracticeMode("normal")}
                  >
                    Normal
                  </button>
                  <button
                    className={`px-3 py-1 rounded-full text-xs ${practiceMode === "guided" ? "bg-text-primary text-white" : "border border-border"}`}
                    onClick={() => setPracticeMode("guided")}
                  >
                    Guided
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{isLearning ? "Learning live" : "Ready to learn"}</p>
                  <p className="text-xs text-text-secondary">Goal: match the ghost, then hold steady.</p>
                </div>
                <button
                  className={`px-4 py-2 text-sm rounded-md ${isLearning ? "border border-border" : "bg-text-primary text-white"} disabled:opacity-60 disabled:cursor-not-allowed`}
                  disabled={!isLearning && !canLearn}
                  onClick={() => {
                    if (isLearning) {
                      setIsLearning(false);
                      return;
                    }
                    if (!canLearn) return;
                    setIsLearning(true);
                  }}
                >
                  {isLearning ? "Stop" : "Learn"}
                </button>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-bg-tertiary shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Mode</p>
                <div className="flex gap-2">
                  <button
                    className={`px-3 py-1 rounded-full text-xs ${mode === "phrase" ? "bg-text-primary text-white" : "border border-border"}`}
                    onClick={() => setMode("phrase")}
                  >
                    Phrase
                  </button>
                  <button
                    className={`px-3 py-1 rounded-full text-xs ${mode === "lesson" ? "bg-text-primary text-white" : "border border-border"}`}
                    onClick={() => setMode("lesson")}
                  >
                    Lesson
                  </button>
                </div>
              </div>
              {mode === "phrase" ? (
                <div className="space-y-3">
                  <div className="flex gap-2 text-xs">
                    <button
                      className={`px-3 py-1 rounded-full ${phraseSource === "library" ? "bg-text-primary text-white" : "border border-border"}`}
                      onClick={() => setPhraseSource("library")}
                    >
                      Library
                    </button>
                    <button
                      className={`px-3 py-1 rounded-full ${phraseSource === "custom" ? "bg-text-primary text-white" : "border border-border"}`}
                      onClick={() => setPhraseSource("custom")}
                    >
                      Custom
                    </button>
                  </div>

                  {phraseSource === "library" ? (
                    <div className="space-y-2">
                      <label className="text-xs text-text-secondary">Phrase</label>
                      <select
                        className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white"
                        value={selectedPhraseId}
                        onChange={(e) => setSelectedPhraseId(e.target.value)}
                      >
                        {phrases.map((phrase) => (
                          <option key={phrase.id} value={phrase.id}>
                            {phrase.text}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs text-text-secondary">Custom phrase (≤ 20 words)</label>
                      <input
                        className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white"
                        value={customPhrase}
                        onChange={(e) => setCustomPhrase(e.target.value)}
                        placeholder="Type any phrase..."
                      />
                      <button
                        className="w-full px-3 py-2 text-sm rounded-md bg-text-primary text-white"
                        onClick={applyCustomPhraseWithNLP}
                      >
                        Use this phrase (NLP)
                      </button>
                      <button
                        className="w-full px-3 py-2 text-sm rounded-md border border-border"
                        onClick={applyCustomPhrase}
                      >
                        Use fallback parser
                      </button>
                      {phraseError ? <p className="text-xs text-error">{phraseError}</p> : null}
                      {nlpStatus ? <p className="text-xs text-text-secondary">{nlpStatus}</p> : null}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs text-text-secondary">Lesson</label>
                  <select
                    className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white"
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                  >
                    {pack?.lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <label className="text-text-secondary">Loop segment</label>
                <input type="checkbox" checked={loopMode} onChange={(e) => setLoopMode(e.target.checked)} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="text-text-secondary">Voice coach (ElevenLabs)</label>
                <input type="checkbox" checked={ttsEnabled} onChange={(e) => setTtsEnabled(e.target.checked)} />
              </div>
              {mode === "phrase" && sequence.length > 1 ? (
                <div className="flex gap-2">
                  <button
                    className="flex-1 px-3 py-2 text-sm rounded-md border border-border"
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  >
                    Previous
                  </button>
                  <button
                    className="flex-1 px-3 py-2 text-sm rounded-md bg-text-primary text-white"
                    onClick={() => setCurrentIndex((prev) => Math.min(sequence.length - 1, prev + 1))}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>

            <div className="p-5 rounded-xl border border-border bg-bg-tertiary shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-2">Live cue</p>
              <p className="text-lg font-medium">{cue}</p>
              <p className="text-sm text-text-secondary mt-2">Top joints: {topErrors.join(", ") || "tracking..."}</p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-bg-tertiary shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-2">Tracking</p>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>FPS: {results.fps || "..."}</li>
                <li>
                  Hands:{" "}
                  {results.leftHand || results.rightHand
                    ? [results.leftHand ? "Left" : null, results.rightHand ? "Right" : null]
                        .filter(Boolean)
                        .join(" + ")
                    : "None detected"}
                </li>
                <li>
                  Coach:{" "}
                  {practiceMode === "guided" ? (isLearning ? "Guided (active)" : "Guided (paused)") : "Normal"}
                </li>
                <li>Status: {loading ? "Starting MediaPipe..." : ready ? "Live" : "Waiting for camera"}</li>
                {error ? <li className="text-error">Error: {error}</li> : null}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
