/**
 * Marquee Component
 * 
 * An infinite scrolling marquee effect.
 * Inspired by MagicUI's Marquee.
 */

"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MarqueeProps {
    className?: string;
    reverse?: boolean;
    pauseOnHover?: boolean;
    children: ReactNode;
    vertical?: boolean;
    repeat?: number;
}

export function Marquee({
    className,
    reverse = false,
    pauseOnHover = false,
    children,
    vertical = false,
    repeat = 4,
}: MarqueeProps) {
    return (
        <div
            className={cn(
                "group flex overflow-hidden p-2 [gap:var(--gap)]",
                {
                    "flex-row": !vertical,
                    "flex-col": vertical,
                },
                className
            )}
            style={
                {
                    "--duration": "40s",
                    "--gap": "1rem",
                } as React.CSSProperties
            }
        >
            {Array(repeat)
                .fill(0)
                .map((_, i) => (
                    <div
                        key={i}
                        className={cn("flex shrink-0 justify-around [gap:var(--gap)]", {
                            "animate-marquee flex-row": !vertical,
                            "animate-marquee-vertical flex-col": vertical,
                            "[animation-direction:reverse]": reverse,
                            "group-hover:[animation-play-state:paused]": pauseOnHover,
                        })}
                    >
                        {children}
                    </div>
                ))}
        </div>
    );
}
