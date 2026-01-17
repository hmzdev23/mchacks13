# PERSON 3: Frontend Lead - AI Agent Prompt

---

## ROLE ASSIGNMENT

You are **Person 3: Frontend Lead** for the SecondHand hackathon project at McHacks 13. You own EVERYTHING the user sees and touches. The magic of the alignment engine means nothing if it doesn't LOOK magical. Your job is to make judges say "WOW" in the first 5 seconds.

---

## PROJECT CONTEXT

**SecondHand** is a real-time AR motion learning platform that:
1. Overlays an expert's "ghost" skeleton onto the user's body
2. Scores how well the user aligns with the expert in real-time
3. Highlights which joints need correction
4. Provides voice coaching feedback

**Your Mission**: Build a STUNNING Next.js application with real-time MediaPipe tracking, ghost overlay rendering, voice commands, and a UI that makes hackathon judges gasp.

---

## YOUR DELIVERABLES

### Complete Application Structure

```
frontend/
├── app/
│   ├── layout.tsx                  # Root layout with fonts, metadata
│   ├── page.tsx                    # Landing page (pack selection)
│   ├── globals.css                 # Global styles + CSS variables
│   ├── calibrate/
│   │   └── page.tsx               # Calibration screen
│   ├── session/
│   │   └── page.tsx               # Main practice session
│   └── recap/
│       └── page.tsx               # Session recap with stats
│
├── components/
│   ├── ui/                         # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Progress.tsx
│   │   ├── Badge.tsx
│   │   └── Tooltip.tsx
│   │
│   ├── landing/                    # Landing page components
│   │   ├── Hero.tsx
│   │   ├── PackSelector.tsx
│   │   └── FeatureGrid.tsx
│   │
│   ├── session/                    # Session components
│   │   ├── Camera.tsx             # Camera feed capture
│   │   ├── GhostOverlay.tsx       # Ghost skeleton renderer
│   │   ├── UserSkeleton.tsx       # User skeleton renderer
│   │   ├── ScoreMeter.tsx         # Real-time score display
│   │   ├── CueDisplay.tsx         # Coaching cue display
│   │   ├── LoopBar.tsx            # Loop segment control
│   │   ├── JointHighlights.tsx    # Error joint highlighting
│   │   └── SessionControls.tsx    # Play/pause/loop controls
│   │
│   ├── calibration/
│   │   ├── CalibrationGuide.tsx   # Visual positioning guide
│   │   └── ReadyIndicator.tsx     # Shows when ready
│   │
│   └── voice/
│       ├── VoiceControl.tsx       # Voice command listener
│       └── VoiceIndicator.tsx     # Shows when listening
│
├── hooks/
│   ├── useCamera.ts               # Camera stream hook
│   ├── useMediaPipe.ts            # MediaPipe detection hook
│   ├── useAlignment.ts            # Alignment computation hook
│   ├── useScoring.ts              # Scoring computation hook
│   ├── useVoiceCommands.ts        # Voice recognition hook
│   ├── useAudioPlayback.ts        # TTS audio playback hook
│   └── useAnimationFrame.ts       # RAF loop hook
│
├── lib/
│   ├── mediapipe/
│   │   ├── hands.ts               # MediaPipe Hands wrapper
│   │   ├── pose.ts                # MediaPipe Pose wrapper
│   │   └── types.ts               # TypeScript types
│   │
│   ├── alignment/
│   │   ├── normalizer.ts          # Keypoint normalization
│   │   ├── aligner.ts             # Spatial alignment
│   │   └── transform.ts           # Transform utilities
│   │
│   ├── scoring/
│   │   ├── calculator.ts          # Score calculation
│   │   ├── smoother.ts            # EMA smoothing
│   │   └── cueMapper.ts           # Error→cue mapping
│   │
│   ├── rendering/
│   │   ├── skeleton.ts            # Skeleton drawing
│   │   ├── ghost.ts               # Ghost effects
│   │   └── highlights.ts          # Joint highlights
│   │
│   └── api/
│       ├── client.ts              # API client
│       ├── coaching.ts            # Coaching API
│       ├── voice.ts               # Voice synthesis API
│       └── packs.ts               # Packs API
│
├── store/
│   └── sessionStore.ts            # Zustand session state
│
├── types/
│   ├── keypoints.ts               # Keypoint types
│   ├── session.ts                 # Session types
│   └── packs.ts                   # Pack types
│
└── public/
    ├── fonts/                     # Custom fonts
    └── sounds/                    # UI sounds
```

---

