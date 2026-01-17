"use client";

import { useEffect, useRef } from "react";
import { Point2D } from "@/lib/cv/alignment";

interface OverlayCanvasProps {
  width: number;
  height: number;
  userHand: Point2D[] | null;
  ghostHand: Point2D[] | null;
  topErrors?: number[];
  className?: string;
}

const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [5, 9],
  [9, 13],
  [13, 17],
];

export function OverlayCanvas({ width, height, userHand, ghostHand, topErrors = [], className }: OverlayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    const drawSkeleton = (points: Point2D[], color: string, glow = false) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (glow) {
        ctx.shadowBlur = 16;
        ctx.shadowColor = color;
      }
      HAND_CONNECTIONS.forEach(([a, b]) => {
        const p1 = points[a];
        const p2 = points[b];
        if (!p1 || !p2) return;
        ctx.beginPath();
        ctx.moveTo(p1[0] * width, p1[1] * height);
        ctx.lineTo(p2[0] * width, p2[1] * height);
        ctx.stroke();
      });
      ctx.restore();

      points.forEach((p, idx) => {
        if (!p) return;
        const x = p[0] * width;
        const y = p[1] * height;
        const radius = idx === 0 ? 7 : [4, 8, 12, 16, 20].includes(idx) ? 5 : 4;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = topErrors.includes(idx) ? "#ef4444" : color;
        ctx.fill();
      });
    };

    if (ghostHand) drawSkeleton(ghostHand, "rgba(41,37,36,0.6)", true);
    if (userHand) drawSkeleton(userHand, "#0f766e");
  }, [userHand, ghostHand, width, height, topErrors]);

  return <canvas ref={canvasRef} width={width} height={height} className={className} />;
}
