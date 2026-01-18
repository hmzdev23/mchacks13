"use client";

import { cn } from "@/lib/utils";

interface AuroraTextProps {
    children: React.ReactNode;
    className?: string;
    colors?: string[];
}

export function AuroraText({
    children,
    className,
    colors = ["#10b981", "#34d399", "#6ee7b7", "#10b981"],
}: AuroraTextProps) {
    return (
        <span
            className={cn(
                "relative inline-block bg-clip-text text-transparent animate-aurora-text",
                className
            )}
            style={{
                backgroundImage: `linear-gradient(90deg, ${colors.join(", ")})`,
                backgroundSize: "400% 100%",
            }}
        >
            {children}
        </span>
    );
}
