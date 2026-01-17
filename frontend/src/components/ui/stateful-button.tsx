/**
 * Stateful Button
 * 
 * Button with loading, success, and error states.
 * Provides visual feedback for async operations.
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Spinner } from "./loaders";

type ButtonState = "idle" | "loading" | "success" | "error";

interface StatefulButtonProps {
    children: React.ReactNode;
    state?: ButtonState;
    onClick?: () => void;
    disabled?: boolean;
    variant?: "primary" | "secondary" | "ghost";
    size?: "sm" | "md" | "lg";
    className?: string;
    loadingText?: string;
    successText?: string;
    errorText?: string;
}

export function StatefulButton({
    children,
    state = "idle",
    onClick,
    disabled,
    variant = "primary",
    size = "md",
    className,
    loadingText = "Loading...",
    successText = "Success!",
    errorText = "Error",
}: StatefulButtonProps) {
    const variants = {
        primary: cn(
            "bg-[var(--color-accent-primary)]",
            "text-white font-medium",
            "shadow-md hover:shadow-lg",
            "hover:bg-[var(--color-accent-secondary)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
        ),
        secondary: cn(
            "bg-[var(--color-bg-secondary)]",
            "text-[var(--color-text-primary)]",
            "border border-[rgba(0,0,0,0.1)]",
            "hover:bg-[var(--color-bg-tertiary)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
        ),
        ghost: cn(
            "bg-transparent",
            "text-[var(--color-text-secondary)]",
            "hover:text-[var(--color-text-primary)]",
            "hover:bg-[var(--color-bg-tertiary)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
        ),
    };

    const sizes = {
        sm: "px-4 py-2 text-sm rounded-lg",
        md: "px-6 py-3 text-base rounded-xl",
        lg: "px-8 py-4 text-lg rounded-xl",
    };

    const stateColors = {
        idle: "",
        loading: "",
        success: "!bg-[var(--color-success)] !from-[var(--color-success)] !to-[var(--color-success)]",
        error: "!bg-[var(--color-error)] !from-[var(--color-error)] !to-[var(--color-error)]",
    };

    return (
        <motion.button
            onClick={onClick}
            disabled={disabled || state === "loading"}
            className={cn(
                "relative flex items-center justify-center gap-2 transition-all duration-300",
                variants[variant],
                sizes[size],
                stateColors[state],
                className
            )}
            whileHover={{ scale: state === "idle" ? 1.02 : 1 }}
            whileTap={{ scale: state === "idle" ? 0.98 : 1 }}
        >
            <AnimatePresence mode="wait">
                {state === "idle" && (
                    <motion.span
                        key="idle"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {children}
                    </motion.span>
                )}

                {state === "loading" && (
                    <motion.span
                        key="loading"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2"
                    >
                        <Spinner size="sm" className="border-white border-t-transparent" />
                        {loadingText}
                    </motion.span>
                )}

                {state === "success" && (
                    <motion.span
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {successText}
                    </motion.span>
                )}

                {state === "error" && (
                    <motion.span
                        key="error"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {errorText}
                    </motion.span>
                )}
            </AnimatePresence>
        </motion.button>
    );
}
