"use client";

import { useEffect, useRef } from "react";
import { Point2D } from "@/lib/cv/alignment";

interface OverlayCanvasProps {
  width: number;
  height: number;
  videoWidth?: number;
  videoHeight?: number;
  mirror?: boolean;
  userHands: Point2D[][];
  ghostHands: Point2D[][];
  topErrors?: number[];
  ghostOpacity?: number;
  ghostColor?: string;
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
  [0, 21],
  [17, 21],
  [13, 21],
];

export function OverlayCanvas({
  width,
  height,
  videoWidth,
  videoHeight,
  mirror = true,
  userHands,
  ghostHands,
  topErrors = [],
  ghostOpacity = 0.6,
  ghostColor,
  className,
}: OverlayCanvasProps) {
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

    const transformPoint = (point: Point2D) => {
      const x = mirror ? 1 - point[0] : point[0];
      return [offsetX + x * drawWidth, offsetY + point[1] * drawHeight] as Point2D;
    };

    const drawSkeleton = (points: Point2D[], color: string, glow = false, errors: number[] = []) => {
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
        const [x1, y1] = transformPoint(p1);
        const [x2, y2] = transformPoint(p2);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });
      ctx.restore();

      points.forEach((p, idx) => {
        if (!p) return;
        const [x, y] = transformPoint(p);
        const radius = idx === 0 ? 7 : [4, 8, 12, 16, 20].includes(idx) ? 5 : 4;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = errors.includes(idx) ? "#ef4444" : color;
        ctx.fill();
      });
    };

    const ghostColorValue = ghostColor ?? `rgba(139, 92, 246, ${ghostOpacity})`;
    ghostHands.forEach((hand) => drawSkeleton(hand, ghostColorValue, true));
    userHands.forEach((hand, idx) =>
      drawSkeleton(hand, idx === 0 ? "#0f766e" : "#2563eb", false, idx === 0 ? topErrors : [])
    );
  }, [userHands, ghostHands, width, height, mirror, topErrors, ghostOpacity]);

  return <canvas ref={canvasRef} width={width} height={height} className={className} />;
}
