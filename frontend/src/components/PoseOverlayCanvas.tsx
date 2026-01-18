"use client";

import { useEffect, useRef } from "react";
import { Landmark, calculateElbowAngle, calculateStrideLength, calculateBalanceScore } from "@/lib/cv/pose-logic";

interface PoseOverlayCanvasProps {
    width: number;
    height: number;
    videoWidth?: number;
    videoHeight?: number;
    mirror?: boolean;
    landmarks: Landmark[];
    className?: string;
}

const POSE_CONNECTIONS = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Upper body
    [11, 23], [12, 24], [23, 24], // Torso
    [23, 25], [25, 27], [24, 26], [26, 28], // Legs
    [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32] // Feet
];

export function PoseOverlayCanvas({
    width,
    height,
    videoWidth,
    videoHeight,
    mirror = true,
    landmarks,
    className,
}: PoseOverlayCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        if (width <= 0 || height <= 0) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        let drawWidth = width;
        let drawHeight = height;
        let offsetX = 0;
        let offsetY = 0;
        if (videoWidth && videoHeight) {
            const videoAspect = videoWidth / videoHeight;
            const frameAspect = width / height;
            if (videoAspect > frameAspect) {
                drawWidth = width;
                drawHeight = width / videoAspect;
                offsetY = (height - drawHeight) / 2;
            } else {
                drawHeight = height;
                drawWidth = height * videoAspect;
                offsetX = (width - drawWidth) / 2;
            }
        }

        const transformPoint = (x: number, y: number) => {
            const tx = mirror ? 1 - x : x;
            return [offsetX + tx * drawWidth, offsetY + y * drawHeight];
        };

        // Draw Skeleton
        if (landmarks && landmarks.length > 0) {
            ctx.strokeStyle = "rgba(139, 92, 246, 0.8)";
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            POSE_CONNECTIONS.forEach(([a, b]) => {
                const p1 = landmarks[a];
                const p2 = landmarks[b];
                if (!p1 || !p2 || (p1.visibility ?? 0) < 0.5 || (p2.visibility ?? 0) < 0.5) return;
                const [x1, y1] = transformPoint(p1.x, p1.y);
                const [x2, y2] = transformPoint(p2.x, p2.y);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            });

            landmarks.forEach((p, idx) => {
                if (!p || (p.visibility ?? 0) < 0.5) return;
                const [x, y] = transformPoint(p.x, p.y);
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fillStyle = "white";
                ctx.fill();
                ctx.strokeStyle = "#8b5cf6";
                ctx.stroke();
            });

            // Draw Analytics Overlay (Top Left)
            const elbowAngle = calculateElbowAngle(landmarks);
            const strideLength = calculateStrideLength(landmarks);
            const balanceScore = calculateBalanceScore(landmarks);

            const overlayW = 250;
            const overlayH = 120;
            const overlayX = 20;
            const overlayY = 20;

            ctx.fillStyle = "rgba(252, 3, 161, 0.9)"; // Magenta from reference
            ctx.fillRect(overlayX, overlayY, overlayW, overlayH);

            ctx.font = "bold 14px Inter, system-ui, sans-serif";
            ctx.fillStyle = "white";
            ctx.fillText(`ELBOW ANGLE: ${Math.round(elbowAngle)}°`, overlayX + 15, overlayY + 30);
            ctx.fillText(`STRIDE LENGTH: ${strideLength.toFixed(2)}`, overlayX + 15, overlayY + 65);
            ctx.fillText(`BALANCE SCORE: ${balanceScore.toFixed(2)}`, overlayX + 15, overlayY + 100);

            // Draw 3D Box Overlay (Top Right)
            const boxW = 180;
            const boxH = 180;
            const boxX = width - boxW - 20;
            const boxY = 20;

            ctx.fillStyle = "rgba(252, 3, 161, 0.9)";
            ctx.fillRect(boxX, boxY, boxW, boxH);

            // Simple orthographic 3D projection for landmarks
            landmarks.forEach((p) => {
                if (!p || (p.visibility ?? 0) < 0.5) return;
                // Project landmarks onto box coordinates
                const lx = boxX + (p.x * boxW);
                const ly = boxY + (p.y * boxH);
                // We could use Z for size/perspective but reference uses fixed circle size
                ctx.beginPath();
                ctx.arc(lx, ly, 3, 0, Math.PI * 2);
                ctx.fillStyle = "#03fce2"; // Cyan from reference
                ctx.fill();
            });
        }

    }, [landmarks, width, height, videoWidth, videoHeight, mirror]);

    return <canvas ref={canvasRef} className={className} />;
}
