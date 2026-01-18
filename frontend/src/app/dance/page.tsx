"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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

export default function DanceSessionPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const scoringRef = useRef(new ScoringEngine({ mode: "positional", kScaling: 260, emaAlpha: 0.25 }));

  const [pack, setPack] = useState<PackMeta | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [frames, setFrames] = useState<KeypointFrame[]>([]);
  const [segments, setSegments] = useState<LessonSegments | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [loopMode, setLoopMode] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [score, setScore] = useState(0);
  const [topErrors, setTopErrors] = useState<number[]>([]);

  const { results, loading, ready, error } = useMediaPipePose(videoRef.current, { minPoseScore: 0.4 });
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
  }, [frames, pack, loopMode, segments, isPlaying, selectedLessonId, currentLesson?.fps]);

  const currentFrame = frames[frameIndex] || null;
  const expertPose = useMemo(() => {
    if (!currentFrame?.pose) return null;
    return currentFrame.pose.map(([x, y]) => [x, y] as Point2D);
  }, [currentFrame]);
  const userPose = useMemo(() => {
    if (!results.pose) return null;
    return results.pose.landmarks.map(([x, y]) => [x, y] as Point2D);
  }, [results.pose]);

  const alignedPose = useMemo(() => {
    if (!userPose || !expertPose) return null;
    return alignPose(expertPose, userPose).alignedExpert;
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
  }, [userPose, alignedPose]);

  const cue = useMemo(() => cueFromTopJoints(topErrors), [topErrors]);
  const displayedLesson = currentLesson?.name || "Loading routine";

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Dance Session</p>
            <h1 className="text-2xl font-semibold">Phantom choreography lab</h1>
          </div>
          <div className="flex items-center gap-3">
            <ScoreMeter score={score} />
            <Link href="/calibrate?pack=dance" className="text-sm text-text-secondary underline">
              Recalibrate
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-[2fr_1fr] gap-6 items-start">
          <div ref={frameRef} className="rounded-2xl border border-border overflow-hidden bg-white shadow-md relative">
            <Camera ref={videoRef} className="aspect-video" mirrored />
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
              <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Song</p>
              <div className="space-y-2">
                <label className="text-xs text-text-secondary">Choose routine</label>
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{isPlaying ? "Ghost running" : "Paused"}</p>
                  <p className="text-xs text-text-secondary">Match the phantom figure beat-for-beat.</p>
                </div>
                <button
                  className={`px-4 py-2 text-sm rounded-md ${isPlaying ? "border border-border" : "bg-text-primary text-white"}`}
                  onClick={() => setIsPlaying((prev) => !prev)}
                >
                  {isPlaying ? "Pause" : "Play"}
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
                <li>Status: {loading ? "Starting tracker..." : ready ? "Live" : "Waiting for camera"}</li>
                {error ? <li className="text-error">Error: {error}</li> : null}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
