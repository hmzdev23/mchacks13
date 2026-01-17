/**
 * Calibration Page
 * 
 * Helps user position themselves before starting the session.
 * Clean, modern light mode design.
 */

"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Camera, CameraRef } from "@/components/session/Camera";
import { BackgroundRipple } from "@/components/ui/background-ripple";
import { StatefulButton } from "@/components/ui/stateful-button";
import { Spinner } from "@/components/ui/loaders";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import { useSessionStore } from "@/store/sessionStore";

function CalibrationContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const packId = searchParams.get("pack") || "sign-language";

    const cameraRef = useRef<CameraRef>(null);
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [handsDetected, setHandsDetected] = useState(false);
    const [countDown, setCountDown] = useState<number | null>(null);

    const { setPackAndLesson } = useSessionStore();

    const { isLoading, results } = useMediaPipe(videoElement, {
        detectHands: true,
        onResults: (res) => {
            const detected = res.leftHand !== null || res.rightHand !== null;
            setHandsDetected(detected);

            // Auto-ready after detecting hands for 2 seconds
            if (detected && !isReady) {
                setIsReady(true);
            }
        },
    });

    const handleStart = () => {
        setCountDown(3);
    };

    useEffect(() => {
        if (countDown === null) return;

        if (countDown > 0) {
            const timer = setTimeout(() => setCountDown(countDown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            // Set session and navigate
            setPackAndLesson(packId, "hello", "Hello");
            router.push(`/session?pack=${packId}&lesson=hello`);
        }
    }, [countDown, packId, router, setPackAndLesson]);

    return (
        <main className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col relative">
            {/* Gradient Blur Orbs */}
            <div className="gradient-blur-container">
                <div className="gradient-orb gradient-orb-1" />
                <div className="gradient-orb gradient-orb-2" />
            </div>

            {/* Header */}
            <header className="relative z-10 m-4 mb-0">
                <div className="glass-nav rounded-2xl">
                    <div className="container mx-auto px-6 py-3 flex items-center justify-between">
                        <Link href="/" className="glass-button flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span className="text-sm font-medium">Back</span>
                        </Link>
                        <h1 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Calibration</h1>
                        <div className="w-20" />
                    </div>
                </div>
            </header>

            {/* Main content */}
            <div className="flex-1 container mx-auto px-6 py-8 flex flex-col items-center justify-center relative z-10">
                {/* Camera preview */}
                <div className="relative w-full max-w-3xl aspect-video mb-8">
                    <div className="absolute inset-0 glass-heavy rounded-2xl overflow-hidden">
                        <Camera
                            ref={cameraRef}
                            onStreamReady={(video) => setVideoElement(video)}
                            className="w-full h-full"
                        />
                    </div>

                    {/* Ready ripple effect */}
                    {isReady && !countDown && (
                        <BackgroundRipple
                            className="absolute inset-0 rounded-2xl"
                            color="var(--color-success)"
                            count={3}
                        />
                    )}

                    {/* Countdown overlay */}
                    <AnimatePresence>
                        {countDown !== null && countDown > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.5 }}
                                className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl"
                            >
                                <motion.span
                                    key={countDown}
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 2 }}
                                    className="text-8xl font-display font-bold gradient-text-blue"
                                >
                                    {countDown}
                                </motion.span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Loading overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-elevated)]/90 rounded-2xl">
                            <div className="flex flex-col items-center gap-4">
                                <Spinner size="lg" />
                                <p className="text-[var(--color-text-secondary)] font-medium">Loading hand tracking...</p>
                            </div>
                        </div>
                    )}

                    {/* Guide overlay */}
                    {!isLoading && !countDown && (
                        <div className="absolute inset-4 border-2 border-dashed border-[rgba(0,0,0,0.1)] rounded-xl pointer-events-none">
                            {/* Center target */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <motion.div
                                    className={`w-32 h-32 rounded-full border-2 ${handsDetected
                                            ? "border-[var(--color-success)] bg-[var(--color-success)]/5"
                                            : "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/5"
                                        }`}
                                    animate={{
                                        scale: handsDetected ? [1, 1.05, 1] : 1,
                                    }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-4xl">✋</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Status and instructions */}
                <div className="text-center max-w-md">
                    <motion.div
                        key={handsDetected ? "detected" : "not-detected"}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        {handsDetected ? (
                            <div className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 rounded-xl px-6 py-4">
                                <div className="flex items-center justify-center gap-2 text-[var(--color-success)] mb-1">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="font-semibold">Hands detected!</span>
                                </div>
                                <p className="text-[var(--color-text-secondary)] text-sm">
                                    You're all set. Click Start when ready.
                                </p>
                            </div>
                        ) : (
                            <div className="glass-card rounded-xl px-6 py-4">
                                <p className="text-[var(--color-text-primary)] font-semibold mb-1">
                                    Position your hands in frame
                                </p>
                                <p className="text-[var(--color-text-secondary)] text-sm">
                                    Make sure your hands are visible and well-lit.
                                </p>
                            </div>
                        )}
                    </motion.div>

                    {/* Start button */}
                    <StatefulButton
                        variant="primary"
                        size="lg"
                        onClick={handleStart}
                        disabled={!handsDetected || countDown !== null}
                        state={countDown !== null ? "loading" : "idle"}
                        loadingText="Starting..."
                    >
                        <span className="flex items-center gap-2">
                            Start Session
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </span>
                    </StatefulButton>
                </div>
            </div>
        </main>
    );
}

export default function CalibratePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--color-bg-secondary)] flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        }>
            <CalibrationContent />
        </Suspense>
    );
}
