/**
 * Ghost Overlay Component
 * 
 * The MAGIC of SecondHand - renders the expert's skeleton as a
 * translucent "ghost" that users try to match.
 */

"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface GhostOverlayProps {
    width: number;
    height: number;
    expertKeypoints: number[][] | null;  // 21 x 3 for hands
    alignmentTransform: {
        scale: number;
        translation: [number, number];
        rotation: number;
    } | null;
    topErrorJoints?: number[];
    mirrored?: boolean;
    className?: string;
}

// Hand skeleton connections
const HAND_CONNECTIONS = [
    // Thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // Index
    [0, 5], [5, 6], [6, 7], [7, 8],
    // Middle
    [0, 9], [9, 10], [10, 11], [11, 12],
    // Ring
    [0, 13], [13, 14], [14, 15], [15, 16],
    // Pinky
    [0, 17], [17, 18], [18, 19], [19, 20],
    // Palm
    [5, 9], [9, 13], [13, 17],
];

export function GhostOverlay({
    width,
    height,
    expertKeypoints,
    alignmentTransform,
    topErrorJoints = [],
    mirrored = true,
    className,
}: GhostOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | undefined>(undefined);
    const timeRef = useRef(0);

    // Apply alignment transform to expert keypoints
    const getAlignedExpertKeypoints = useCallback(() => {
        if (!expertKeypoints) return null;

        // If no transform, just scale to screen coordinates
        if (!alignmentTransform) {
            return expertKeypoints.map(([x, y]) => [
                (mirrored ? 1 - x : x) * width,
                y * height,
            ]);
        }

        const { scale, translation, rotation } = alignmentTransform;
        const [tx, ty] = translation;

        return expertKeypoints.map(([x, y]) => {
            // Scale
            let px = x * scale;
            let py = y * scale;

            // Rotate (around origin)
            if (rotation !== 0) {
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                const rx = px * cos - py * sin;
                const ry = px * sin + py * cos;
                px = rx;
                py = ry;
            }

            // Translate to screen coordinates
            let finalX = px * width + tx;
            const finalY = py * height + ty;

            // Mirror if needed
            if (mirrored) {
                finalX = width - finalX;
            }

            return [finalX, finalY];
        });
    }, [expertKeypoints, alignmentTransform, width, height, mirrored]);

    // Draw the ghost skeleton
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        const alignedExpert = getAlignedExpertKeypoints();
        if (!alignedExpert) return;

        // Update time for animations
        timeRef.current += 0.02;
        const pulse = Math.sin(timeRef.current * 2) * 0.2 + 0.8;

        // Draw ghost glow effect (outer layer)
        ctx.save();
        ctx.shadowColor = "rgba(139, 92, 246, 0.6)";
        ctx.shadowBlur = 25 * pulse;
        ctx.globalAlpha = 0.4;

        // Draw connections with glow
        ctx.strokeStyle = "rgba(139, 92, 246, 0.8)";
        ctx.lineWidth = 10;
        ctx.lineCap = "round";

        HAND_CONNECTIONS.forEach(([start, end]) => {
            if (alignedExpert[start] && alignedExpert[end]) {
                const [x1, y1] = alignedExpert[start];
                const [x2, y2] = alignedExpert[end];

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        });

        ctx.restore();

        // Draw ghost skeleton (main layer)
        ctx.save();

        // Create gradient for skeleton lines
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "rgba(139, 92, 246, 0.95)");
        gradient.addColorStop(0.5, "rgba(168, 85, 247, 0.95)");
        gradient.addColorStop(1, "rgba(99, 102, 241, 0.95)");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Draw connections
        HAND_CONNECTIONS.forEach(([start, end]) => {
            if (alignedExpert[start] && alignedExpert[end]) {
                const [x1, y1] = alignedExpert[start];
                const [x2, y2] = alignedExpert[end];

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        });

        // Draw joints
        alignedExpert.forEach(([x, y], index) => {
            const isErrorJoint = topErrorJoints.includes(index);
            const isFingertip = [4, 8, 12, 16, 20].includes(index);
            const isWrist = index === 0;

            // Base radius
            let radius = isFingertip ? 8 : isWrist ? 10 : 5;

            // Draw error highlight if this is a problem joint
            if (isErrorJoint) {
                // Pulsing error glow
                const errorPulse = Math.sin(timeRef.current * 4) * 0.3 + 0.7;

                ctx.save();
                ctx.beginPath();
                ctx.arc(x, y, radius + 15 * errorPulse, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(239, 68, 68, ${0.3 * errorPulse})`;
                ctx.fill();

                // Outer ring
                ctx.beginPath();
                ctx.arc(x, y, radius + 20, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 * errorPulse})`;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }

            // Draw joint
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);

            if (isErrorJoint) {
                ctx.fillStyle = "#ef4444";
                ctx.shadowColor = "rgba(239, 68, 68, 0.8)";
                ctx.shadowBlur = 15;
            } else {
                ctx.fillStyle = isFingertip ? "#a855f7" : "#8b5cf6";
                ctx.shadowColor = "rgba(139, 92, 246, 0.5)";
                ctx.shadowBlur = 10;
            }
            ctx.fill();

            // Draw joint border
            ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.shadowBlur = 0;
        });

        ctx.restore();

        // Continue animation loop
        animationRef.current = requestAnimationFrame(draw);
    }, [width, height, getAlignedExpertKeypoints, topErrorJoints]);

    useEffect(() => {
        draw();
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [draw]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className={cn("absolute inset-0 pointer-events-none", className)}
        />
    );
}
