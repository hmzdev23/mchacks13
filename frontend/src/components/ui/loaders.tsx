/**
 * Loaders
 * 
 * Beautiful loading indicators for various states.
 */

"use client";

import { cn } from "@/lib/utils";

interface SpinnerProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
    const sizes = {
        sm: "w-4 h-4 border-2",
        md: "w-8 h-8 border-2",
        lg: "w-12 h-12 border-3",
    };

    return (
        <div
            className={cn(
                "rounded-full border-[var(--color-accent-primary)] border-t-transparent animate-spin",
                sizes[size],
                className
            )}
        />
    );
}

interface PulseLoaderProps {
    className?: string;
}

export function PulseLoader({ className }: PulseLoaderProps) {
    return (
        <div className={cn("flex items-center gap-1", className)}>
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[var(--color-accent-primary)]"
                    style={{
                        animation: "pulse 1.4s ease-in-out infinite",
                        animationDelay: `${i * 0.16}s`,
                    }}
                />
            ))}
            <style jsx>{`
        @keyframes pulse {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
        </div>
    );
}

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "bg-[var(--color-bg-elevated)] rounded-lg animate-shimmer",
                className
            )}
        />
    );
}

interface ProgressLoaderProps {
    progress: number;
    className?: string;
    showLabel?: boolean;
}

export function ProgressLoader({ progress, className, showLabel = true }: ProgressLoaderProps) {
    return (
        <div className={cn("w-full", className)}>
            <div className="h-2 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
            </div>
            {showLabel && (
                <p className="text-sm text-[var(--color-text-secondary)] mt-2 text-center">
                    {Math.round(progress)}%
                </p>
            )}
        </div>
    );
}

interface CircularLoaderProps {
    progress?: number;
    size?: number;
    strokeWidth?: number;
    className?: string;
}

export function CircularLoader({
    progress,
    size = 48,
    strokeWidth = 4,
    className,
}: CircularLoaderProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const isIndeterminate = progress === undefined;

    return (
        <svg
            width={size}
            height={size}
            className={cn(isIndeterminate && "animate-spin", className)}
            viewBox={`0 0 ${size} ${size}`}
        >
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--color-bg-elevated)"
                strokeWidth={strokeWidth}
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="url(#gradient)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={
                    isIndeterminate
                        ? circumference * 0.75
                        : circumference - (circumference * (progress ?? 0)) / 100
                }
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="transition-all duration-300 ease-out"
            />
            <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--color-accent-primary)" />
                    <stop offset="100%" stopColor="var(--color-accent-secondary)" />
                </linearGradient>
            </defs>
        </svg>
    );
}
