/**
 * Voice Indicator Component
 * 
 * Shows when voice commands are actively listening.
 */

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VoiceIndicatorProps {
    isListening: boolean;
    lastCommand?: string | null;
    className?: string;
}

export function VoiceIndicator({
    isListening,
    lastCommand,
    className,
}: VoiceIndicatorProps) {
    return (
        <div className={cn("flex items-center gap-3", className)}>
            {/* Microphone icon with pulse */}
            <div className="relative">
                <motion.div
                    className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        isListening
                            ? "bg-[var(--color-accent-primary)]"
                            : "bg-[var(--color-bg-elevated)]"
                    )}
                    animate={isListening ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                >
                    <svg
                        className={cn(
                            "w-5 h-5",
                            isListening ? "text-white" : "text-[var(--color-text-secondary)]"
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                    </svg>
                </motion.div>

                {/* Pulse rings when listening */}
                {isListening && (
                    <>
                        <motion.div
                            className="absolute inset-0 rounded-full border-2 border-[var(--color-accent-primary)]"
                            initial={{ scale: 1, opacity: 0.6 }}
                            animate={{ scale: 2, opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        />
                        <motion.div
                            className="absolute inset-0 rounded-full border-2 border-[var(--color-accent-primary)]"
                            initial={{ scale: 1, opacity: 0.6 }}
                            animate={{ scale: 2, opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
                        />
                    </>
                )}
            </div>

            {/* Status text */}
            <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {isListening ? "Listening for commands..." : "Hands-Free Control"}
                </span>
                {lastCommand && (
                    <motion.span
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={lastCommand}
                        className="text-xs text-[var(--color-text-tertiary)]"
                    >
                        Last: "{lastCommand}"
                    </motion.span>
                )}
                {!isListening && !lastCommand && (
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                        Say "start", "slow", "restart"
                    </span>
                )}
            </div>
        </div>
    );
}
