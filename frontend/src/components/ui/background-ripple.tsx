/**
 * Background Ripple
 * 
 * Expanding circular ripples from center.
 * Perfect for calibration/ready states.
 */

"use client";

import { cn } from "@/lib/utils";

interface BackgroundRippleProps {
    className?: string;
    color?: string;
    count?: number;
}

export function BackgroundRipple({
    className,
    color = "var(--color-accent-primary)",
    count = 4,
}: BackgroundRippleProps) {
    return (
        <div className={cn("absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none", className)}>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="absolute rounded-full border"
                    style={{
                        borderColor: color,
                        width: "100px",
                        height: "100px",
                        opacity: 0,
                        animation: `ripple 4s ease-out ${i * 1}s infinite`,
                    }}
                />
            ))}
            <style jsx>{`
        @keyframes ripple {
          0% {
            transform: scale(0.8);
            opacity: 0.8;
          }
          100% {
            transform: scale(6);
            opacity: 0;
          }
        }
      `}</style>
        </div>
    );
}
