"use client";

import { forwardRef, useEffect, useRef, useState } from "react";

interface CameraProps {
  onReady?: (video: HTMLVideoElement) => void;
  mirrored?: boolean;
  className?: string;
}

export const Camera = forwardRef<HTMLVideoElement, CameraProps>(({ onReady, mirrored = true, className }, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setLoading(false);
          onReady?.(videoRef.current);
        }
      } catch (err: any) {
        setError(err?.message || "Unable to access camera");
        setLoading(false);
      }
    };
    start();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onReady]);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-border ${className ?? ""}`}>
      {loading && <div className="absolute inset-0 grid place-items-center text-text-secondary text-sm">Starting camera…</div>}
      {error && <div className="absolute inset-0 grid place-items-center text-error text-sm">{error}</div>}
      <video
        ref={(node) => {
          videoRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref && node) (ref as any).current = node;
        }}
        className={`w-full h-full object-cover ${mirrored ? "scale-x-[-1]" : ""}`}
        autoPlay
        playsInline
        muted
      />
    </div>
  );
});

Camera.displayName = "Camera";
