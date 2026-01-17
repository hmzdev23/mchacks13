/**
 * Cover Card
 * 
 * Card that reveals additional content on hover with a sliding cover.
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CoverProps {
    children: React.ReactNode;
    coverContent: React.ReactNode;
    className?: string;
    direction?: "up" | "down" | "left" | "right";
}

export function Cover({
    children,
    coverContent,
    className,
    direction = "up",
}: CoverProps) {
    const [isHovered, setIsHovered] = useState(false);

    const variants = {
        up: {
            initial: { y: 0 },
            hover: { y: "-100%" },
        },
        down: {
            initial: { y: 0 },
            hover: { y: "100%" },
        },
        left: {
            initial: { x: 0 },
            hover: { x: "-100%" },
        },
        right: {
            initial: { x: 0 },
            hover: { x: "100%" },
        },
    };

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl cursor-pointer",
                className
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Revealed content (underneath) */}
            <div className="absolute inset-0">
                {children}
            </div>

            {/* Cover (on top, slides away on hover) */}
            <motion.div
                className="relative z-10"
                initial="initial"
                animate={isHovered ? "hover" : "initial"}
                variants={variants[direction]}
                transition={{ duration: 0.3, ease: "easeOut" }}
            >
                {coverContent}
            </motion.div>
        </div>
    );
}
