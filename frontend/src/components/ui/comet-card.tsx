/**
 * Comet Card
 * 
 * Cards with a rotating light trail effect on hover.
 * Creates a premium, dynamic card interaction.
 */

"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CometCardProps {
    children: React.ReactNode;
    className?: string;
    containerClassName?: string;
}

export function CometCard({ children, className, containerClassName }: CometCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [rotationSpeed, setRotationSpeed] = useState(4);
    const cardRef = useRef<HTMLDivElement>(null);

    return (
        <div
            ref={cardRef}
            className={cn("relative group", containerClassName)}
            onMouseEnter={() => {
                setIsHovered(true);
                setRotationSpeed(2);
            }}
            onMouseLeave={() => {
                setIsHovered(false);
                setRotationSpeed(4);
            }}
        >
            {/* Rotating conic gradient (comet tail) */}
            <div
                className={cn(
                    "absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                    "before:absolute before:inset-0 before:rounded-2xl before:p-[1px]"
                )}
                style={{
                    background: `conic-gradient(from 0deg at 50% 50%, 
            transparent 0deg,
            rgba(59, 130, 246, 0.6) 60deg,
            rgba(96, 165, 250, 0.4) 120deg,
            transparent 180deg
          )`,
                    animation: isHovered ? `spin ${rotationSpeed}s linear infinite` : "none",
                }}
            />

            {/* Glow effect */}
            <div
                className={cn(
                    "absolute -inset-1 rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500",
                    "bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)]"
                )}
            />

            {/* Card content */}
            <div
                className={cn(
                    "relative bg-[var(--color-bg-elevated)] rounded-2xl border border-[rgba(0,0,0,0.05)] shadow-sm overflow-hidden",
                    "group-hover:border-[var(--color-accent-primary)]/30 group-hover:shadow-md transition-all duration-300",
                    className
                )}
            >
                {children}
            </div>

            <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
        </div>
    );
}
