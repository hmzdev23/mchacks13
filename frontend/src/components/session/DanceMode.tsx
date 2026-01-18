"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera } from "@/components/Camera";
import { PoseOverlayCanvas } from "@/components/PoseOverlayCanvas";
import { ScoreMeter } from "@/components/ScoreMeter";
import { useElementSize } from "@/hooks/useElementSize";
import { useMediaPipePose } from "@/hooks/useMediaPipePose";
import { useVideoMetrics } from "@/hooks/useVideoMetrics";
import { alignPose, Point2D } from "@/lib/cv/alignment";
import { ScoringEngine } from "@/lib/cv/scoring";
import { loadLessonKeypoints, loadLessonSegments, loadPack } from "@/lib/packs/packLoader";
import { KeypointFrame, LessonMeta, LessonSegments, PackMeta } from "@/lib/packs/types";

const cueFromTopJoints = (top: number[]) => {
  if (top.some((idx) => [11, 12].includes(idx))) return "Square your shoulders with the ghost.";
  if (top.some((idx) => [23, 24].includes(idx))) return "Align your hips to the ghost.";
  if (top.some((idx) => [13, 14].includes(idx))) return "Match your elbow height.";
  if (top.some((idx) => [15, 16].includes(idx))) return "Follow the wrist path.";
  if (top.some((idx) => [25, 26].includes(idx))) return "Lift your knees to match the step.";
  if (top.some((idx) => [27, 28, 31, 32].includes(idx))) return "Place your feet where the ghost lands.";
  if (top.includes(0)) return "Keep your head centered and steady.";
  return "Stay inside the ghost silhouette.";
};

const lerp = (start: number, end: number, amount: number) => start + (end - start) * amount;

const smoothDanceFrames = (
  input: KeypointFrame[],
  options: { alpha?: number; maxStep?: number } = {}
): KeypointFrame[] => {
  const alpha = options.alpha ?? 0.22;
  const maxStep = options.maxStep ?? 0.05;
  let prevPose: [number, number, number][] | null = null;

  return input.map((frame) => {
    if (!frame.pose || frame.pose.length === 0) {
      if (!prevPose) return frame;
      return {
        ...frame,
        pose: prevPose.map((point) => point.slice() as [number, number, number]),
      } as KeypointFrame;
    }

    const smoothed = frame.pose.map((point, idx) => {
      const prev = prevPose?.[idx];
      if (!prev) return point.slice();
      const x = point[0];
      const y = point[1];
      let sx = lerp(prev[0], x, alpha);
      let sy = lerp(prev[1], y, alpha);
      const dx = sx - prev[0];
      const dy = sy - prev[1];
      const dist = Math.hypot(dx, dy);
      if (dist > maxStep) {
        const scale = maxStep / dist;
        sx = prev[0] + dx * scale;
        sy = prev[1] + dy * scale;
      }
      const next = point.slice();
      next[0] = sx;
      next[1] = sy;
      return next as [number, number, number];
    });

    prevPose = smoothed.map((point) => point.slice() as [number, number, number]);
    return {
      ...frame,
      pose: smoothed,
    } as KeypointFrame;
  });
};

const adviceFromJointCounts = (counts: Map<number, number>) => {
  const groups = [
    { joints: [11, 12], advice: "Keep your shoulders level and square to the ghost." },
    { joints: [23, 24], advice: "Center your hips and match the ghost’s sway." },
    { joints: [13, 14], advice: "Relax your elbows and match their height." },
    { joints: [15, 16], advice: "Track the wrist path to clean up arm lines." },
    { joints: [25, 26], advice: "Lift your knees to hit the step timing." },
    { joints: [27, 28, 31, 32], advice: "Place your feet where the ghost lands." },
    { joints: [0], advice: "Keep your head centered for balance." },
  ];

  let best = { count: 0, advice: "Stay inside the ghost silhouette and keep the rhythm." };
  groups.forEach((group) => {
    const total = group.joints.reduce((sum, joint) => sum + (counts.get(joint) ?? 0), 0);
    if (total > best.count) {
      best = { count: total, advice: group.advice };
    }
  });

  return best.advice;
};

const messageFromScore = (score: number) => {
  if (score >= 92) return "Incredible control. You owned that routine.";
  if (score >= 84) return "Great work. Your timing is sharp.";
  if (score >= 74) return "Nice progress. Keep building consistency.";
  if (score >= 60) return "Solid start. You’re getting the feel.";
  return "Good effort. Run it again to lock in the moves.";
};

type ScorePoint = { t: number; v: number };

