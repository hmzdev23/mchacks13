/**
 * Score Meter Component
 * 
 * Circular progress indicator showing real-time alignment score.
 * Changes color based on score and shows trend indicator.
 */

"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedTooltip } from "@/components/ui/animated-tooltip";

interface ScoreMeterProps {
    score: number;          // 0-100
    trend?: number;         // positive = improving
    showTrend?: boolean;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function ScoreMeter({
    score,
    trend = 0,
    showTrend = true,
    size = "lg",
    className,
}: ScoreMeterProps) {
    // Determine color based on score
    const colors = useMemo(() => {
        if (score >= 90) return {
            primary: "#6366f1",
            glow: "rgba(99, 102, 241, 0.5)",
            label: "Perfect!",
            gradient: "from-indigo-500 to-purple-500",
        };
        if (score >= 75) return {
            primary: "#22c55e",
            glow: "rgba(34, 197, 94, 0.5)",
            label: "Great!",
            gradient: "from-green-500 to-emerald-500",
        };
        if (score >= 50) return {
            primary: "#f59e0b",
            glow: "rgba(245, 158, 11, 0.5)",
            label: "Keep going",
            gradient: "from-amber-500 to-orange-500",
        };
        return {
            primary: "#ef4444",
            glow: "rgba(239, 68, 68, 0.5)",
            label: "Try again",
            gradient: "from-red-500 to-rose-500",
        };
    }, [score]);

    const sizeConfig = {
        sm: { container: "w-20 h-20", text: "text-xl", label: "text-[10px]", radius: 32, stroke: 4 },
        md: { container: "w-28 h-28", text: "text-2xl", label: "text-xs", radius: 44, stroke: 5 },
        lg: { container: "w-36 h-36", text: "text-4xl", label: "text-sm", radius: 56, stroke: 6 },
    };

    const config = sizeConfig[size];
    const circumference = 2 * Math.PI * config.radius;
    const progress = (score / 100) * circumference;

    return (
        <AnimatedTooltip
            content={
                <div className="text-center">
                    <p className="font-medium">Alignment Score</p>
                    <p className="text-[var(--color-text-secondary)] text-xs">
                        How well you match the ghost
                    </p>
                </div>
            }
            position="bottom"
        >
            <div className={cn("relative", config.container, className)}>
                {/* Background glow */}
                <motion.div
                    className="absolute inset-0 rounded-full blur-xl opacity-50"
                    animate={{
                        backgroundColor: colors.glow,
                        scale: score >= 90 ? [1, 1.1, 1] : 1,
                    }}
                    transition={{
                        backgroundColor: { duration: 0.3 },
                        scale: { repeat: Infinity, duration: 2 },
                    }}
                />

                {/* Circular progress */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                    {/* Background circle */}
                    <circle
                        cx="70"
                        cy="70"
                        r={config.radius}
                        fill="none"
                        stroke="rgba(0, 0, 0, 0.08)"
                        strokeWidth={config.stroke}
                    />

                    {/* Progress circle */}
                    <motion.circle
                        cx="70"
                        cy="70"
                        r={config.radius}
                        fill="none"
                        stroke={colors.primary}
                        strokeWidth={config.stroke}
                        strokeLinecap="round"
                        initial={{ strokeDashoffset: circumference }}
                        animate={{
                            strokeDashoffset: circumference - progress,
                            stroke: colors.primary,
                        }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        strokeDasharray={circumference}
                        style={{
                            filter: `drop-shadow(0 0 10px ${colors.glow})`,
                        }}
                    />
                </svg>

                {/* Score text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                        className={cn("font-display font-bold", config.text)}
                        animate={{ color: colors.primary }}
                        transition={{ duration: 0.3 }}
                    >
                        {Math.round(score)}
                    </motion.span>

                    {showTrend && trend !== 0 && (
                        <motion.span
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "text-xs font-medium flex items-center gap-0.5",
                                trend > 0 ? "text-[var(--color-success)]" : "text-[var(--color-error)]"
                            )}
                        >
                            {trend > 0 ? (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                            ) : (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            )}
                            {Math.abs(Math.round(trend))}
                        </motion.span>
                    )}

                    <span className={cn("text-[var(--color-text-secondary)] mt-0.5", config.label)}>
                        {colors.label}
                    </span>
                </div>
            </div>
        </AnimatedTooltip>
    );
}