## DETAILED TECHNICAL SPECIFICATIONS

### 1. Root Layout (`app/layout.tsx`)

```tsx
/**
 * Root Layout
 * 
 * Sets up:
 * - Custom fonts (Inter, Outfit recommended)
 * - Global metadata
 * - Dark theme by default
 */

import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
});

const outfit = Outfit({ 
  subsets: ["latin"],
  variable: "--font-outfit"
});

export const metadata: Metadata = {
  title: "SecondHand - Learn from Invisible Teachers",
  description: "Real-time motion learning with AR ghost overlay",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${outfit.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

---

### 2. Global Styles (`app/globals.css`)

```css
/**
 * Global Styles
 * 
 * Design tokens and base styles for the entire app.
 * Uses CSS custom properties for theming.
 */

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Colors - Dark Theme Primary */
  --color-bg-primary: #0a0a0f;
  --color-bg-secondary: #12121a;
  --color-bg-tertiary: #1a1a24;
  --color-bg-elevated: #222230;
  
  /* Accent Colors - Vibrant Gradient */
  --color-accent-primary: #6366f1;    /* Indigo */
  --color-accent-secondary: #8b5cf6;  /* Violet */
  --color-accent-tertiary: #a855f7;   /* Purple */
  --color-accent-glow: rgba(99, 102, 241, 0.5);
  
  /* Ghost Colors */
  --color-ghost-skeleton: rgba(139, 92, 246, 0.8);
  --color-ghost-glow: rgba(139, 92, 246, 0.3);
  --color-ghost-joint: #a855f7;
  
  /* User Skeleton Colors */
  --color-user-skeleton: rgba(34, 211, 238, 0.8);
  --color-user-joint: #22d3ee;
  
  /* Error/Success Colors */
  --color-error: #ef4444;
  --color-error-glow: rgba(239, 68, 68, 0.4);
  --color-success: #22c55e;
  --color-success-glow: rgba(34, 197, 94, 0.4);
  --color-warning: #f59e0b;
  
  /* Score Colors */
  --color-score-low: #ef4444;
  --color-score-mid: #f59e0b;
  --color-score-high: #22c55e;
  --color-score-perfect: #6366f1;
  
  /* Text */
  --color-text-primary: #ffffff;
  --color-text-secondary: rgba(255, 255, 255, 0.7);
  --color-text-tertiary: rgba(255, 255, 255, 0.5);
  
  /* Fonts */
  --font-display: var(--font-outfit), system-ui, sans-serif;
  --font-body: var(--font-inter), system-ui, sans-serif;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  
  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-glow: 0 0 20px var(--color-accent-glow);
  --shadow-glow-lg: 0 0 40px var(--color-accent-glow);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 500ms ease;
}

/* Base Styles */
body {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  min-height: 100vh;
  overflow-x: hidden;
}

/* Background Gradient */
.bg-gradient-radial {
  background: radial-gradient(
    ellipse at center top,
    rgba(99, 102, 241, 0.15) 0%,
    transparent 50%
  );
}

/* Glass Effect */
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Glow Effects */
.glow-accent {
  box-shadow: var(--shadow-glow);
}

.glow-success {
  box-shadow: 0 0 20px var(--color-success-glow);
}

.glow-error {
  box-shadow: 0 0 20px var(--color-error-glow);
}

/* Score Gradient Animations */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 20px var(--color-accent-glow);
  }
  50% {
    box-shadow: 0 0 40px var(--color-accent-glow);
  }
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

/* Ghost Skeleton Animation */
@keyframes ghost-pulse {
  0%, 100% {
    opacity: 0.8;
  }
  50% {
    opacity: 0.6;
  }
}

.animate-ghost {
  animation: ghost-pulse 1.5s ease-in-out infinite;
}

