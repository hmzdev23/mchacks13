/**
 * Camera Component
 * 
 * Captures webcam feed and provides video element for MediaPipe.
 * Handles camera permissions, stream management, and mirroring.
 */

"use client";

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/loaders";

interface CameraProps {
    onStreamReady?: (video: HTMLVideoElement) => void;
    onError?: (error: Error) => void;
    mirrored?: boolean;
    className?: string;
    showControls?: boolean;
}

export interface CameraRef {
    video: HTMLVideoElement | null;
    stream: MediaStream | null;
}

export const Camera = forwardRef<CameraRef, CameraProps>(
    ({ onStreamReady, onError, mirrored = true, className, showControls = false }, ref) => {
        const videoRef = useRef<HTMLVideoElement>(null);
        const streamRef = useRef<MediaStream | null>(null);
        const [isLoading, setIsLoading] = useState(true);
        const [hasPermission, setHasPermission] = useState<boolean | null>(null);
        const [error, setError] = useState<string | null>(null);

        useImperativeHandle(ref, () => ({
            video: videoRef.current,
            stream: streamRef.current,
        }));

        useEffect(() => {
            // Simply provide the video element to the parent
            // MediaPipe Camera utility will handle the actual stream
            if (videoRef.current) {
                setIsLoading(false);
                setHasPermission(true);
                onStreamReady?.(videoRef.current);
            }
        }, [onStreamReady]);

        return (
            <div className={cn("relative bg-[var(--color-bg-secondary)] rounded-2xl overflow-hidden", className)}>
                {/* Loading state */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-4">
                            <Spinner size="lg" />
                            <p className="text-[var(--color-text-secondary)] text-sm">
                                Starting camera...
                            </p>
                        </div>
                    </div>
                )}

                {/* Error state */}
                {hasPermission === false && error && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="text-center p-6 max-w-md">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-error)]/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-[var(--color-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <p className="text-[var(--color-error)] font-medium mb-2">Camera Access Required</p>
                            <p className="text-[var(--color-text-secondary)] text-sm">
                                {error}
                            </p>
                        </div>
                    </div>
                )}

                {/* Video element */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn(
                        "absolute inset-0 w-full h-full object-cover",
                        mirrored && "scale-x-[-1]",
                        isLoading && "opacity-0"
                    )}
                />

                {/* Corner brackets for style */}
                {!isLoading && hasPermission && (
                    <>
                        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-[var(--color-accent-primary)]/50" />
                        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-[var(--color-accent-primary)]/50" />
                        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-[var(--color-accent-primary)]/50" />
                        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-[var(--color-accent-primary)]/50" />
                    </>
                )}
            </div>
        );
    }
);

Camera.displayName = "Camera";
