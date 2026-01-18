/**
 * BentoGrid Component
 * 
 * A flexible grid layout for feature cards with backgrounds.
 * Inspired by MagicUI's Bento Grid.
 */

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface BentoGridProps {
    children: ReactNode;
    className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
    return (
        <div
            className={cn(
                "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
                className
            )}
        >
            {children}
        </div>
    );
}

interface BentoCardProps {
    name: string;
    className?: string;
    background?: ReactNode;
    Icon: React.ComponentType<{ className?: string }>;
    description: string;
    href?: string;
    cta?: string;
}

export function BentoCard({
    name,
    className,
    background,
    Icon,
    description,
    href,
    cta,
}: BentoCardProps) {
    return (
        <div
            className={cn(
                "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
                // light styles
                "bg-white border border-[var(--stone-200)] shadow-sm",
                // hover
                "hover:shadow-lg transition-shadow duration-300",
                className
            )}
        >
            {/* Background */}
            <div className="absolute inset-0 z-0">{background}</div>

            {/* Content */}
            <div className="pointer-events-none z-10 flex flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-2">
                <Icon className="h-12 w-12 origin-left text-[var(--stone-400)] transition-transform duration-300 ease-in-out group-hover:scale-75" />
                <h3 className="text-xl font-semibold text-[var(--stone-900)]" style={{ fontFamily: 'var(--font-heading)' }}>
                    {name}
                </h3>
                <p className="max-w-lg text-sm text-[var(--stone-500)]">{description}</p>
            </div>

            {/* CTA */}
            {href && cta && (
                <div className="pointer-events-none absolute bottom-0 flex w-full translate-y-10 flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <a
                        href={href}
                        className="pointer-events-auto flex items-center gap-2 text-sm font-medium text-[var(--stone-900)] hover:underline"
                    >
                        {cta}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </a>
                </div>
            )}

            {/* Hover overlay */}
            <div className="pointer-events-none absolute inset-0 transition-all duration-300 group-hover:bg-[var(--stone-100)]/50" />
        </div>
    );
}
