"use client";

import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";

interface ScoreMeterProps {
  score: number;
  trend?: number;
  className?: string;
}

export function ScoreMeter({ score, className }: ScoreMeterProps) {
  return (
    <AnimatedCircularProgressBar
      value={score}
      max={100}
      min={0}
      className={className}
    />
  );
}
