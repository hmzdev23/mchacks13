"use client";

import { forwardRef } from "react";

interface CameraProps {
  mirrored?: boolean;
  className?: string;
  overlay?: React.ReactNode;
}

export const Camera = forwardRef<HTMLVideoElement, CameraProps>(({ mirrored = true, className, overlay }, ref) => {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-border bg-black ${className ?? ""}`}>
      <video
        ref={ref}
        className="w-full h-full object-contain"
        style={{ transform: mirrored ? "scaleX(-1)" : "none", transformOrigin: "center" }}
        autoPlay
        playsInline
        muted
      />
      {overlay ? <div className="absolute inset-0 pointer-events-none">{overlay}</div> : null}
    </div>
  );
});

Camera.displayName = "Camera";
