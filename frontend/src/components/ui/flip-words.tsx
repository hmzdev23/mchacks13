/**
 * Flip Words
 * 
 * Text that cycles through different words with a flip animation.
 * Perfect for hero sections showing multiple options.
 */

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FlipWordsProps {
    words: string[];
    duration?: number;
    className?: string;
}

export function FlipWords({
    words,
    duration = 3000,
    className,
}: FlipWordsProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const startAnimation = useCallback(() => {
        const next = (currentIndex + 1) % words.length;
        setCurrentIndex(next);
        setIsAnimating(true);
    }, [currentIndex, words.length]);

    useEffect(() => {
        if (!isAnimating) {
            const timer = setTimeout(() => {
                startAnimation();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isAnimating, duration, startAnimation]);

    return (
        <AnimatePresence
            mode="wait"
            onExitComplete={() => {
                setIsAnimating(false);
            }}
        >
            <motion.span
                key={words[currentIndex]}
                initial={{
                    opacity: 0,
                    y: 10,
                    filter: "blur(8px)",
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                }}
                exit={{
                    opacity: 0,
                    y: -10,
                    filter: "blur(8px)",
                }}
                transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 10,
                }}
                className={cn(
                    "inline-block relative text-left gradient-text font-bold",
                    className
                )}
            >
                {words[currentIndex].split("").map((letter, index) => (
                    <motion.span
                        key={index}
                        initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{
                            delay: index * 0.02,
                            duration: 0.2,
                        }}
                        className="inline-block"
                    >
                        {letter === " " ? "\u00A0" : letter}
                    </motion.span>
                ))}
            </motion.span>
        </AnimatePresence>
    );
}