/* Success Celebration */
@keyframes celebrate {
  0% { transform: scale(1); }
  25% { transform: scale(1.1); }
  50% { transform: scale(1); }
  75% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.animate-celebrate {
  animation: celebrate 0.5s ease-in-out;
}
```

---

### 3. Camera Component (`components/session/Camera.tsx`)

```tsx
/**
 * Camera Component
 * 
 * Captures webcam feed and provides video element for MediaPipe.
 * Handles:
 * - Camera permissions
 * - Stream management
 * - Mirroring toggle
 * - Lighting quality detection
 */

"use client";

import { useRef, useEffect, useState, useCallback, forwardRef } from "react";

interface CameraProps {
  onStreamReady?: (video: HTMLVideoElement) => void;
  onError?: (error: Error) => void;
  mirrored?: boolean;
  className?: string;
}

export const Camera = forwardRef<HTMLVideoElement, CameraProps>(
  ({ onStreamReady, onError, mirrored = true, className }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

    useEffect(() => {
      let stream: MediaStream | null = null;

      const startCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
              facingMode: "user",
            },
            audio: false,
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setHasPermission(true);
            setIsLoading(false);
            onStreamReady?.(videoRef.current);
          }
        } catch (err) {
          setHasPermission(false);
          setIsLoading(false);
          onError?.(err as Error);
        }
      };

      startCamera();

      return () => {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      };
    }, [onStreamReady, onError]);

    return (
      <div className={`relative ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary rounded-xl">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-text-secondary text-sm">Starting camera...</p>
            </div>
          </div>
        )}
        
        {hasPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary rounded-xl">
            <div className="text-center p-6">
              <p className="text-error font-medium mb-2">Camera access denied</p>
              <p className="text-text-secondary text-sm">
                Please allow camera access to use SecondHand
              </p>
            </div>
          </div>
        )}

        <video
          ref={(node) => {
            (videoRef as any).current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover rounded-xl ${
            mirrored ? "scale-x-[-1]" : ""
          }`}
        />
      </div>
    );
  }
);

Camera.displayName = "Camera";
```

---

### 4. MediaPipe Hook (`hooks/useMediaPipe.ts`)

```typescript
/**
 * useMediaPipe Hook
 * 
 * Real-time hand and pose detection using MediaPipe.
 * Runs entirely in the browser for zero-latency tracking.
 * 
 * CRITICAL: This must be FAST. Target 30+ FPS.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import { Hands, Results as HandResults } from "@mediapipe/hands";
import { Pose, Results as PoseResults } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";

export interface HandLandmarks {
  landmarks: number[][];  // 21 points, each [x, y, z]
  handedness: "Left" | "Right";
  score: number;
}

export interface PoseLandmarks {
  landmarks: number[][];  // 33 points, each [x, y, z, visibility]
}

export interface MediaPipeResults {
  leftHand: HandLandmarks | null;
  rightHand: HandLandmarks | null;
  pose: PoseLandmarks | null;
  timestamp: number;
  fps: number;
}

interface UseMediaPipeOptions {
  detectHands?: boolean;
  detectPose?: boolean;
  onResults?: (results: MediaPipeResults) => void;
}

export function useMediaPipe(
  videoElement: HTMLVideoElement | null,
  options: UseMediaPipeOptions = {}
) {
  const { detectHands = true, detectPose = false, onResults } = options;
  
  const handsRef = useRef<Hands | null>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [fps, setFps] = useState(0);
  const lastFrameTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  
  const resultsRef = useRef<MediaPipeResults>({
    leftHand: null,
    rightHand: null,
    pose: null,
    timestamp: 0,
    fps: 0,
  });

  // Process hand results
  const processHandResults = useCallback((results: HandResults) => {
    let leftHand: HandLandmarks | null = null;
    let rightHand: HandLandmarks | null = null;

    if (results.multiHandLandmarks && results.multiHandedness) {
      results.multiHandLandmarks.forEach((landmarks, index) => {
        const handedness = results.multiHandedness![index];
        const hand: HandLandmarks = {
          landmarks: landmarks.map((lm) => [lm.x, lm.y, lm.z]),
          handedness: handedness.label as "Left" | "Right",
          score: handedness.score,
        };

        // Note: MediaPipe returns mirrored handedness
        // "Left" from MediaPipe = user's right hand (camera is mirrored)
        if (handedness.label === "Left") {
          rightHand = hand;
        } else {
          leftHand = hand;
        }
      });
    }

    return { leftHand, rightHand };
  }, []);

  // Process pose results
  const processPoseResults = useCallback((results: PoseResults) => {
    if (results.poseLandmarks) {
      return {
        landmarks: results.poseLandmarks.map((lm) => [
          lm.x,
          lm.y,
          lm.z,
          lm.visibility ?? 0,
        ]),
      };
    }
    return null;
  }, []);

  // Initialize MediaPipe
  useEffect(() => {
    if (!videoElement) return;

    const initMediaPipe = async () => {
      // Initialize Hands
      if (detectHands) {
        handsRef.current = new Hands({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        handsRef.current.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        handsRef.current.onResults((results) => {
          const { leftHand, rightHand } = processHandResults(results);
          resultsRef.current.leftHand = leftHand;
          resultsRef.current.rightHand = rightHand;
          resultsRef.current.timestamp = Date.now();
        });
      }

      // Initialize Pose
      if (detectPose) {
        poseRef.current = new Pose({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        poseRef.current.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        poseRef.current.onResults((results) => {
          resultsRef.current.pose = processPoseResults(results);
        });
      }

      setIsLoading(false);
    };

    initMediaPipe();

    return () => {
      handsRef.current?.close();
      poseRef.current?.close();
    };
  }, [videoElement, detectHands, detectPose, processHandResults, processPoseResults]);

  // Start camera loop
  useEffect(() => {
    if (!videoElement || isLoading) return;

    cameraRef.current = new Camera(videoElement, {
      onFrame: async () => {
        // FPS calculation
        const now = performance.now();
        frameCountRef.current++;
        if (now - lastFrameTimeRef.current >= 1000) {
          setFps(frameCountRef.current);
          resultsRef.current.fps = frameCountRef.current;
          frameCountRef.current = 0;
          lastFrameTimeRef.current = now;
        }

        // Process frames
        if (handsRef.current) {
          await handsRef.current.send({ image: videoElement });
        }
        if (poseRef.current) {
          await poseRef.current.send({ image: videoElement });
        }

        // Callback with results
        onResults?.(resultsRef.current);
      },
      width: 1280,
      height: 720,
    });

    cameraRef.current.start();

    return () => {
      cameraRef.current?.stop();
    };
  }, [videoElement, isLoading, onResults]);

  return {
    results: resultsRef.current,
    isLoading,
    fps,
  };
}
```

---

### 5. Ghost Overlay Component (`components/session/GhostOverlay.tsx`)

```tsx
/**
 * Ghost Overlay Component
 * 
 * The MAGIC of SecondHand - renders the expert's skeleton as a
 * translucent "ghost" that users try to match.
 * 
 * This component must be:
 * - Beautiful (the ghost should look ethereal and appealing)
 * - Clear (users must understand where joints are)
 * - Smooth (no jittering or flickering)
 */

