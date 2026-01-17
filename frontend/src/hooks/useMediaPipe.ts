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

export function useMediaPipe(videoElement: HTMLVideoElement | null) {
  const [results, setResults] = useState<MediaPipeResults>({
    leftHand: null,
    rightHand: null,
    timestamp: 0,
    fps: 0,
  });
  const [loading, setLoading] = useState(true);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastFrameRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const cancellingRef = useRef(false);

  useEffect(() => {
    if (!videoElement) return;

    let cancelled = false;
    cancellingRef.current = false;

    const init = async () => {
      const { Hands } = await import("@mediapipe/hands");
      const { Camera } = await import("@mediapipe/camera_utils");

      const hands = new Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((res: any) => {
        if (cancellingRef.current) return;
        const now = performance.now();
        frameCountRef.current += 1;
        if (now - lastFrameRef.current >= 1000) {
          setResults((prev) => ({ ...prev, fps: frameCountRef.current }));
          frameCountRef.current = 0;
          lastFrameRef.current = now;
        }

        let leftHand: HandLandmarks | null = null;
        let rightHand: HandLandmarks | null = null;

        if (res.multiHandLandmarks && res.multiHandedness) {
          res.multiHandLandmarks.forEach((lm: any, idx: number) => {
            const handedness = res.multiHandedness[idx].label as "Left" | "Right";
            const score = res.multiHandedness[idx].score as number;
            const hand = {
              landmarks: lm.map((p: any) => [p.x, p.y, p.z]),
              handedness: handedness === "Left" ? "Right" : "Left", // camera mirror
              score,
            };
            if (hand.handedness === "Left") leftHand = hand;
            else rightHand = hand;
          });
        }

        if (!cancelled) {
          setResults({
            leftHand,
            rightHand,
            timestamp: Date.now(),
            fps: frameCountRef.current || results.fps,
          });
        }
      });

      const camera = new Camera(videoElement, {
        onFrame: async () => {
          // Avoid sending frames until the video element has data
          if (!videoElement || videoElement.readyState < 2) return;
          try {
            await hands.send({ image: videoElement });
          } catch (err) {
            console.error("MediaPipe send error", err);
          }
        },
        width: 1280,
        height: 720,
      });

      handsRef.current = hands;
      cameraRef.current = camera;
      camera.start();
      setLoading(false);
    };

    init();

    return () => {
      cancellingRef.current = true;
      cancelled = true;
      handsRef.current?.close();
      cameraRef.current?.stop();
    };
  }, [videoElement]);

  return { results, loading };
}
