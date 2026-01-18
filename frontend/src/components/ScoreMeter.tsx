"use client";

interface ScoreMeterProps {
  score: number;
  trend?: number;
  className?: string;
}

export function ScoreMeter({ score, trend = 0, className }: ScoreMeterProps) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const progress = (Math.min(100, Math.max(0, score)) / 100) * circumference;

  const color =
    score >= 90
      ? "#0f766e"
      : score >= 75
      ? "#16a34a"
      : score >= 50
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className={`relative w-32 h-32 ${className ?? ""}`}>
      <svg viewBox="0 0 120 120" className="-rotate-90 w-full h-full">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-[stroke-dashoffset] duration-200 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-semibold" style={{ color }}>
          {Math.round(score)}
        </div>
        <div className="text-xs text-text-secondary">{trend > 0 ? "↑ improving" : trend < 0 ? "↓ steady" : "live"}</div>
      </div>
    </div>
  );
}
