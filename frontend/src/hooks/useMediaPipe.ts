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

  useEffect(() => {
    if (!videoElement) return;

    let cancelled = false;

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
            fps: res.image?.currentTime ? Math.round(1 / res.image.currentTime) : results.fps,
          });
        }
      });

      const camera = new Camera(videoElement, {
        onFrame: async () => {
          await hands.send({ image: videoElement });
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
      cancelled = true;
      handsRef.current?.close();
      cameraRef.current?.stop();
    };
  }, [videoElement]);

  return { results, loading };
}