const SCORE_SAMPLE_MS = 250;
const MAX_SCORE_POINTS = 1200;

const scoreToColor = (value: number) => {
  if (value >= 80) return "#16a34a";
  if (value >= 60) return "#f59e0b";
  return "#ef4444";
};

const ScoreTrendChart = ({ points }: { points: ScorePoint[] }) => {
  const chart = useMemo(() => {
    if (!points.length) {
      return { coords: [] as Array<{ x: number; y: number; v: number }>, segments: [] as Array<{ x1: number; y1: number; x2: number; y2: number; v: number }> };
    }

    const width = 180;
    const height = 64;
    const padding = 6;
    const minT = points[0].t;
    const maxT = points[points.length - 1].t;
    const span = Math.max(1, maxT - minT);
    const xSpan = width - padding * 2;
    const ySpan = height - padding * 2;

    const coords = points.map((point) => {
      const x = padding + ((point.t - minT) / span) * xSpan;
      const y = padding + (1 - point.v / 100) * ySpan;
      return { x, y, v: point.v };
    });

    const segments = coords.slice(1).map((point, idx) => {
      const prev = coords[idx];
      return {
        x1: prev.x,
        y1: prev.y,
        x2: point.x,
        y2: point.y,
        v: (prev.v + point.v) / 2,
      };
    });

    return { coords, segments };
  }, [points]);

  return (
    <div className="rounded-xl border border-border bg-bg-tertiary/70 px-3 py-2 shadow-sm min-w-[210px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-secondary">Score trend</span>
        <span className="text-xs text-text-secondary">{points.length ? `${Math.round(points[points.length - 1].v)}%` : "--"}</span>
      </div>
      <svg width={180} height={64} viewBox="0 0 180 64" className="block">
        <line x1="6" y1="58" x2="174" y2="58" stroke="rgba(148,163,184,0.35)" strokeWidth="1" />
        <line x1="6" y1="32" x2="174" y2="32" stroke="rgba(148,163,184,0.2)" strokeWidth="1" />
        <line x1="6" y1="6" x2="174" y2="6" stroke="rgba(148,163,184,0.2)" strokeWidth="1" />
        {chart.segments.map((seg, idx) => (
          <line
            key={idx}
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            stroke={scoreToColor(seg.v)}
            strokeWidth={2}
            strokeLinecap="round"
          />
        ))}
        {chart.coords.length > 0 ? (
          <circle
            cx={chart.coords[chart.coords.length - 1].x}
            cy={chart.coords[chart.coords.length - 1].y}
            r={3.2}
            fill={scoreToColor(chart.coords[chart.coords.length - 1].v)}
          />
        ) : null}
      </svg>
    </div>
  );
};

interface DanceModeProps {
  className?: string;
}

