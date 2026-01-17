/**
 * Background Lines
 * 
 * Animated scan lines across the background.
 * Creates a futuristic, tech-forward aesthetic.
 */

"use client";

import { cn } from "@/lib/utils";

interface BackgroundLinesProps {
    className?: string;
    lineColor?: string;
    lineCount?: number;
}

export function BackgroundLines({
    className,
    lineColor = "rgba(99, 102, 241, 0.1)",
    lineCount = 20,
}: BackgroundLinesProps) {
    return (
        <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
            {/* Static horizontal lines */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `repeating-linear-gradient(
            0deg,
            ${lineColor} 0px,
            ${lineColor} 1px,
            transparent 1px,
            transparent ${100 / lineCount}%
          )`,
                }}
            />

            {/* Moving scan line */}
            <div
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent-primary)] to-transparent opacity-50"
                style={{
                    animation: "scan-line 3s linear infinite",
                    top: "-1px",
                }}
            />

            {/* Vertical accent lines */}
            <div className="absolute left-1/4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[var(--color-accent-primary)]/10 to-transparent" />
            <div className="absolute right-1/4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[var(--color-accent-primary)]/10 to-transparent" />
        </div>
    );
}
