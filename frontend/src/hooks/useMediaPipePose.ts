"use client";

import { useEffect, useRef, useState } from "react";

export interface PoseLandmarks {
  landmarks: number[][];
  score: number;
}

export interface MediaPipePoseResults {
  pose: PoseLandmarks | null;
  timestamp: number;
  fps: number;
}

const INITIAL_RESULTS: MediaPipePoseResults = {
  pose: null,
  timestamp: 0,
  fps: 0,
};

interface UseMediaPipePoseOptions {
  minPoseScore?: number;
  modelComplexity?: 0 | 1 | 2;
}

export function useMediaPipePose(videoElement: HTMLVideoElement | null, options: UseMediaPipePoseOptions = {}) {
  const { minPoseScore = 0.5, modelComplexity = 1 } = options;
  const [results, setResults] = useState<MediaPipePoseResults>(INITIAL_RESULTS);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poseRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFpsTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);

  useEffect(() => {
    if (!videoElement) return;
    let cancelled = false;

    const init = async () => {
      try {
        if (!streamRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              aspectRatio: 16 / 9,
              frameRate: { ideal: 30 },
            },
            audio: false,
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
        }

        videoElement.srcObject = streamRef.current;
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            /* autoplay may be blocked */
          });
        }

        const { Pose } = await import("@mediapipe/pose");
        if (cancelled) return;

        const pose = new Pose({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
        });
        pose.setOptions({
          modelComplexity,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5,
        });

        pose.onResults((res: any) => {
          if (cancelled) return;
          const now = performance.now();
          frameCountRef.current += 1;
          if (now - lastFpsTimeRef.current >= 1000) {
            fpsRef.current = frameCountRef.current;
            frameCountRef.current = 0;
            lastFpsTimeRef.current = now;
          }

          let poseResult: PoseLandmarks | null = null;
          if (res.poseLandmarks && Array.isArray(res.poseLandmarks)) {
            const landmarks = res.poseLandmarks.map((p: any) => [p.x, p.y, p.z ?? 0]);
            const score =
              res.poseLandmarks.reduce((sum: number, p: any) => sum + (p.visibility ?? 1), 0) /
              res.poseLandmarks.length;
            if (score >= minPoseScore) {
              poseResult = { landmarks, score };
            }
          }

          setResults((prev) => ({
            pose: poseResult,
            timestamp: Date.now(),
            fps: fpsRef.current || prev.fps,
          }));
        });

        poseRef.current = pose;
        setLoading(false);
        setReady(true);

        const loop = async () => {
          if (cancelled) return;
          if (videoElement.readyState >= 2) {
            try {
              await pose.send({ image: videoElement });
            } catch (err) {
              if (!cancelled) {
                console.warn("MediaPipe pose warning:", err);
              }
            }
          }
          rafRef.current = requestAnimationFrame(loop);
        };

        loop();
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Camera error");
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (poseRef.current) {
        try {
          poseRef.current.close();
        } catch {
          /* ignore */
        }
        poseRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [videoElement, minPoseScore, modelComplexity]);

  return { results, loading, ready, error };
}
