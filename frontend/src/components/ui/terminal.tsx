"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface TerminalProps {
    children: React.ReactNode;
    className?: string;
}

export function Terminal({ children, className }: TerminalProps) {
    return (
        <div
            className={cn(
                "bg-[var(--stone-900)] rounded-xl border border-[var(--stone-800)] p-6 font-mono text-sm overflow-hidden",
                className
            )}
        >
            {/* Terminal header */}
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[var(--stone-800)]">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-[var(--stone-500)] text-xs">secondhand-terminal</span>
            </div>
            {/* Terminal content */}
            <div className="space-y-2">
                {children}
            </div>
        </div>
    );
}

interface TypingAnimationProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
}

export function TypingAnimation({
    children,
    className,
    delay = 0,
    duration = 1000,
}: TypingAnimationProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [displayedText, setDisplayedText] = useState("");
    const text = typeof children === "string" ? children : "";

    useEffect(() => {
        const showTimer = setTimeout(() => {
            setIsVisible(true);
        }, delay);

        return () => clearTimeout(showTimer);
    }, [delay]);

    useEffect(() => {
        if (!isVisible || !text) return;

        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex <= text.length) {
                setDisplayedText(text.slice(0, currentIndex));
                currentIndex++;
            } else {
                clearInterval(interval);
            }
        }, duration / text.length);

        return () => clearInterval(interval);
    }, [isVisible, text, duration]);

    if (!isVisible) return null;

    return (
        <div className={cn("text-[var(--stone-100)]", className)}>
            {typeof children === "string" ? displayedText : children}
            {typeof children === "string" && displayedText.length < text.length && (
                <span className="animate-pulse">▋</span>
            )}
        </div>
    );
}

interface AnimatedSpanProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

export function AnimatedSpan({
    children,
    className,
    delay = 0,
}: AnimatedSpanProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, delay);

        return () => clearTimeout(timer);
    }, [delay]);

    if (!isVisible) return null;

    return (
        <div
            className={cn(
                "animate-fadeIn text-[var(--stone-300)]",
                className
            )}
        >
            {children}
        </div>
    );
}
