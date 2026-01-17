/**
 * Session Controls Component
 * 
 * Play/pause/restart controls for the practice session.
 */

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedTooltip } from "@/components/ui/animated-tooltip";

interface SessionControlsProps {
    isPlaying: boolean;
    onPlay: () => void;
    onPause: () => void;
    onRestart: () => void;
    onSlowMode?: () => void;
    isSlowMode?: boolean;
    className?: string;
}

export function SessionControls({
    isPlaying,
    onPlay,
    onPause,
    onRestart,
    onSlowMode,
    isSlowMode = false,
    className,
}: SessionControlsProps) {
    return (
        <div className={cn("flex items-center gap-4", className)}>
            {/* Restart button */}
            <AnimatedTooltip content="Restart" position="top">
                <motion.button
                    onClick={onRestart}
                    className="w-12 h-12 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </motion.button>
            </AnimatedTooltip>

            {/* Play/Pause button */}
            <motion.button
                onClick={isPlaying ? onPause : onPlay}
                className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center",
                    "bg-[var(--color-accent-primary)]",
                    "text-white shadow-lg",
                    "hover:bg-[var(--color-accent-secondary)] hover:shadow-xl"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {isPlaying ? (
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                ) : (
                    <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                )}
            </motion.button>

            {/* Slow mode button */}
            {onSlowMode && (
                <AnimatedTooltip content={isSlowMode ? "Normal Speed" : "Slow Mode"} position="top">
                    <motion.button
                        onClick={onSlowMode}
                        className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                            isSlowMode
                                ? "bg-[var(--color-accent-primary)] text-white"
                                : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
                        )}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </motion.button>
                </AnimatedTooltip>
            )}
        </div>
    );
}
