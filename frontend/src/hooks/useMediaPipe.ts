/**
 * useMediaPipe Hook
 * 
 * Real-time hand and pose detection using MediaPipe.
 * Runs entirely in the browser for zero-latency tracking.
 * 
 * Target: 30+ FPS
 */

import { useRef, useEffect, useState, useCallback } from "react";

export interface HandLandmarks {
    landmarks: number[][];  // 21 points, each [x, y, z]
    handedness: "Left" | "Right";
    score: number;
}

export interface PoseLandmarks {
    landmarks: number[][];  // 33 points, each [x, y, z, visibility]
}

export interface MediaPipeResults {
    leftHand: HandLandmarks | null;
    rightHand: HandLandmarks | null;
    pose: PoseLandmarks | null;
    timestamp: number;
    fps: number;
}

interface UseMediaPipeOptions {
    detectHands?: boolean;
    detectPose?: boolean;
    onResults?: (results: MediaPipeResults) => void;
}

export function useMediaPipe(
    videoElement: HTMLVideoElement | null,
    options: UseMediaPipeOptions = {}
) {
    const { detectHands = true, detectPose = false, onResults } = options;

    const handsRef = useRef<any>(null);
    const poseRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const animationRef = useRef<number | undefined>(undefined);
    const isInitializedRef = useRef(false);

    // Use ref for callback to avoid dependency issues
    const onResultsRef = useRef(onResults);
    onResultsRef.current = onResults;

    const [isLoading, setIsLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [fps, setFps] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const lastFrameTimeRef = useRef(0);
    const frameCountRef = useRef(0);

    const resultsRef = useRef<MediaPipeResults>({
        leftHand: null,
        rightHand: null,
        pose: null,
        timestamp: 0,
        fps: 0,
    });

    // Process hand results
    const processHandResults = useCallback((results: any) => {
        let leftHand: HandLandmarks | null = null;
        let rightHand: HandLandmarks | null = null;

        if (results.multiHandLandmarks && results.multiHandedness) {
            results.multiHandLandmarks.forEach((landmarks: any, index: number) => {
                const handedness = results.multiHandedness[index];
                const hand: HandLandmarks = {
                    landmarks: landmarks.map((lm: any) => [lm.x, lm.y, lm.z]),
                    handedness: handedness.label as "Left" | "Right",
                    score: handedness.score,
                };

                // Note: MediaPipe returns mirrored handedness
                // "Left" from MediaPipe = user's right hand (camera is mirrored)
                if (handedness.label === "Left") {
                    rightHand = hand;
                } else {
                    leftHand = hand;
                }
            });
        }

        resultsRef.current.leftHand = leftHand;
        resultsRef.current.rightHand = rightHand;
        resultsRef.current.timestamp = Date.now();
    }, []);

    // Load MediaPipe scripts dynamically - only run once per video element
    useEffect(() => {
        if (!videoElement) return;

        // Prevent double initialization
        if (isInitializedRef.current) {
            return;
        }

        let isActive = true;
        isInitializedRef.current = true;

        const loadScripts = async () => {
            try {
                // Load hands module
                if (detectHands) {
                    const { Hands } = await import("@mediapipe/hands");
                    const { Camera } = await import("@mediapipe/camera_utils");

                    if (!isActive) return;

                    handsRef.current = new Hands({
                        locateFile: (file) =>
                            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
                    });

                    handsRef.current.setOptions({
                        maxNumHands: 2,
                        modelComplexity: 1,
                        minDetectionConfidence: 0.5,
                        minTrackingConfidence: 0.5,
                    });

                    handsRef.current.onResults((results: any) => {
                        if (!isActive) return;

                        processHandResults(results);

                        // FPS calculation
                        const now = performance.now();
                        frameCountRef.current++;
                        if (now - lastFrameTimeRef.current >= 1000) {
                            setFps(frameCountRef.current);
                            resultsRef.current.fps = frameCountRef.current;
                            frameCountRef.current = 0;
                            lastFrameTimeRef.current = now;
                        }

                        // Callback with results - use ref to get latest callback
                        onResultsRef.current?.(resultsRef.current);
                    });

                    // Use MediaPipe Camera utility - it handles everything properly
                    cameraRef.current = new Camera(videoElement, {
                        onFrame: async () => {
                            if (handsRef.current && isActive) {
                                try {
                                    await handsRef.current.send({ image: videoElement });
                                } catch (err) {
                                    // Ignore errors if instance is being cleaned up
                                    if (isActive) {
                                        console.error("MediaPipe send error:", err);
                                    }
                                }
                            }
                        },
                        width: 1280,
                        height: 720,
                    });

                    await cameraRef.current.start();
                    console.log("MediaPipe Camera started successfully");
                }

                if (isActive) {
                    setIsLoading(false);
                    setIsReady(true);
                }
            } catch (err) {
                console.error("MediaPipe initialization error:", err);
                if (isActive) {
                    setError("Failed to load MediaPipe. Please refresh the page.");
                    setIsLoading(false);
                }
            }
        };

        loadScripts();

        return () => {
            isActive = false;
            isInitializedRef.current = false;

            // Stop camera first to prevent more frames being sent
            if (cameraRef.current) {
                try {
                    cameraRef.current.stop();
                } catch (e) {
                    // Ignore stop errors
                }
                cameraRef.current = null;
            }

            // Then close hands with a small delay to let pending operations complete
            setTimeout(() => {
                if (handsRef.current) {
                    try {
                        handsRef.current.close();
                    } catch (e) {
                        // Ignore close errors - instance might already be deleted
                    }
                    handsRef.current = null;
                }
                if (poseRef.current) {
                    try {
                        poseRef.current.close();
                    } catch (e) {
                        // Ignore close errors
                    }
                    poseRef.current = null;
                }
            }, 100);

            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
        // Only depend on videoElement and detectHands - NOT on callbacks
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoElement, detectHands]);

    // Get current results
    const getResults = useCallback(() => resultsRef.current, []);

    return {
        results: resultsRef.current,
        getResults,
        isLoading,
        isReady,
        fps,
        error,
    };
}
