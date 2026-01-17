/**
 * Cue Display Component
 * 
 * Shows coaching cues in a non-intrusive but visible way.
 * Cues animate in/out smoothly and feel helpful, not nagging.
 */

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CueDisplayProps {
    primaryCue: string | null;
    secondaryCue?: string | null;
    encouragement?: string | null;
    className?: string;
}

export function CueDisplay({
    primaryCue,
    secondaryCue,
    encouragement,
    className,
}: CueDisplayProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [currentCue, setCurrentCue] = useState<string | null>(null);

    useEffect(() => {
        if (primaryCue && primaryCue !== currentCue) {
            setCurrentCue(primaryCue);
            setIsVisible(true);

            // Auto-hide after 5 seconds if no new cue
            const timer = setTimeout(() => setIsVisible(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [primaryCue, currentCue]);

    return (
        <div className={cn("pointer-events-none", className)}>
            <AnimatePresence mode="wait">
                {isVisible && currentCue && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="glass-heavy rounded-2xl px-6 py-4 max-w-md mx-auto"
                    >
                        {/* Encouragement badge */}
                        {encouragement && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="mb-2"
                            >
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-[var(--color-success)]/20 text-[var(--color-success)] rounded-full">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {encouragement}
                                </span>
                            </motion.div>
                        )}

                        {/* Primary cue */}
                        <p className="text-lg font-medium text-[var(--color-text-primary)]">
                            {currentCue}
                        </p>

                        {/* Secondary cue */}
                        {secondaryCue && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-sm text-[var(--color-text-secondary)] mt-2"
                            >
                                {secondaryCue}
                            </motion.p>
                        )}

                        {/* Decorative accent line */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] rounded-full" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
