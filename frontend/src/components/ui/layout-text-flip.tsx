"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface LayoutTextFlipProps {
    text: string;
    words: string[];
    intervalMs?: number;
    className?: string;
    wordClassName?: string;
}

export function LayoutTextFlip({
    text,
    words,
    intervalMs = 1800,
    className = "",
    wordClassName = "",
}: LayoutTextFlipProps) {
    const safeWords = useMemo(() => words.filter(Boolean), [words]);
    const [index, setIndex] = useState(0);

    useEffect(() => {
        setIndex(0);
    }, [safeWords.length]);

    useEffect(() => {
        if (!safeWords.length) return;
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % safeWords.length);
        }, intervalMs);
        return () => clearInterval(interval);
    }, [safeWords.length, intervalMs]);

    const currentWord = safeWords[index] ?? "";
    const label = currentWord ? `${text} ${currentWord}` : text;

    return (
        <span className={`inline-flex flex-wrap items-center gap-3 ${className}`} aria-label={label}>
            <span className="whitespace-nowrap">{text}</span>
            <span className="relative inline-flex min-w-[10ch] justify-start">
                <AnimatePresence mode="wait">
                    <motion.span
                        key={currentWord}
                        initial={{ opacity: 0, y: 22, rotateX: 90 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        exit={{ opacity: 0, y: -22, rotateX: -90 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        className={`inline-block ${wordClassName}`}
                        style={{ transformOrigin: "50% 60%" }}
                    >
                        {currentWord}
                    </motion.span>
                </AnimatePresence>
            </span>
        </span>
    );
}
