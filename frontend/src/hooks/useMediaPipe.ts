"use client";

import { useEffect, useRef, useState } from "react";

export interface HandLandmarks {
  landmarks: number[][];
  handedness: "Left" | "Right";
  score: number;
}

export interface MediaPipeResults {
  leftHand: HandLandmarks | null;
  rightHand: HandLandmarks | null;
  timestamp: number;
  fps: number;
}

const INITIAL_RESULTS: MediaPipeResults = {
  leftHand: null,
  rightHand: null,
  timestamp: 0,
  fps: 0,
};

export function useMediaPipe(videoElement: HTMLVideoElement | null) {
  const [results, setResults] = useState<MediaPipeResults>(INITIAL_RESULTS);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handsRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFpsTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  useEffect(() => {
    if (!videoElement) return;
    let cancelled = false;

    const init = async () => {
      try {
        // Start or reuse camera stream
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
            /* autoplay may be blocked; will resume on user gesture */
          });
        }

        const { Hands } = await import("@mediapipe/hands");
        if (cancelled) return;

        const hands = new Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
        });
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          selfieMode: false,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((res: any) => {
          if (cancelled) return;
          const now = performance.now();
          frameCountRef.current += 1;
          if (now - lastFpsTimeRef.current >= 1000) {
            setResults((prev) => ({ ...prev, fps: frameCountRef.current }));
            frameCountRef.current = 0;
            lastFpsTimeRef.current = now;
          }

          let leftHand: HandLandmarks | null = null;
          let rightHand: HandLandmarks | null = null;

          if (res.multiHandLandmarks && res.multiHandedness) {
            res.multiHandLandmarks.forEach((lm: any, idx: number) => {
              const handedness = res.multiHandedness[idx].label as "Left" | "Right";
              const score = res.multiHandedness[idx].score as number;
              const hand: HandLandmarks = {
                landmarks: lm.map((p: any) => [p.x, p.y, p.z]),
                handedness,
                score,
              };
              if (handedness === "Left") leftHand = hand;
              else rightHand = hand;
            });
          }

          setResults((prev) => ({
            leftHand,
            rightHand,
            timestamp: Date.now(),
            fps: prev.fps,
          }));
        });

        handsRef.current = hands;
        setLoading(false);
        setReady(true);

        const loop = async () => {
          if (cancelled) return;
          if (videoElement.readyState >= 2) {
            try {
              await hands.send({ image: videoElement });
            } catch (err) {
              if (!cancelled) {
                console.warn("MediaPipe send warning:", err);
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
      if (handsRef.current) {
        try {
          handsRef.current.close();
        } catch {
          /* ignore */
        }
        handsRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [videoElement]);

  return { results, loading, ready, error };
}
