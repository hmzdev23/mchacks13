"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedCircularProgressBarProps {
    value: number;
    max?: number;
    min?: number;
    className?: string;
}

export function AnimatedCircularProgressBar({
    value,
    max = 100,
    min = 0,
    className,
}: AnimatedCircularProgressBarProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const [animatedValue, setAnimatedValue] = useState(value);
    const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral');
    const prevValueRef = useRef(value);

    // Track trend based on value changes
    useEffect(() => {
        if (value > prevValueRef.current + 2) {
            setTrend('up');
        } else if (value < prevValueRef.current - 2) {
            setTrend('down');
        }
        prevValueRef.current = value;
    }, [value]);

    // Animate the value change
    useEffect(() => {
        const startValue = animatedValue;
        const endValue = value;
        const duration = 400; // ms
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const eased = 1 - Math.pow(1 - progress, 3);

            const current = startValue + (endValue - startValue) * eased;
            setAnimatedValue(current);
            setDisplayValue(Math.round(current));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value]);

    const size = 180;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const normalizedValue = Math.min(max, Math.max(min, animatedValue));
    const percentage = ((normalizedValue - min) / (max - min)) * 100;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    // Color based on trend
    const getColor = () => {
        if (trend === 'up') return "rgb(34, 197, 94)"; // green-500
        if (trend === 'down') return "rgb(239, 68, 68)"; // red-500
        // Neutral - use score-based color
        if (value >= 75) return "rgb(34, 197, 94)"; // green
        if (value >= 50) return "rgb(245, 158, 11)"; // amber
        return "rgb(239, 68, 68)"; // red
    };

    const getSecondaryColor = () => {
        if (trend === 'up') return "rgba(34, 197, 94, 0.15)";
        if (trend === 'down') return "rgba(239, 68, 68, 0.15)";
        return "rgba(0, 0, 0, 0.08)";
    };

    const primaryColor = getColor();
    const secondaryColor = getSecondaryColor();

    const getTrendLabel = () => {
        if (trend === 'up') return "↑ improving";
        if (trend === 'down') return "↓ adjusting";
        return "live";
    };

    return (
        <div className={cn("relative", className)} style={{ width: size, height: size }}>
            <svg
                viewBox={`0 0 ${size} ${size}`}
                className="w-full h-full -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={secondaryColor}
                    strokeWidth={strokeWidth}
                    className="transition-[stroke] duration-300"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={primaryColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-[stroke] duration-300"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div
                    className="text-4xl font-semibold tabular-nums transition-colors duration-300"
                    style={{ color: primaryColor }}
                >
                    {displayValue}
                </div>
                <div
                    className="text-xs mt-1 font-medium transition-colors duration-300"
                    style={{ color: trend === 'neutral' ? 'var(--stone-400)' : primaryColor }}
                >
                    {getTrendLabel()}
                </div>
            </div>
        </div>
    );
}
