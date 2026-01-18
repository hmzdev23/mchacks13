/**
 * Score Meter Component
 * 
 * Circular progress indicator showing real-time alignment score.
 * Uses AnimatedCircularProgressBar with smooth animations.
 */

"use client";

import { cn } from "@/lib/utils";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";

interface ScoreMeterProps {
    score: number;
    trend?: number;
    showTrend?: boolean;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function ScoreMeter({
    score,
    className,
}: ScoreMeterProps) {
    return (
        <AnimatedCircularProgressBar
            value={score}
            max={100}
            min={0}
            className={cn("w-[180px] h-[180px]", className)}
        />
    );
}
