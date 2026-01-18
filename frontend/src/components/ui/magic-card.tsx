/**
 * MagicCard Component
 * 
 * A card with a gradient spotlight effect that follows the mouse.
 * Inspired by MagicUI's magic-card.
 */

"use client";

import { cn } from "@/lib/utils";
import { useRef, useState, ReactNode, useCallback } from "react";

interface MagicCardProps {
    children: ReactNode;
    className?: string;
    gradientColor?: string;
    gradientSize?: number;
    gradientOpacity?: number;
}

export function MagicCard({
    children,
    className,
    gradientColor = "#D9D9D955",
    gradientSize = 200,
    gradientOpacity = 0.8,
}: MagicCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setMousePosition({ x, y });
    }, []);

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
    }, []);

    return (
        <div
            ref={cardRef}
            className={cn(
                "relative overflow-hidden rounded-2xl transition-all duration-300",
                className
            )}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Gradient spotlight effect */}
            <div
                className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
                style={{
                    opacity: isHovered ? gradientOpacity : 0,
                    background: `radial-gradient(${gradientSize}px circle at ${mousePosition.x}px ${mousePosition.y}px, ${gradientColor}, transparent 100%)`,
                }}
            />

            {/* Border glow effect */}
            <div
                className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
                style={{
                    opacity: isHovered ? 0.5 : 0,
                    background: `radial-gradient(${gradientSize * 0.8}px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.1), transparent 100%)`,
                }}
            />

            {/* Content */}
            <div className="relative z-20">
                {children}
            </div>
        </div>
    );
}
