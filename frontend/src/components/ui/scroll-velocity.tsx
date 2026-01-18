/**
 * Scroll-Based Velocity Component
 * 
 * Creates a horizontal scrolling effect with velocity-based animation.
 * Inspired by MagicUI's scroll-based-velocity.
 */

"use client";

import { cn } from "@/lib/utils";
import { useRef, useEffect, useState, ReactNode } from "react";

interface ScrollVelocityContainerProps {
    children: ReactNode;
    className?: string;
}

export function ScrollVelocityContainer({ children, className }: ScrollVelocityContainerProps) {
    return (
        <div className={cn("overflow-hidden", className)}>
            {children}
        </div>
    );
}

interface ScrollVelocityRowProps {
    children: ReactNode;
    className?: string;
    baseVelocity?: number;
    direction?: 1 | -1;
}

export function ScrollVelocityRow({
    children,
    className,
    baseVelocity = 5,
    direction = 1,
}: ScrollVelocityRowProps) {
    const [loopCount, setLoopCount] = useState(4);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Calculate how many copies we need based on container width
        const updateLoopCount = () => {
            if (typeof window !== 'undefined') {
                const viewportWidth = window.innerWidth;
                const estimatedContentWidth = 300; // Approximate width of one child
                const neededCopies = Math.ceil(viewportWidth / estimatedContentWidth) + 2;
                setLoopCount(Math.max(4, neededCopies));
            }
        };

        updateLoopCount();
        window.addEventListener('resize', updateLoopCount);
        return () => window.removeEventListener('resize', updateLoopCount);
    }, []);

    const duration = 100 / baseVelocity;
    const animationDirection = direction === 1 ? 'normal' : 'reverse';

    return (
        <div
            ref={containerRef}
            className={cn("flex items-center", className)}
            style={{
                overflow: 'hidden',
            }}
        >
            <div
                className="flex shrink-0 gap-4"
                style={{
                    animation: `scroll-velocity ${duration}s linear infinite`,
                    animationDirection,
                }}
            >
                {Array(loopCount).fill(0).map((_, i) => (
                    <div key={i} className="flex shrink-0 gap-4">
                        {children}
                    </div>
                ))}
            </div>
            <div
                className="flex shrink-0 gap-4"
                style={{
                    animation: `scroll-velocity ${duration}s linear infinite`,
                    animationDirection,
                }}
            >
                {Array(loopCount).fill(0).map((_, i) => (
                    <div key={`dup-${i}`} className="flex shrink-0 gap-4">
                        {children}
                    </div>
                ))}
            </div>
        </div>
    );
}
