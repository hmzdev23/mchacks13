"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
  const handsRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const isInitializedRef = useRef(false);
  const isDestroyedRef = useRef(false);

  useEffect(() => {
    if (!videoElement || isInitializedRef.current) return;

    isInitializedRef.current = true;
    isDestroyedRef.current = false;

    const init = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const handsModule = await import("@mediapipe/hands");

        if (isDestroyedRef.current) return;

        const hands = new handsModule.Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((res: any) => {
          if (isDestroyedRef.current) return;

          const now = performance.now();
          frameCountRef.current += 1;

          if (now - lastFrameRef.current >= 1000) {
            const fps = frameCountRef.current;
            frameCountRef.current = 0;
            lastFrameRef.current = now;
            setResults((prev) => ({ ...prev, fps }));
          }

          let leftHand: HandLandmarks | null = null;
          let rightHand: HandLandmarks | null = null;

          if (res.multiHandLandmarks && res.multiHandedness) {
            res.multiHandLandmarks.forEach((lm: any, idx: number) => {
              const handedness = res.multiHandedness[idx].label as "Left" | "Right";
              const score = res.multiHandedness[idx].score as number;
              const hand: HandLandmarks = {
                landmarks: lm.map((p: any) => [p.x, p.y, p.z]),
                // Mirror the handedness since camera is mirrored
                handedness: handedness === "Left" ? "Right" : "Left",
                score,
              };
              if (hand.handedness === "Left") leftHand = hand;
              else rightHand = hand;
            });
          }

          setResults({
            leftHand,
            rightHand,
            timestamp: Date.now(),
            fps: frameCountRef.current,
          });
        });

        handsRef.current = hands;
        setLoading(false);

        // Start detection loop
        const detect = async () => {
          if (isDestroyedRef.current || !handsRef.current) return;

          if (videoElement.readyState >= 2) {
            try {
              await handsRef.current.send({ image: videoElement });
            } catch (err) {
              // Silently ignore send errors during cleanup
              if (!isDestroyedRef.current) {
                console.warn("MediaPipe send warning:", err);
              }
            }
          }

          if (!isDestroyedRef.current) {
            animationRef.current = requestAnimationFrame(detect);
          }
        };

        // Wait a bit for video to be ready
        setTimeout(() => {
          if (!isDestroyedRef.current) {
            detect();
          }
        }, 500);

      } catch (err) {
        console.error("MediaPipe init error:", err);
        setLoading(false);
      }
    };

    init();

    return () => {
      isDestroyedRef.current = true;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // Don't call close() immediately - it causes the WASM memory error
      // Just let it be garbage collected
      if (handsRef.current) {
        // Delay the cleanup to avoid WASM memory issues
        const handsToClose = handsRef.current;
        handsRef.current = null;

        // Use a longer timeout and wrap in try-catch
        setTimeout(() => {
          try {
            handsToClose?.close?.();
          } catch (e) {
            // Ignore cleanup errors
          }
        }, 1000);
      }
    };
  }, [videoElement]);

  return { results, loading };
}
