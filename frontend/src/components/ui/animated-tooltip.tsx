/**
 * Animated Tooltip
 * 
 * Smooth animated tooltip that appears on hover.
 */

"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedTooltipProps {
    children: React.ReactNode;
    content: React.ReactNode;
    position?: "top" | "bottom" | "left" | "right";
    className?: string;
    delay?: number;
}

export function AnimatedTooltip({
    children,
    content,
    position = "top",
    className,
    delay = 200,
}: AnimatedTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const positionStyles = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
        left: "right-full top-1/2 -translate-y-1/2 mr-2",
        right: "left-full top-1/2 -translate-y-1/2 ml-2",
    };

    const motionVariants = {
        top: { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } },
        bottom: { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 } },
        left: { initial: { opacity: 0, x: 10 }, animate: { opacity: 1, x: 0 } },
        right: { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 } },
    };

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        className={cn(
                            "absolute z-50 px-3 py-2 text-sm rounded-lg whitespace-nowrap",
                            "bg-[var(--color-bg-elevated)] border border-white/10",
                            "shadow-lg backdrop-blur-sm",
                            positionStyles[position],
                            className
                        )}
                        initial={motionVariants[position].initial}
                        animate={motionVariants[position].animate}
                        exit={motionVariants[position].initial}
                        transition={{ duration: 0.15 }}
                    >
                        {content}
                        {/* Arrow */}
                        <div
                            className={cn(
                                "absolute w-2 h-2 bg-[var(--color-bg-elevated)] rotate-45 border-inherit",
                                position === "top" && "top-full left-1/2 -translate-x-1/2 -mt-1 border-r border-b",
                                position === "bottom" && "bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l border-t",
                                position === "left" && "left-full top-1/2 -translate-y-1/2 -ml-1 border-t border-r",
                                position === "right" && "right-full top-1/2 -translate-y-1/2 -mr-1 border-b border-l"
                            )}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
