/**
 * Vanish Input
 * 
 * Input with animated placeholder that vanishes on focus.
 */

"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface VanishInputProps {
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
    onSubmit?: (value: string) => void;
    className?: string;
    icon?: React.ReactNode;
}

export function VanishInput({
    placeholder = "Type something...",
    value,
    onChange,
    onSubmit,
    className,
    icon,
}: VanishInputProps) {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit?.(value);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className={cn(
                "relative flex items-center gap-3 px-4 py-3 rounded-xl",
                "bg-[var(--color-bg-secondary)] border border-white/10",
                "focus-within:border-[var(--color-accent-primary)]/50",
                "focus-within:shadow-[0_0_20px_var(--color-accent-glow)]",
                "transition-all duration-300",
                className
            )}
            onClick={() => inputRef.current?.focus()}
        >
            {icon && (
                <div className="text-[var(--color-text-tertiary)]">
                    {icon}
                </div>
            )}

            <div className="relative flex-1">
                <AnimatePresence>
                    {!value && !isFocused && (
                        <motion.span
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                            className="absolute left-0 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none"
                        >
                            {placeholder.split("").map((char, i) => (
                                <motion.span
                                    key={i}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{
                                        opacity: 0,
                                        y: -5,
                                        transition: { delay: i * 0.01 }
                                    }}
                                    className="inline-block"
                                >
                                    {char === " " ? "\u00A0" : char}
                                </motion.span>
                            ))}
                        </motion.span>
                    )}
                </AnimatePresence>

                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="w-full bg-transparent outline-none text-[var(--color-text-primary)]"
                />
            </div>

            {value && (
                <motion.button
                    type="submit"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="p-2 rounded-lg bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-secondary)] transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </motion.button>
            )}
        </form>
    );
}