export function DanceMode({ className }: DanceModeProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackRef = useRef({ startTime: 0, offset: 0 });
  const smoothPoseRef = useRef<Point2D[] | null>(null);
  const sessionStatsRef = useRef({ sum: 0, count: 0, jointCounts: new Map<number, number>() });
  const completionRef = useRef(false);
  const scoringRef = useRef(new ScoringEngine({ mode: "positional", kScaling: 260, emaAlpha: 0.25 }));
  const scoreSeriesRef = useRef<ScorePoint[]>([]);
  const lastSeriesUpdateRef = useRef(0);

  const [pack, setPack] = useState<PackMeta | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [frames, setFrames] = useState<KeypointFrame[]>([]);
  const [segments, setSegments] = useState<LessonSegments | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [loopMode, setLoopMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState<{
    score: number;
    message: string;
    advice: string;
  } | null>(null);
  const [score, setScore] = useState(0);
  const [topErrors, setTopErrors] = useState<number[]>([]);
  const [scoreSeries, setScoreSeries] = useState<ScorePoint[]>([]);

  const { results, loading, ready, error } = useMediaPipePose(videoRef.current, {
    minPoseScore: 0.4,
    targetFps: 24,
    modelComplexity: 0,
    cameraWidth: 960,
    cameraHeight: 540,
  });
  const { width, height } = useElementSize(frameRef.current);
  const { width: videoWidth, height: videoHeight } = useVideoMetrics(videoRef.current);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const packData = await loadPack("dance");
        if (cancelled) return;
        setPack(packData);
        setSelectedLessonId(packData.lessons[0]?.id || "");
      } catch (err) {
        console.error("Dance pack load error", err);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentLesson: LessonMeta | null = useMemo(() => {
    if (!pack || !selectedLessonId) return null;
    return pack.lessons.find((lesson) => lesson.id === selectedLessonId) || null;
  }, [pack, selectedLessonId]);
  const audioUrl = currentLesson?.audio_url ?? null;
  const expertMirrored = useMemo(() => {
    const frame = frames.find((entry) => entry.pose && entry.pose[11] && entry.pose[12]);
    if (!frame?.pose) return false;
    const left = frame.pose[11];
    const right = frame.pose[12];
    if (!left || !right) return false;
    return left[0] < right[0];
  }, [frames]);
  const isCountingDown = countdown !== null;
  const resetSessionStats = useCallback(() => {
    sessionStatsRef.current = { sum: 0, count: 0, jointCounts: new Map() };
    completionRef.current = false;
    setSessionComplete(null);
    scoreSeriesRef.current = [];
    setScoreSeries([]);
    lastSeriesUpdateRef.current = 0;
  }, []);
  const finalizeSession = useCallback(() => {
    if (completionRef.current) return;
    completionRef.current = true;
    const { sum, count, jointCounts } = sessionStatsRef.current;
    const avg = count ? sum / count : 0;
    setSessionComplete({
      score: Math.round(avg),
      message: messageFromScore(avg),
      advice: adviceFromJointCounts(jointCounts),
    });
    playbackRef.current = { startTime: 0, offset: 0 };
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    setCountdown(null);
    setIsPlaying(false);
    playbackRef.current = { startTime: 0, offset: 0 };
    setAudioReady(false);
    setAudioError(null);
    resetSessionStats();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [selectedLessonId, resetSessionStats]);

  useEffect(() => {
    setAudioReady(false);
    setAudioError(null);
  }, [audioUrl]);

  const getElapsedMs = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audioEnabled && audioUrl && audioReady) {
      return audio.currentTime * 1000;
    }
    return performance.now() - playbackRef.current.startTime + playbackRef.current.offset;
  }, [audioEnabled, audioReady, audioUrl]);

  const primeAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !audioEnabled || !audioUrl) return;
    try {
      await audio.play();
      audio.pause();
      audio.currentTime = playbackRef.current.offset / 1000;
    } catch {
      /* ignore */
    }
  }, [audioEnabled, audioUrl]);

  const startPlayback = useCallback(async () => {
    playbackRef.current.startTime = performance.now();
    setIsPlaying(true);
    const audio = audioRef.current;
    if (audio && audioEnabled && audioUrl) {
      audio.currentTime = playbackRef.current.offset / 1000;
      try {
        await audio.play();
        setAudioError(null);
      } catch {
        setAudioError("Tap play to enable audio.");
      }
    }
  }, [audioEnabled, audioUrl]);

  const pausePlayback = useCallback(() => {
    playbackRef.current.offset = getElapsedMs();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    setIsPlaying(false);
  }, [getElapsedMs]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      void startPlayback();
      const hide = window.setTimeout(() => setCountdown(null), 350);
      return () => window.clearTimeout(hide);
    }
    const tick = window.setTimeout(() => setCountdown((prev) => (prev === null ? null : prev - 1)), 1000);
    return () => window.clearTimeout(tick);
  }, [countdown, startPlayback]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.loop = loopMode;
    }
  }, [loopMode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl || !isPlaying) return;
    if (!audioEnabled) {
      playbackRef.current.offset = audio.currentTime * 1000;
      playbackRef.current.startTime = performance.now();
      audio.pause();
      return;
    }
    audio.currentTime = playbackRef.current.offset / 1000;
    audio
      .play()
      .then(() => setAudioError(null))
      .catch(() => setAudioError("Tap play to enable audio."));
  }, [audioEnabled, audioUrl, isPlaying]);

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
        setFrames(smoothDanceFrames(keypoints));
        setSegments(segs);
        setFrameIndex(0);
      } catch (err) {
        console.error("Dance lesson load error", err);
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
    if (!frames.length || !pack || !isPlaying) return;
    let cancelled = false;
    const fps = currentLesson?.fps ?? pack.fps ?? 30;
    const segment = loopMode && segments?.segments?.[0] ? segments.segments[0] : null;
    const segmentStart = segment?.start_frame ?? 0;
    const segmentEnd = segment?.end_frame ?? frames.length - 1;
    const segmentLength = Math.max(1, segmentEnd - segmentStart + 1);

    const tick = () => {
      if (cancelled) return;
      const elapsed = getElapsedMs();
      let idx = Math.floor((elapsed * fps) / 1000);
      if (loopMode) {
        idx = segmentStart + (idx % segmentLength);
      } else if (idx >= frames.length) {
        idx = frames.length - 1;
        setFrameIndex(idx);
        pausePlayback();
        finalizeSession();
        return;
      }
      setFrameIndex((prev) => (prev === idx ? prev : idx));
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
    };
  }, [
    frames,
    pack,
    loopMode,
    segments,
    isPlaying,
    selectedLessonId,
    currentLesson?.fps,
    getElapsedMs,
    pausePlayback,
    finalizeSession,
  ]);

  const currentFrame = frames[frameIndex] || null;
  const expertPose = useMemo(() => {
    if (!currentFrame?.pose) return null;
    const pose = currentFrame.pose.map(([x, y]) => [x, y] as Point2D);
    if (!expertMirrored) return pose;
    return pose.map(([x, y]) => [1 - x, y] as Point2D);
  }, [currentFrame, expertMirrored]);
  const userPose = useMemo(() => {
    if (!results.pose) {
      smoothPoseRef.current = null;
      return null;
    }
    const raw = results.pose.landmarks.map(([x, y]) => [x, y] as Point2D);
    if (!smoothPoseRef.current) {
      smoothPoseRef.current = raw;
      return raw;
    }
    const prev = smoothPoseRef.current;
    const smoothed = raw.map((point, idx) => {
      const prevPoint = prev[idx] ?? point;
      return [lerp(prevPoint[0], point[0], 0.45), lerp(prevPoint[1], point[1], 0.45)] as Point2D;
    });
    smoothPoseRef.current = smoothed;
    return smoothed;
  }, [results.pose]);

  const alignedPose = useMemo(() => {
    if (!userPose || !expertPose) return null;
    return alignPose(expertPose, userPose, { allowRotation: false }).alignedExpert;
  }, [expertPose, userPose]);
  const ghostPose = alignedPose ?? expertPose;

  useEffect(() => {
    if (!userPose || !alignedPose) {
      scoringRef.current.reset();
      setScore(0);
      setTopErrors([]);
      return;
    }
    const scored = scoringRef.current.score(userPose, alignedPose);
    setScore(scored.overall);
    setTopErrors(scored.topJoints);
    if (isPlaying && !isCountingDown) {
      sessionStatsRef.current.sum += scored.overall;
      sessionStatsRef.current.count += 1;
      scored.topJoints.forEach((joint) => {
        const prev = sessionStatsRef.current.jointCounts.get(joint) ?? 0;
        sessionStatsRef.current.jointCounts.set(joint, prev + 1);
      });
    }
  }, [userPose, alignedPose, isPlaying, isCountingDown]);

  useEffect(() => {
    if (!isPlaying || isCountingDown) return;
    const now = performance.now();
    if (now - lastSeriesUpdateRef.current < SCORE_SAMPLE_MS) return;
    lastSeriesUpdateRef.current = now;
    const elapsed = getElapsedMs();
    const next = [...scoreSeriesRef.current, { t: elapsed, v: score }];
    if (next.length > MAX_SCORE_POINTS) {
      const downsampled = next.filter((_, idx) => idx % 2 === 0);
      scoreSeriesRef.current = downsampled;
      setScoreSeries(downsampled);
      return;
    }
    scoreSeriesRef.current = next;
    setScoreSeries(next);
  }, [score, isPlaying, isCountingDown, getElapsedMs]);

  const cue = useMemo(() => cueFromTopJoints(topErrors), [topErrors]);
  const displayedLesson = currentLesson?.name || "Loading routine";

  return (
    <div className={`flex flex-col h-full ${className || ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 flex-none pr-56">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Dance Session</p>
          <h1 className="text-2xl font-semibold">Phantom choreography lab</h1>
        </div>
        <div className="flex items-center gap-4">
          <ScoreMeter score={score} />
          <ScoreTrendChart points={scoreSeries} />
        </div>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6 items-start flex-1 min-h-0">
        <div ref={frameRef} className="rounded-2xl border border-border overflow-hidden bg-white shadow-md relative min-h-0">
          <Camera ref={videoRef} className="aspect-video" mirrored />
          {audioUrl ? (
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="auto"
              muted={!audioEnabled}
              onCanPlay={() => setAudioReady(true)}
              onEnded={() => {
                if (!loopMode) {
                  playbackRef.current.offset = 0;
                  finalizeSession();
                }
              }}
              onError={() => setAudioError("Audio failed to load.")}
            />
          ) : null}
          <PoseOverlayCanvas
            width={width}
            height={height}
            videoWidth={videoWidth}
            videoHeight={videoHeight}
            className="absolute inset-0"
            userPose={userPose}
            ghostPose={ghostPose}
            mirror
            topErrors={topErrors}
          />
          {(!ready || loading || error) && (
            <div className="absolute inset-0 grid place-items-center text-text-secondary text-sm bg-white/60 backdrop-blur-sm text-center px-4">
              {error
                ? `Camera error: ${error}`
                : loading
                  ? "Starting full-body tracking..."
                  : "Allow camera to start the session..."}
            </div>
          )}
          {isCountingDown && (
            <div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-sm text-[var(--stone-900)]">
              <div className="text-6xl font-semibold">{countdown === 0 ? "Go!" : countdown}</div>
              <p className="text-xs uppercase tracking-[0.3em] mt-3">Get ready</p>
            </div>
          )}
          {sessionComplete && !isPlaying && !isCountingDown && (
            <div className="absolute inset-0 grid place-items-center bg-white/80 backdrop-blur-sm text-[var(--stone-900)] p-6">
              <div className="w-full max-w-sm rounded-2xl border border-border bg-white/90 p-6 text-center shadow-lg">
                <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-2">Final score</p>
                <div className="text-5xl font-semibold mb-2">{sessionComplete.score}</div>
                <p className="text-sm text-text-secondary mb-4">{sessionComplete.message}</p>
                <p className="text-sm text-text-secondary">Coach tip: {sessionComplete.advice}</p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  <button
                    className="px-4 py-2 text-sm rounded-md bg-text-primary text-white"
                    onClick={() => {
                      resetSessionStats();
                      playbackRef.current.offset = 0;
                      setFrameIndex(0);
                      setCountdown(3);
                    }}
                  >
                    Replay
                  </button>
                  <button
                    className="px-4 py-2 text-sm rounded-md border border-border"
                    onClick={() => setSessionComplete(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-xl border border-border bg-bg-tertiary shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-text-secondary mb-2">Routine</p>
            <p className="text-lg font-medium">{displayedLesson}</p>
            <p className="text-sm text-text-secondary mt-1">{currentLesson?.description}</p>
            <p className="text-xs text-text-secondary mt-2">
              Difficulty: {currentLesson?.difficulty ?? "loading"} · Loop: {loopMode ? "on" : "off"}
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-bg-tertiary shadow-sm space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Practice</p>
            <p className="text-xs text-text-secondary">1. Choose routine · 2. Press start · 3. Mirror the phantom</p>
            <div className="space-y-2">
              <label className="text-xs text-text-secondary">Routine</label>
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
            <div className="flex items-center justify-between text-sm">
              <label className="text-text-secondary">Loop segment</label>
              <input type="checkbox" checked={loopMode} onChange={(e) => setLoopMode(e.target.checked)} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="text-text-secondary">Sound</label>
              <input
                type="checkbox"
                checked={audioEnabled}
                disabled={!audioUrl}
                onChange={(e) => setAudioEnabled(e.target.checked)}
              />
            </div>
            {audioError ? <p className="text-xs text-error">{audioError}</p> : null}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {isCountingDown ? "Starting in..." : isPlaying ? "Routine live" : "Ready to start"}
                </p>
                <p className="text-xs text-text-secondary">
                  {isCountingDown ? "Hold still while the countdown runs." : "Match the phantom figure beat-for-beat."}
                </p>
              </div>
              <button
                className={`px-4 py-2 text-sm rounded-md ${isPlaying ? "border border-border" : "bg-text-primary text-white"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                disabled={!ready || loading || !!error}
                onClick={() => {
                  if (!ready || loading || error) return;
                  if (isCountingDown) {
                    setCountdown(null);
                    return;
                  }
                  if (isPlaying) {
                    pausePlayback();
                    return;
                  }
                  if (sessionComplete || playbackRef.current.offset === 0) {
                    resetSessionStats();
                    setFrameIndex(0);
                  }
                  void primeAudio();
                  setCountdown(3);
                }}
              >
                {isCountingDown ? "Cancel" : isPlaying ? "Pause" : "Start routine"}
              </button>
            </div>
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
              <li>Pose: {results.pose ? "Detected" : "None detected"}</li>
              <li>Audio: {audioUrl ? (audioReady ? "Loaded" : "Loading...") : "No audio"}</li>
              <li>Playback: {isPlaying ? "Playing" : isCountingDown ? "Counting down" : "Paused"}</li>
              <li>Status: {loading ? "Starting tracker..." : ready ? "Live" : "Waiting for camera"}</li>
              {error ? <li className="text-error">Error: {error}</li> : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
