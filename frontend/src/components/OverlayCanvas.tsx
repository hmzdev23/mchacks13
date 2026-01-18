"use client";

import { useEffect, useRef } from "react";
import { Point2D, HandBBox } from "@/lib/cv/alignment";

interface OverlayCanvasProps {
  width: number;
  height: number;
  videoWidth?: number;
  videoHeight?: number;
  mirror?: boolean;
  userHands: Point2D[][];
  ghostHands: Point2D[][];
  topErrors?: number[];
  className?: string;
  debug?: boolean;
  debugInfo?: {
    anchorUser: Point2D;
    anchorExpert: Point2D;
    bboxUser: HandBBox;
    bboxExpert: HandBBox;
    transformPx: {
      scale: number;
      rotation: number;
      translation: Point2D;
      anchor: Point2D;
    };
  }[];
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

export function OverlayCanvas({
  width,
  height,
  videoWidth,
  videoHeight,
  mirror = true,
  userHands,
  ghostHands,
  topErrors = [],
  className,
  debug = false,
  debugInfo = [],
}: OverlayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const frameWidth = videoWidth && videoHeight ? videoWidth : width;
    const frameHeight = videoWidth && videoHeight ? videoHeight : height;

    // Match canvas resolution to the on-screen size; keep drawing in CSS pixels.
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Map normalized landmarks into the CSS-sized container (object-contain).
    const scale = Math.min(width / frameWidth, height / frameHeight);
    const offsetX = (width - frameWidth * scale) / 2;
    const offsetY = (height - frameHeight * scale) / 2;

    const transformPoint = (point: Point2D) => {
      // Accept either normalized (0..1) or pixel inputs.
      const isNormalized = Math.abs(point[0]) <= 2 && Math.abs(point[1]) <= 2;
      const xPx = isNormalized ? point[0] * frameWidth : point[0];
      const yPx = isNormalized ? point[1] * frameHeight : point[1];
      const x = mirror ? frameWidth - xPx : xPx;
      return [offsetX + x * scale, offsetY + yPx * scale] as Point2D;
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

    userHands.forEach((hand, idx) =>
      drawSkeleton(hand, idx === 0 ? "#0f766e" : "#2563eb", false, idx === 0 ? topErrors : [])
    );
    ghostHands.forEach((hand) => drawSkeleton(hand, "rgba(41,37,36,0.6)", true));

    if (debug) {
      const computeBBox = (points: Point2D[]) => {
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        points.forEach((p) => {
          minX = Math.min(minX, p[0]);
          minY = Math.min(minY, p[1]);
          maxX = Math.max(maxX, p[0]);
          maxY = Math.max(maxY, p[1]);
        });
        return { min: [minX, minY] as Point2D, max: [maxX, maxY] as Point2D };
      };

      ctx.save();
      ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.strokeStyle = "rgba(15, 23, 42, 0.6)";

      userHands.forEach((hand, idx) => {
        if (!hand.length) return;
        hand.forEach((point, joint) => {
          const [x, y] = transformPoint(point);
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#0f766e";
          ctx.fill();
          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          ctx.fillText(String(joint), x + 4, y - 4);
        });

        const info = debugInfo[idx];
        if (info) {
          const bbox = info.bboxUser;
          const [bx1, by1] = transformPoint(bbox.min);
          const [bx2, by2] = transformPoint(bbox.max);
          ctx.strokeStyle = "rgba(16, 185, 129, 0.8)";
          ctx.strokeRect(bx1, by1, bx2 - bx1, by2 - by1);

          const ghostBBox = ghostHands[idx]?.length ? computeBBox(ghostHands[idx]) : null;
          if (ghostBBox) {
            const [gx1, gy1] = transformPoint(ghostBBox.min);
            const [gx2, gy2] = transformPoint(ghostBBox.max);
            ctx.strokeStyle = "rgba(124, 58, 237, 0.8)";
            ctx.strokeRect(gx1, gy1, gx2 - gx1, gy2 - gy1);
          }

          const [ax, ay] = transformPoint(info.anchorUser);
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.arc(ax, ay, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          const rotationDeg = (info.transformPx.rotation * 180) / Math.PI;
          ctx.fillText(`scale: ${info.transformPx.scale.toFixed(2)}`, 12, 20 + idx * 40);
          ctx.fillText(`rot: ${rotationDeg.toFixed(1)} deg`, 12, 36 + idx * 40);
          ctx.fillText(`tx: ${info.transformPx.translation[0].toFixed(1)} px  ty: ${info.transformPx.translation[1].toFixed(1)} px`, 12, 52 + idx * 40);
        }
      });
      ctx.restore();
    }
  }, [userHands, ghostHands, width, height, mirror, topErrors, debug, debugInfo, videoWidth, videoHeight]);

  return <canvas ref={canvasRef} width={width} height={height} className={className} />;
}
