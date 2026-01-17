/**
 * Text Flip Container
 * 
 * Container that flips to reveal content on hover.
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextFlipProps {
    frontContent: React.ReactNode;
    backContent: React.ReactNode;
    className?: string;
}

export function TextFlip({ frontContent, backContent, className }: TextFlipProps) {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div
            className={cn("relative cursor-pointer perspective-1000", className)}
            onMouseEnter={() => setIsFlipped(true)}
            onMouseLeave={() => setIsFlipped(false)}
        >
            <motion.div
                className="relative w-full h-full preserve-3d"
                animate={{ rotateX: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                style={{ transformStyle: "preserve-3d" }}
            >
                {/* Front */}
                <div
                    className="absolute inset-0 backface-hidden"
                    style={{ backfaceVisibility: "hidden" }}
                >
                    {frontContent}
                </div>

                {/* Back */}
                <div
                    className="absolute inset-0 backface-hidden"
                    style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateX(180deg)"
                    }}
                >
                    {backContent}
                </div>
            </motion.div>
        </div>
    );
}

/**
 * Layout Text Flip
 * 
 * Text that flips through a list of phrases.
 */
interface LayoutTextFlipProps {
    phrases: string[];
    prefix?: string;
    suffix?: string;
    className?: string;
    interval?: number;
}

export function LayoutTextFlip({
    phrases,
    prefix = "",
    suffix = "",
    className,
    interval = 3000,
}: LayoutTextFlipProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useState(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % phrases.length);
        }, interval);
        return () => clearInterval(timer);
    });

    return (
        <span className={cn("inline-flex items-baseline gap-2", className)}>
            {prefix && <span>{prefix}</span>}
            <span className="relative inline-block overflow-hidden h-[1.2em]">
                <motion.span
                    key={currentIndex}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="inline-block gradient-text"
                >
                    {phrases[currentIndex]}
                </motion.span>
            </span>
            {suffix && <span>{suffix}</span>}
        </span>
    );
}
