"use client";

import { useEffect, useRef } from "react";
import { Point2D } from "@/lib/cv/alignment";

interface PoseOverlayCanvasProps {
  width: number;
  height: number;
  videoWidth?: number;
  videoHeight?: number;
  mirror?: boolean;
  userPose: Point2D[] | null;
  ghostPose: Point2D[] | null;
  topErrors?: number[];
  className?: string;
}

const POSE_CONNECTIONS: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [15, 17],
  [15, 19],
  [15, 21],
  [12, 14],
  [14, 16],
  [16, 18],
  [16, 20],
  [16, 22],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [27, 29],
  [29, 31],
  [24, 26],
  [26, 28],
  [28, 30],
  [30, 32],
  [27, 31],
  [28, 32],
];

const isValidPoint = (point: Point2D | undefined) =>
  !!point && Number.isFinite(point[0]) && Number.isFinite(point[1]);

export function PoseOverlayCanvas({
  width,
  height,
  videoWidth,
  videoHeight,
  mirror = true,
  userPose,
  ghostPose,
  topErrors = [],
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

    const transformPoint = (point: Point2D): Point2D => {
      const x = mirror ? 1 - point[0] : point[0];
      return [offsetX + x * drawWidth, offsetY + point[1] * drawHeight];
    };

    const drawTorso = (points: Point2D[], fill: string, stroke?: string) => {
      const torso = [11, 12, 24, 23].map((idx) => points[idx]);
      if (torso.some((point) => !isValidPoint(point))) return;
      const coords = torso.map((point) => transformPoint(point as Point2D));
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(coords[0][0], coords[0][1]);
      coords.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawHead = (points: Point2D[], color: string) => {
      const leftShoulder = points[11];
      const rightShoulder = points[12];
      if (!isValidPoint(leftShoulder) || !isValidPoint(rightShoulder)) return;
      const shoulderMid: Point2D = [
        (leftShoulder[0] + rightShoulder[0]) / 2,
        (leftShoulder[1] + rightShoulder[1]) / 2,
      ];
      const dx = leftShoulder[0] - rightShoulder[0];
      const dy = leftShoulder[1] - rightShoulder[1];
      const radius = Math.max(0.035, Math.hypot(dx, dy) * 0.55);
      const [cx, cy] = transformPoint([shoulderMid[0], shoulderMid[1] - radius * 0.9]);
      const scale = Math.min(drawWidth, drawHeight);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius * scale, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    };

    const drawSkeleton = (
      points: Point2D[],
      color: string,
      options: {
        glow?: boolean;
        lineWidth?: number;
        errors?: number[];
        shadowColor?: string;
        jointScale?: number;
        jointColor?: string;
      } = {}
    ) => {
      const { glow = false, lineWidth = 3, errors = [], shadowColor = color, jointScale = 1, jointColor = color } = options;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (glow) {
        ctx.shadowBlur = 18;
        ctx.shadowColor = shadowColor;
      }
      POSE_CONNECTIONS.forEach(([a, b]) => {
        const p1 = points[a];
        const p2 = points[b];
        if (!isValidPoint(p1) || !isValidPoint(p2)) return;
        const [x1, y1] = transformPoint(p1);
        const [x2, y2] = transformPoint(p2);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });
      ctx.restore();

      points.forEach((point, idx) => {
        if (!isValidPoint(point)) return;
        const [x, y] = transformPoint(point);
        const baseRadius = idx === 0 ? 7 : [15, 16, 27, 28].includes(idx) ? 5 : 4;
        const radius = baseRadius * jointScale;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = errors.includes(idx) ? "#ef4444" : jointColor;
        ctx.fill();
      });
    };

    if (ghostPose) {
      drawTorso(ghostPose, "rgba(148,163,184,0.18)", "rgba(148,163,184,0.35)");
      drawHead(ghostPose, "rgba(255,255,255,0.35)");
      drawSkeleton(ghostPose, "rgba(15,23,42,0.35)", {
        lineWidth: 8,
        glow: true,
        shadowColor: "rgba(59,130,246,0.35)",
        jointScale: 1.3,
        jointColor: "rgba(255,255,255,0.75)",
      });
      drawSkeleton(ghostPose, "rgba(255,255,255,0.95)", { lineWidth: 4, jointScale: 1.15, jointColor: "rgba(255,255,255,0.95)" });
    }

    if (userPose) {
      drawSkeleton(userPose, "rgba(15,118,110,0.85)", {
        errors: topErrors,
        lineWidth: 2,
        jointScale: 0.9,
        jointColor: "rgba(15,118,110,0.9)",
      });
    }
  }, [width, height, videoWidth, videoHeight, mirror, userPose, ghostPose, topErrors]);

  return <canvas ref={canvasRef} width={width} height={height} className={className} />;
}