"use client";

import { useRef, useEffect, useCallback } from "react";

interface GhostOverlayProps {
  width: number;
  height: number;
  expertKeypoints: number[][] | null;  // 21 x 2 for hands
  userKeypoints: number[][] | null;
  alignmentTransform: {
    scale: number;
    translation: [number, number];
    rotation: number;
  } | null;
  topErrorJoints?: number[];
  className?: string;
}

// Hand skeleton connections
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm
  [5, 9], [9, 13], [13, 17],
];

export function GhostOverlay({
  width,
  height,
  expertKeypoints,
  userKeypoints,
  alignmentTransform,
  topErrorJoints = [],
  className,
}: GhostOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Apply alignment transform to expert keypoints
  const getAlignedExpertKeypoints = useCallback(() => {
    if (!expertKeypoints || !alignmentTransform) return null;

    const { scale, translation, rotation } = alignmentTransform;
    const [tx, ty] = translation;

    return expertKeypoints.map(([x, y]) => {
      // Scale
      let px = x * scale;
      let py = y * scale;
      
      // Rotate (around origin)
      if (rotation !== 0) {
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const rx = px * cos - py * sin;
        const ry = px * sin + py * cos;
        px = rx;
        py = ry;
      }
      
      // Translate to screen coordinates
      return [px * width + tx, py * height + ty];
    });
  }, [expertKeypoints, alignmentTransform, width, height]);

  // Draw the ghost skeleton
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const alignedExpert = getAlignedExpertKeypoints();
    if (!alignedExpert) return;

    // Draw ghost glow effect (outer layer)
    ctx.save();
    ctx.shadowColor = "rgba(139, 92, 246, 0.5)";
    ctx.shadowBlur = 20;
    ctx.globalAlpha = 0.3;
    
    // Draw connections with glow
    ctx.strokeStyle = "rgba(139, 92, 246, 0.8)";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    
    HAND_CONNECTIONS.forEach(([start, end]) => {
      const [x1, y1] = alignedExpert[start];
      const [x2, y2] = alignedExpert[end];
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    
    ctx.restore();

    // Draw ghost skeleton (main layer)
    ctx.save();
    
    // Create gradient for skeleton lines
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(139, 92, 246, 0.9)");
    gradient.addColorStop(0.5, "rgba(168, 85, 247, 0.9)");
    gradient.addColorStop(1, "rgba(99, 102, 241, 0.9)");
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // Draw connections
    HAND_CONNECTIONS.forEach(([start, end]) => {
      const [x1, y1] = alignedExpert[start];
      const [x2, y2] = alignedExpert[end];
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    
    // Draw joints
    alignedExpert.forEach(([x, y], index) => {
      const isErrorJoint = topErrorJoints.includes(index);
      const isFingertip = [4, 8, 12, 16, 20].includes(index);
      const isWrist = index === 0;
      
      // Base radius
      let radius = isFingertip ? 6 : isWrist ? 8 : 4;
      
      // Draw error highlight if this is a problem joint
      if (isErrorJoint) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
        ctx.fill();
        
        // Pulsing ring
        ctx.beginPath();
        ctx.arc(x, y, radius + 15, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // Draw joint
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      
      if (isErrorJoint) {
        ctx.fillStyle = "#ef4444";
      } else {
        ctx.fillStyle = isFingertip ? "#a855f7" : "#8b5cf6";
      }
      ctx.fill();
      
      // Draw joint border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    
    ctx.restore();

    // Continue animation loop
    animationRef.current = requestAnimationFrame(draw);
  }, [width, height, getAlignedExpertKeypoints, topErrorJoints]);

  useEffect(() => {
    draw();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`absolute inset-0 pointer-events-none ${className}`}
    />
  );
}
```

---

### 6. Score Meter Component (`components/session/ScoreMeter.tsx`)

```tsx
/**
 * Score Meter Component
 * 
 * Shows the real-time alignment score with satisfying
 * visual feedback. The score should FEEL meaningful.
 */

"use client";

import { useMemo } from "react";

interface ScoreMeterProps {
  score: number;          // 0-100
  trend?: number;         // positive = improving
  showTrend?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ScoreMeter({
  score,
  trend = 0,
  showTrend = true,
  size = "lg",
  className,
}: ScoreMeterProps) {
  // Determine color based on score
  const colors = useMemo(() => {
    if (score >= 90) return {
      primary: "#6366f1",
      glow: "rgba(99, 102, 241, 0.5)",
      label: "Perfect!",
    };
    if (score >= 75) return {
      primary: "#22c55e",
      glow: "rgba(34, 197, 94, 0.5)",
      label: "Great!",
    };
    if (score >= 50) return {
      primary: "#f59e0b",
      glow: "rgba(245, 158, 11, 0.5)",
      label: "Keep going",
    };
    return {
      primary: "#ef4444",
      glow: "rgba(239, 68, 68, 0.5)",
      label: "Try again",
    };
  }, [score]);

  const sizeClasses = {
    sm: "w-24 h-24 text-2xl",
    md: "w-32 h-32 text-3xl",
    lg: "w-40 h-40 text-4xl",
  };

  const strokeWidth = size === "lg" ? 8 : size === "md" ? 6 : 4;
  const radius = size === "lg" ? 60 : size === "md" ? 48 : 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Background glow */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-50 transition-all duration-300"
        style={{ backgroundColor: colors.glow }}
      />
      
      {/* Circular progress */}
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        {/* Background circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-300 ease-out"
          style={{
            filter: `drop-shadow(0 0 10px ${colors.glow})`,
          }}
        />
      </svg>
      
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display font-bold transition-colors duration-300"
          style={{ color: colors.primary }}
        >
          {Math.round(score)}
        </span>
        
        {showTrend && trend !== 0 && (
          <span
            className={`text-xs font-medium ${
              trend > 0 ? "text-success" : "text-error"
            }`}
          >
            {trend > 0 ? "↑" : "↓"} {Math.abs(Math.round(trend))}
          </span>
        )}
        
        <span className="text-xs text-text-secondary mt-1">
          {colors.label}
        </span>
      </div>
    </div>
  );
}
```

---

### 7. Cue Display Component (`components/session/CueDisplay.tsx`)

```tsx
/**
 * Cue Display Component
 * 
 * Shows coaching cues in a non-intrusive but visible way.
 * Cues should feel helpful, not nagging.
 */

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CueDisplayProps {
  primaryCue: string | null;
  secondaryCue?: string | null;
  encouragement?: string | null;
  className?: string;
}

export function CueDisplay({
  primaryCue,
  secondaryCue,
  encouragement,
  className,
}: CueDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (primaryCue) {
      setIsVisible(true);
      // Auto-hide after 5 seconds if no new cue
      const timer = setTimeout(() => setIsVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [primaryCue]);

  return (
    <div className={`pointer-events-none ${className}`}>
      <AnimatePresence mode="wait">
        {isVisible && primaryCue && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="glass rounded-xl px-6 py-4 max-w-md"
          >
            {/* Encouragement badge */}
            {encouragement && (
              <div className="mb-2">
                <span className="inline-block px-2 py-1 text-xs font-medium bg-success/20 text-success rounded-full">
                  {encouragement}
                </span>
              </div>
            )}
            
            {/* Primary cue */}
            <p className="text-lg font-medium text-text-primary">
              {primaryCue}
            </p>
            
            {/* Secondary cue */}
            {secondaryCue && (
              <p className="text-sm text-text-secondary mt-2">
                {secondaryCue}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

### 8. Session Store (`store/sessionStore.ts`)

```typescript
/**
 * Session Store (Zustand)
 * 
 * Global state for the practice session.
 * Keeps all real-time data in sync across components.
 */

import { create } from "zustand";

interface SessionState {
  // Session info
  packId: string | null;
  lessonId: string | null;
  isActive: boolean;
  
  // Keypoints
  userKeypoints: {
    leftHand: number[][] | null;
    rightHand: number[][] | null;
    pose: number[][] | null;
  };
  expertKeypoints: {
    leftHand: number[][] | null;
    rightHand: number[][] | null;
    pose: number[][] | null;
  };
  
  // Alignment
  alignmentTransform: {
    scale: number;
    translation: [number, number];
    rotation: number;
  } | null;
  
  // Scoring
  currentScore: number;
  scoreHistory: number[];
  topErrorJoints: number[];
  trend: number;
  
  // Coaching
  currentCue: {
    primary: string | null;
    secondary: string | null;
    encouragement: string | null;
  };
  
  // Loop mode
  isLooping: boolean;
  loopStart: number;
  loopEnd: number;
  loopAttempts: number;
  loopBestScore: number;
  
  // Actions
  setPackAndLesson: (packId: string, lessonId: string) => void;
  startSession: () => void;
  endSession: () => void;
  updateUserKeypoints: (keypoints: SessionState["userKeypoints"]) => void;
  setExpertKeypoints: (keypoints: SessionState["expertKeypoints"]) => void;
  updateAlignment: (transform: SessionState["alignmentTransform"]) => void;
  updateScore: (score: number, topErrors: number[]) => void;
  setCue: (cue: SessionState["currentCue"]) => void;
  startLoop: (start: number, end: number) => void;
  stopLoop: () => void;
  recordLoopAttempt: (score: number) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  // Initial state
  packId: null,
  lessonId: null,
  isActive: false,
  
  userKeypoints: {
    leftHand: null,
    rightHand: null,
    pose: null,
  },
  expertKeypoints: {
    leftHand: null,
    rightHand: null,
    pose: null,
  },
  
  alignmentTransform: null,
  
  currentScore: 0,
  scoreHistory: [],
  topErrorJoints: [],
  trend: 0,
  
  currentCue: {
    primary: null,
    secondary: null,
    encouragement: null,
  },
  
  isLooping: false,
  loopStart: 0,
  loopEnd: 0,
  loopAttempts: 0,
  loopBestScore: 0,
  
  // Actions
  setPackAndLesson: (packId, lessonId) => set({ packId, lessonId }),
  
  startSession: () => set({ isActive: true, scoreHistory: [] }),
  
  endSession: () => set({ isActive: false }),
  
  updateUserKeypoints: (keypoints) => set({ userKeypoints: keypoints }),
  
  setExpertKeypoints: (keypoints) => set({ expertKeypoints: keypoints }),
  
  updateAlignment: (transform) => set({ alignmentTransform: transform }),
  
  updateScore: (score, topErrors) => {
    const { scoreHistory } = get();
    const newHistory = [...scoreHistory.slice(-29), score];
    
    // Calculate trend (average of last 5 vs previous 5)
    let trend = 0;
    if (newHistory.length >= 10) {
      const recent = newHistory.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const previous = newHistory.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
      trend = recent - previous;
    }
    
    set({
      currentScore: score,
      scoreHistory: newHistory,
      topErrorJoints: topErrors,
      trend,
    });
  },
  
  setCue: (cue) => set({ currentCue: cue }),
  
  startLoop: (start, end) => set({
    isLooping: true,
    loopStart: start,
    loopEnd: end,
    loopAttempts: 0,
    loopBestScore: 0,
  }),
  
  stopLoop: () => set({ isLooping: false }),
  
  recordLoopAttempt: (score) => {
    const { loopAttempts, loopBestScore } = get();
    set({
      loopAttempts: loopAttempts + 1,
      loopBestScore: Math.max(loopBestScore, score),
    });
  },
  
  reset: () => set({
    packId: null,
    lessonId: null,
    isActive: false,
    userKeypoints: { leftHand: null, rightHand: null, pose: null },
    expertKeypoints: { leftHand: null, rightHand: null, pose: null },
    alignmentTransform: null,
    currentScore: 0,
    scoreHistory: [],
    topErrorJoints: [],
    trend: 0,
    currentCue: { primary: null, secondary: null, encouragement: null },
    isLooping: false,
    loopStart: 0,
    loopEnd: 0,
    loopAttempts: 0,
    loopBestScore: 0,
  }),
}));
```

---

### 9. Voice Commands Hook (`hooks/useVoiceCommands.ts`)

```typescript
/**
 * useVoiceCommands Hook
 * 
 * Voice recognition for hands-free control.
 * Commands: "start", "stop", "loop", "explain", "slow", etc.
 */

import { useState, useEffect, useCallback, useRef } from "react";

type VoiceCommand =
  | "start"
  | "stop"
  | "loop"
  | "next"
  | "previous"
  | "slow"
  | "normal"
  | "explain"
  | "what"
  | "help";

interface UseVoiceCommandsOptions {
  onCommand?: (command: VoiceCommand) => void;
  enabled?: boolean;
}

export function useVoiceCommands(options: UseVoiceCommandsOptions = {}) {
  const { onCommand, enabled = true } = options;
  
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Command patterns to match
  const commandPatterns: Record<VoiceCommand, RegExp> = {
    start: /\b(start|begin|go)\b/i,
    stop: /\b(stop|pause|wait)\b/i,
    loop: /\b(loop|repeat|again)\b/i,
    next: /\b(next|skip|forward)\b/i,
    previous: /\b(previous|back|before)\b/i,
    slow: /\b(slow|slower)\b/i,
    normal: /\b(normal|regular|speed)\b/i,
    explain: /\b(explain|what.+wrong|help.+me)\b/i,
    what: /\b(what|show.+mistake)\b/i,
    help: /\b(help)\b/i,
  };

  // Parse spoken text for commands
  const parseCommand = useCallback((text: string): VoiceCommand | null => {
    for (const [command, pattern] of Object.entries(commandPatterns)) {
      if (pattern.test(text)) {
        return command as VoiceCommand;
      }
    }
    return null;
  }, [commandPatterns]);

  // Start listening
  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setError("Speech recognition not supported");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = "en-US";

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      const command = parseCommand(transcript);
      
      if (command) {
        setLastCommand(command);
        onCommand?.(command);
      }
    };

    recognitionRef.current.onerror = (event) => {
      if (event.error !== "no-speech") {
        setError(event.error);
      }
    };

    recognitionRef.current.onend = () => {
      // Restart if still enabled
      if (enabled && recognitionRef.current) {
        recognitionRef.current.start();
      }
    };

    recognitionRef.current.start();
  }, [enabled, onCommand, parseCommand]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Effect to manage lifecycle
  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [enabled, startListening, stopListening]);

  return {
    isListening,
    lastCommand,
    error,
    startListening,
    stopListening,
  };
}
```

---

### 10. Landing Page (`app/page.tsx`)

```tsx
/**
 * Landing Page
 * 
 * First impression is EVERYTHING.
 * Make it stunning, make it clear, make them want to try it.
 */

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

const packs = [
  {
    id: "sign-language",
    name: "Sign Language",
    description: "Learn ASL basics with hand tracking",
    icon: "🤟",
    available: true,
  },
  {
    id: "cpr",
    name: "CPR Form",
    description: "Master life-saving techniques",
    icon: "❤️",
    available: false,
  },
  {
    id: "piano",
    name: "Piano Technique",
    description: "Perfect your finger positioning",
    icon: "🎹",
    available: false,
  },
];

export default function LandingPage() {
  const [selectedPack, setSelectedPack] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-gradient-radial">
      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-20 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Logo/Title */}
          <h1 className="font-display text-6xl md:text-7xl font-bold mb-4">
            <span className="bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-tertiary bg-clip-text text-transparent">
              SecondHand
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto mb-8">
            Learn physical skills from{" "}
            <span className="text-text-primary font-medium">invisible teachers</span>.
            Match the ghost, master the move.
          </p>
          
          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Link
              href="#packs"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity glow-accent"
            >
              Start Learning
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* How it Works */}
      <section className="container mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8"
        >
          {[
            {
              step: "1",
              title: "Ghost Appears",
              description: "A translucent skeleton overlays on your body showing the correct form",
            },
            {
              step: "2",
              title: "Match & Score",
              description: "Move to align with the ghost. Your score updates in real-time",
            },
            {
              step: "3",
              title: "Get Coaching",
              description: "Receive instant feedback on what to adjust",
            },
          ].map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="glass rounded-2xl p-6 text-center"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                {item.step}
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-text-secondary">{item.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Pack Selection */}
      <section id="packs" className="container mx-auto px-6 py-16">
        <h2 className="font-display text-3xl font-bold text-center mb-12">
          Choose Your Skill Pack
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {packs.map((pack, index) => (
            <motion.button
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onClick={() => pack.available && setSelectedPack(pack.id)}
              disabled={!pack.available}
              className={`relative glass rounded-2xl p-6 text-left transition-all ${
                pack.available
                  ? "hover:border-accent-primary/50 cursor-pointer"
                  : "opacity-50 cursor-not-allowed"
              } ${
                selectedPack === pack.id
                  ? "border-accent-primary glow-accent"
                  : ""
              }`}
            >
              {!pack.available && (
                <span className="absolute top-3 right-3 text-xs bg-bg-elevated px-2 py-1 rounded-full">
                  Coming Soon
                </span>
              )}
              
              <span className="text-4xl mb-4 block">{pack.icon}</span>
              <h3 className="font-display text-xl font-semibold mb-1">
                {pack.name}
              </h3>
              <p className="text-sm text-text-secondary">{pack.description}</p>
            </motion.button>
          ))}
        </div>

        {selectedPack && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-12"
          >
            <Link
              href={`/calibrate?pack=${selectedPack}`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              Continue with {packs.find(p => p.id === selectedPack)?.name}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </motion.div>
        )}
      </section>
    </main>
  );
}
```

---

## DEPENDENCIES (package.json)

```json
{
  "name": "secondhand-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.4",
    "react": "^18",
    "react-dom": "^18",
    "@mediapipe/hands": "^0.4.1675469240",
    "@mediapipe/pose": "^0.5.1675469404",
    "@mediapipe/camera_utils": "^0.3.1675466862",
    "@mediapipe/drawing_utils": "^0.3.1675466124",
    "zustand": "^4.4.7",
    "framer-motion": "^10.16.16"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "tailwindcss": "^3.3.0",
    "typescript": "^5"
  }
}
```

---

## TAILWIND CONFIG

```js
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-tertiary': 'var(--color-bg-tertiary)',
        'bg-elevated': 'var(--color-bg-elevated)',
        'accent-primary': 'var(--color-accent-primary)',
        'accent-secondary': 'var(--color-accent-secondary)',
        'accent-tertiary': 'var(--color-accent-tertiary)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',
        'error': 'var(--color-error)',
        'success': 'var(--color-success)',
        'warning': 'var(--color-warning)',
      },
      fontFamily: {
        display: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

---

## CRITICAL SUCCESS FACTORS

1. **First impression in 5 seconds**: Landing page must be STUNNING
2. **Ghost must look magical**: Glow effects, smooth animations, ethereal feel
3. **Score must feel satisfying**: Color changes, animations on improvement
4. **Cues must be visible but not annoying**: Animate in/out smoothly
5. **30+ FPS always**: Never let MediaPipe lag the UI
6. **Mobile consideration**: Test on mobile (smaller screen, maybe no support note)

---

## TESTING CHECKLIST

- [ ] Camera permission flow works smoothly
- [ ] MediaPipe detects hands accurately
- [ ] Ghost renders aligned to user skeleton
- [ ] Score updates in real-time smoothly
- [ ] Cues appear/disappear gracefully
- [ ] Voice commands are recognized
- [ ] Loop mode works correctly
- [ ] UI looks stunning on 1080p display
- [ ] No frame drops or jitter
- [ ] Works in Chrome, Firefox, Safari

---

## HANDOFF POINTS

**You receive from Person 1 & 2**:
- Alignment algorithm (port to TypeScript)
- Scoring algorithm (port to TypeScript)
- Cue mapping rules (port to TypeScript)
- Expert keypoints JSON (load and render)
- API endpoints for coaching/voice

**You provide**:
- The complete visual experience
- Real-time performance (30+ FPS)
- UI that makes judges say "WOW"

---

## START HERE

1. Run `npx create-next-app@latest frontend --typescript --tailwind --app`
2. Set up project structure as outlined
3. Create globals.css with design tokens
4. Implement Camera component first
5. Implement useMediaPipe hook
6. Implement GhostOverlay component
7. Build landing page
8. Build session page
9. Add voice commands
10. Polish, polish, polish

---

**You are the face. Without you, SecondHand is just math.**
