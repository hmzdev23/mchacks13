/**
 * Background Gradient Animation
 * 
 * Animated gradient blobs that move across the background.
 * Creates a premium, dynamic feel.
 */

"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface BackgroundGradientAnimationProps {
    className?: string;
    containerClassName?: string;
    interactive?: boolean;
    gradientBackgroundStart?: string;
    gradientBackgroundEnd?: string;
    firstColor?: string;
    secondColor?: string;
    thirdColor?: string;
    fourthColor?: string;
    fifthColor?: string;
    pointerColor?: string;
    size?: string;
    blendingValue?: string;
}

export function BackgroundGradientAnimation({
    className,
    containerClassName,
    interactive = true,
    gradientBackgroundStart = "rgb(10, 10, 15)",
    gradientBackgroundEnd = "rgb(10, 10, 15)",
    firstColor = "99, 102, 241",
    secondColor = "139, 92, 246",
    thirdColor = "168, 85, 247",
    fourthColor = "99, 102, 241",
    fifthColor = "139, 92, 246",
    pointerColor = "168, 85, 247",
    size = "80%",
    blendingValue = "hard-light",
}: BackgroundGradientAnimationProps) {
    const interactiveRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!interactive) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (interactiveRef.current) {
                const rect = interactiveRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                interactiveRef.current.style.setProperty("--mouse-x", `${x}px`);
                interactiveRef.current.style.setProperty("--mouse-y", `${y}px`);
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [interactive]);

    return (
        <div
            className={cn(
                "absolute inset-0 overflow-hidden",
                containerClassName
            )}
        >
            <svg className="hidden">
                <defs>
                    <filter id="blurMe">
                        <feGaussianBlur
                            in="SourceGraphic"
                            stdDeviation="10"
                            result="blur"
                        />
                        <feColorMatrix
                            in="blur"
                            mode="matrix"
                            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
                            result="goo"
                        />
                        <feBlend in="SourceGraphic" in2="goo" />
                    </filter>
                </defs>
            </svg>
            <div
                ref={interactiveRef}
                className={cn("absolute inset-0", className)}
                style={
                    {
                        "--gradient-background-start": gradientBackgroundStart,
                        "--gradient-background-end": gradientBackgroundEnd,
                        "--first-color": firstColor,
                        "--second-color": secondColor,
                        "--third-color": thirdColor,
                        "--fourth-color": fourthColor,
                        "--fifth-color": fifthColor,
                        "--pointer-color": pointerColor,
                        "--size": size,
                        "--blending-value": blendingValue,
                    } as React.CSSProperties
                }
            >
                <div
                    className="absolute inset-0"
                    style={{
                        background: `linear-gradient(40deg, var(--gradient-background-start), var(--gradient-background-end))`,
                    }}
                />
                <div
                    className="absolute inset-0 animate-first opacity-100"
                    style={{
                        background: `radial-gradient(circle at center, rgba(var(--first-color), 0.8) 0, rgba(var(--first-color), 0) 50%)`,
                        mixBlendMode: blendingValue as any,
                        width: "var(--size)",
                        height: "var(--size)",
                        top: "calc(50% - var(--size) / 2)",
                        left: "calc(50% - var(--size) / 2)",
                        transformOrigin: "center center",
                        animation: "moveVertical 30s ease infinite",
                    }}
                />
                <div
                    className="absolute inset-0 opacity-100"
                    style={{
                        background: `radial-gradient(circle at center, rgba(var(--second-color), 0.8) 0, rgba(var(--second-color), 0) 50%)`,
                        mixBlendMode: blendingValue as any,
                        width: "var(--size)",
                        height: "var(--size)",
                        top: "calc(50% - var(--size) / 2)",
                        left: "calc(50% - var(--size) / 2)",
                        transformOrigin: "calc(50% - 400px)",
                        animation: "moveInCircle 20s reverse infinite",
                    }}
                />
                <div
                    className="absolute inset-0 opacity-100"
                    style={{
                        background: `radial-gradient(circle at center, rgba(var(--third-color), 0.8) 0, rgba(var(--third-color), 0) 50%)`,
                        mixBlendMode: blendingValue as any,
                        width: "var(--size)",
                        height: "var(--size)",
                        top: "calc(50% - var(--size) / 2 + 200px)",
                        left: "calc(50% - var(--size) / 2 - 500px)",
                        transformOrigin: "calc(50% + 400px)",
                        animation: "moveInCircle 40s linear infinite",
                    }}
                />
                <div
                    className="absolute inset-0 opacity-70"
                    style={{
                        background: `radial-gradient(circle at center, rgba(var(--fourth-color), 0.8) 0, rgba(var(--fourth-color), 0) 50%)`,
                        mixBlendMode: blendingValue as any,
                        width: "var(--size)",
                        height: "var(--size)",
                        top: "calc(50% - var(--size) / 2)",
                        left: "calc(50% - var(--size) / 2)",
                        transformOrigin: "calc(50% - 200px)",
                        animation: "moveHorizontal 40s ease infinite",
                    }}
                />
                <div
                    className="absolute inset-0 opacity-100"
                    style={{
                        background: `radial-gradient(circle at center, rgba(var(--fifth-color), 0.8) 0, rgba(var(--fifth-color), 0) 50%)`,
                        mixBlendMode: blendingValue as any,
                        width: "calc(var(--size) * 2)",
                        height: "calc(var(--size) * 2)",
                        top: "calc(50% - var(--size))",
                        left: "calc(50% - var(--size))",
                        transformOrigin: "calc(50% - 800px) calc(50% + 200px)",
                        animation: "moveInCircle 20s ease infinite",
                    }}
                />

                {interactive && (
                    <div
                        className="absolute inset-0 opacity-70"
                        style={{
                            background: `radial-gradient(circle at center, rgba(var(--pointer-color), 0.8) 0, rgba(var(--pointer-color), 0) 50%)`,
                            mixBlendMode: blendingValue as any,
                            width: "100%",
                            height: "100%",
                            top: "-50%",
                            left: "-50%",
                            transform: "translate(var(--mouse-x, 50%), var(--mouse-y, 50%))",
                        }}
                    />
                )}
            </div>
            <style jsx>{`
        @keyframes moveInCircle {
          0% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(180deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes moveVertical {
          0% {
            transform: translateY(-50%);
          }
          50% {
            transform: translateY(50%);
          }
          100% {
            transform: translateY(-50%);
          }
        }

        @keyframes moveHorizontal {
          0% {
            transform: translateX(-50%) translateY(-10%);
          }
          50% {
            transform: translateX(50%) translateY(10%);
          }
          100% {
            transform: translateX(-50%) translateY(-10%);
          }
        }
      `}</style>
        </div>
    );
}
