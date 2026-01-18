"use client";

import { useEffect, useRef, useState } from "react";

export interface PoseResults {
    landmarks: any[];
    timestamp: number;
    fps: number;
}

const INITIAL_RESULTS: PoseResults = {
    landmarks: [],
    timestamp: 0,
    fps: 0,
};

interface UsePoseMediaPipeOptions {
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
}

export function usePoseMediaPipe(videoElement: HTMLVideoElement | null, options: UsePoseMediaPipeOptions = {}) {
    const { minDetectionConfidence = 0.7, minTrackingConfidence = 0.5 } = options;
    const [results, setResults] = useState<PoseResults>(INITIAL_RESULTS);
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
                    playPromise.catch(() => { });
                }

                const { Pose } = await import("@mediapipe/pose");
                if (cancelled) return;

                const pose = new Pose({
                    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
                });

                pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    smoothSegmentation: true,
                    minDetectionConfidence,
                    minTrackingConfidence,
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

                    setResults((prev) => ({
                        landmarks: res.poseLandmarks || [],
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
                                console.warn("MediaPipe Pose send warning:", err);
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
                } catch { }
                poseRef.current = null;
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }
        };
    }, [videoElement, minDetectionConfidence, minTrackingConfidence]);

    return { results, loading, ready, error };
}
