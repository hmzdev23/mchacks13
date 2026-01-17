/**
 * Session Page
 * 
 * The main practice interface - where the magic happens.
 * Clean, modern light mode design.
 */

"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Camera, CameraRef } from "@/components/session/Camera";
import { GhostOverlay } from "@/components/session/GhostOverlay";
import { ScoreMeter } from "@/components/session/ScoreMeter";
import { CueDisplay } from "@/components/session/CueDisplay";
import { LoopBar } from "@/components/session/LoopBar";
import { SessionControls } from "@/components/session/SessionControls";
import { VoiceIndicator } from "@/components/session/VoiceIndicator";
import { ElevenLabsAgent } from "@/components/session/ElevenLabsAgent";
import { Spinner } from "@/components/ui/loaders";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";
import { useSessionStore } from "@/store/sessionStore";
import { alignHands } from "@/lib/alignment";
import { scoreFrame, resetScoring } from "@/lib/scoring";
import { generateCues } from "@/lib/cueMapper";
import { coachingAPI, voiceAPI } from "@/lib/api/client";

import ASL_LANDMARKS from "@/data/asl_landmarks.json";

function SessionContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const packId = searchParams.get("pack") || "sign-language";
    const lessonId = (searchParams.get("lesson") || "A").toUpperCase(); // Default to 'A'

    const cameraRef = useRef<CameraRef>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
    const [dimensions, setDimensions] = useState({ width: 1280, height: 720 });

    const {
        isActive,
        isPaused,
        currentScore,
        scoreHistory,
        topErrorJoints,
        trend,
        currentCue,
        currentFrame,
        totalFrames,
        expertKeypoints,
        alignmentTransform,
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        updateUserKeypoints,
        setExpertFrames,
        setCurrentFrame,
        updateAlignment,
        updateScore,
        setCue,
    } = useSessionStore();

    const [isSlowMode, setIsSlowMode] = useState(false);
    const [fps, setFps] = useState(0);
    const lastCoachingTime = useRef(0);

    // Initialize session with ASL data
    useEffect(() => {
        resetScoring();

        // Load landmarks for the current letter
        const landmarks = (ASL_LANDMARKS as any)[lessonId];

        if (landmarks) {
            // For static poses, we just replicate the single frame to create a "video" of length 1
            // or just set it as a single frame. The store expects an array of frames.
            // Let's create a 1-second static "video" at 30fps so the loop bar has something to show
            const staticFrames = Array(30).fill(landmarks);
            setExpertFrames(staticFrames);
        } else {
            console.error(`No landmarks found for lesson: ${lessonId}`);
            // Fallback to 'A' or empty
            const fallback = (ASL_LANDMARKS as any)["A"];
            setExpertFrames(Array(30).fill(fallback || []));
        }

        startSession();

        return () => {
            endSession();
        };
    }, [setExpertFrames, startSession, endSession, lessonId]);

    // Handle container resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
                });
            }
        };

        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    // MediaPipe tracking
    const { isLoading, results } = useMediaPipe(videoElement, {
        detectHands: true,
        onResults: (res) => {
            setFps(res.fps);

            // Get user hand (prefer right hand)
            const userHand = res.rightHand?.landmarks || res.leftHand?.landmarks;

            if (userHand && expertKeypoints.leftHand) {
                updateUserKeypoints({
                    leftHand: res.leftHand?.landmarks || null,
                    rightHand: res.rightHand?.landmarks || null,
                    pose: null,
                });

                // Align expert to user
                const alignment = alignHands(expertKeypoints.leftHand, userHand);
                updateAlignment({
                    scale: alignment.scale,
                    translation: alignment.translation,
                    rotation: alignment.rotation,
                });

                // Score the frame
                const scoring = scoreFrame(userHand, alignment.alignedExpert);
                updateScore(scoring.overallScore, scoring.topErrorJoints);

                // Generate cues
                const cues = generateCues(
                    userHand,
                    alignment.alignedExpert,
                    scoring.perJointErrors,
                    scoring.topErrorJoints,
                    scoring.overallScore
                );

                if (cues.length > 0) {
                    setCue({
                        primary: cues[0].text,
                        secondary: cues[1]?.text || null,
                        encouragement: scoring.overallScore >= 85 ? "Great!" : null,
                    });

                    // Request coaching from AI (throttled)
                    const now = Date.now();
                    if (now - lastCoachingTime.current > 5000 && cues.length > 0) {
                        lastCoachingTime.current = now;
                        requestCoaching(cues.map(c => c.text), scoring.perJointErrors, scoring.topErrorJoints, scoring.overallScore);
                    }
                }
            }

            // Advance frame
            if (!isPaused && isActive) {
                const speed = isSlowMode ? 0.5 : 1;
                setCurrentFrame(currentFrame + speed);
            }
        },
    });

    // Request AI coaching
    const requestCoaching = async (
        cues: string[],
        errors: Record<number, number>,
        topErrors: number[],
        score: number
    ) => {
        try {
            const response = await coachingAPI.generateCoaching({
                deterministic_cues: cues,
                per_joint_errors: Object.fromEntries(
                    Object.entries(errors).map(([k, v]) => [k, v])
                ),
                top_error_joints: topErrors,
                current_score: score,
                pack_context: packId,
            });

            if (response.should_speak && response.primary_cue) {
                // Synthesize speech
                const audio = await voiceAPI.synthesize(response.primary_cue);
                voiceAPI.playAudio(audio.audio);
            }
        } catch (error) {
            console.error("Coaching error:", error);
        }
    };

    // Voice commands
    const { isListening, lastCommand } = useVoiceCommands({
        enabled: isActive,
        onCommand: (cmd) => {
            switch (cmd) {
                case "start":
                case "stop":
                    isPaused ? resumeSession() : pauseSession();
                    break;
                case "slow":
                    setIsSlowMode(true);
                    break;
                case "normal":
                    setIsSlowMode(false);
                    break;
                case "restart":
                    setCurrentFrame(0);
                    break;
            }
        },
    });

    // End session
    const handleEndSession = () => {
        endSession();
        router.push(`/recap?pack=${packId}&lesson=${lessonId}`);
    };

    return (
        <main className="h-screen bg-[var(--color-bg-primary)] flex flex-col overflow-hidden relative">
            {/* Gradient Blur Orbs */}
            <div className="gradient-blur-container">
                <div className="gradient-orb gradient-orb-1" />
                <div className="gradient-orb gradient-orb-3" />
            </div>

            {/* Header */}
            <header className="flex-none m-4 mb-0 relative z-10">
                <div className="glass-nav rounded-2xl px-6 py-3 flex items-center justify-between">
                    <button
                        onClick={handleEndSession}
                        className="glass-button flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-sm font-medium">End Session</span>
                    </button>

                    <div className="text-center">
                        <h1 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Hello</h1>
                        <p className="text-xs text-[var(--color-text-tertiary)]">Sign Language Pack</p>
                    </div>

                    <div className="glass-button flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--color-text-secondary)]">
                        <div className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
                        <span className="text-xs font-medium">{fps} FPS</span>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <div className="flex-1 flex relative overflow-hidden z-10">
                {/* Camera + Ghost overlay */}
                <div
                    ref={containerRef}
                    className="flex-1 relative m-4 mr-2"
                >
                    <div className="absolute inset-0 glass-heavy rounded-2xl overflow-hidden">
                        <Camera
                            ref={cameraRef}
                            onStreamReady={(video) => setVideoElement(video)}
                            className="absolute inset-0"
                        />

                        {/* Ghost overlay */}
                        {expertKeypoints.leftHand && (
                            <GhostOverlay
                                width={dimensions.width}
                                height={dimensions.height}
                                expertKeypoints={expertKeypoints.leftHand}
                                alignmentTransform={alignmentTransform}
                                topErrorJoints={topErrorJoints}
                                mirrored={true}
                            />
                        )}

                        {/* Score Meter Overlay - Top Right */}
                        <div className="absolute top-4 right-4 z-20">
                            <ScoreMeter
                                score={currentScore}
                                trend={trend}
                                size="md"
                            />
                        </div>

                        {/* Loading overlay */}
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-3">
                                    <Spinner size="lg" />
                                    <p className="text-[var(--color-text-secondary)] font-medium text-sm">Loading...</p>
                                </div>
                            </div>
                        )}

                        {/* Cue display */}
                        <div className="absolute bottom-6 left-6 right-6">
                            <CueDisplay
                                primaryCue={currentCue.primary}
                                secondaryCue={currentCue.secondary}
                                encouragement={currentCue.encouragement}
                            />
                        </div>
                    </div>
                </div>

                {/* Side panel - Redesigned */}
                <div className="w-72 flex-none m-4 ml-2 glass-heavy rounded-2xl p-5 flex flex-col">
                    {/* AI Coach Section */}
                    <ElevenLabsAgent
                        sessionContext={{
                            packId,
                            lessonName: "Hello",
                            currentScore,
                            topErrors: topErrorJoints.map(j => `Joint ${j}`),
                        }}
                    />

                    {/* Divider */}
                    <div className="my-4 h-px bg-[var(--stone-200)]" />

                    {/* Voice Commands Section */}
                    <VoiceIndicator
                        isListening={isListening}
                        lastCommand={lastCommand}
                    />

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Session controls - Centered at bottom */}
                    <div className="flex justify-center pt-4 border-t border-[var(--stone-200)]">
                        <SessionControls
                            isPlaying={!isPaused}
                            onPlay={resumeSession}
                            onPause={pauseSession}
                            onRestart={() => setCurrentFrame(0)}
                            onSlowMode={() => setIsSlowMode(!isSlowMode)}
                            isSlowMode={isSlowMode}
                        />
                    </div>
                </div>
            </div>

            {/* Loop bar */}
            <div className="flex-none mx-4 mb-4 px-6 py-4 glass-heavy rounded-2xl relative z-10">
                <LoopBar totalFrames={totalFrames} />
            </div>
        </main>
    );
}

export default function SessionPage() {
    return (
        <Suspense fallback={
            <div className="h-screen bg-[var(--color-bg-secondary)] flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        }>
            <SessionContent />
        </Suspense>
    );
}
