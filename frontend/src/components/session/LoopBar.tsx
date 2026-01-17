/**
 * Loop Bar Component
 * 
 * Controls for loop segment practice mode.
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/sessionStore";

interface LoopBarProps {
    totalFrames: number;
    className?: string;
}

export function LoopBar({ totalFrames, className }: LoopBarProps) {
    const {
        currentFrame,
        isLooping,
        loopStart,
        loopEnd,
        loopAttempts,
        loopBestScore,
        startLoop,
        stopLoop,
        setCurrentFrame,
    } = useSessionStore();

    const [isDragging, setIsDragging] = useState(false);
    const [selectionStart, setSelectionStart] = useState<number | null>(null);

    const progress = totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0;
    const loopStartPercent = totalFrames > 0 ? (loopStart / totalFrames) * 100 : 0;
    const loopEndPercent = totalFrames > 0 ? (loopEnd / totalFrames) * 100 : 0;

    const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        const frame = Math.floor(percent * totalFrames);

        if (isLooping) {
            setCurrentFrame(frame);
        } else {
            // Start selection for loop
            setSelectionStart(frame);
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (selectionStart === null) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        const frame = Math.floor(percent * totalFrames);

        // Update visual preview
        if (frame !== selectionStart) {
            setIsDragging(true);
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (selectionStart === null || !isDragging) {
            setSelectionStart(null);
            setIsDragging(false);
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        const frame = Math.floor(percent * totalFrames);

        const start = Math.min(selectionStart, frame);
        const end = Math.max(selectionStart, frame);

        if (end - start >= 10) { // Minimum 10 frames for a loop
            startLoop(start, end);
        }

        setSelectionStart(null);
        setIsDragging(false);
    };

    return (
        <div className={cn("bg-[var(--color-bg-elevated)] border border-[rgba(0,0,0,0.05)] rounded-2xl p-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        isLooping
                            ? "bg-[var(--color-accent-primary)]"
                            : "bg-[var(--color-bg-elevated)]"
                    )}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <div>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                            {isLooping ? "Loop Mode" : "Timeline"}
                        </span>
                        {isLooping && (
                            <p className="text-xs text-[var(--color-text-secondary)]">
                                Attempt {loopAttempts} • Best: {Math.round(loopBestScore)}
                            </p>
                        )}
                    </div>
                </div>

                {isLooping && (
                    <button
                        onClick={stopLoop}
                        className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                        Exit Loop
                    </button>
                )}
            </div>

            {/* Timeline bar */}
            <div
                className="relative h-8 bg-[var(--color-bg-elevated)] rounded-lg cursor-pointer overflow-hidden"
                onMouseDown={handleBarClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => {
                    setSelectionStart(null);
                    setIsDragging(false);
                }}
            >
                {/* Loop region highlight */}
                {isLooping && (
                    <div
                        className="absolute top-0 bottom-0 bg-[var(--color-accent-primary)]/20 border-l-2 border-r-2 border-[var(--color-accent-primary)]"
                        style={{
                            left: `${loopStartPercent}%`,
                            width: `${loopEndPercent - loopStartPercent}%`,
                        }}
                    />
                )}

                {/* Progress indicator */}
                <motion.div
                    className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-accent-primary)] shadow-md"
                    style={{ left: `${progress}%` }}
                    layoutId="progress"
                />

                {/* Frame markers */}
                {Array.from({ length: 10 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute top-0 bottom-0 w-px bg-[rgba(0,0,0,0.1)]"
                        style={{ left: `${(i + 1) * 10}%` }}
                    />
                ))}
            </div>

            {/* Instructions */}
            {!isLooping && (
                <p className="text-xs text-[var(--color-text-tertiary)] mt-2 text-center">
                    Click and drag to select a loop region
                </p>
            )}
        </div>
    );
}
