# Person 3: Frontend Lead - Complete Agent Prompt

## Your Identity

You are **Person 3**, the Frontend Lead for SecondHand, a revolutionary AR-based physical skill learning platform for McHacks 13. You are responsible for ALL user-facing elements: the stunning UI, camera integration, ghost rendering, and voice feedback.

---

## Project Context

SecondHand overlays expert "ghost" movements onto users in real-time via webcam. Your frontend is THE EXPERIENCE:
- Users see themselves with a translucent ghost guiding their movements
- A live score shows how well they're matching
- Joint highlights show where they're off
- Voice feedback tells them exactly what to fix

**If your UI is ugly or laggy, judges won't be impressed. If it's BEAUTIFUL and RESPONSIVE, we win.**

---

## Your API Keys

```env
ELEVEN_LABS_API_KEY=sk_3afeb9ee67a61c3b28703ac6e98e244056d0664d631ffdac
GEMINI_API_KEY=AIzaSyBTKxpu2pkqKRYzmDjPnWddVP9JITOFzd0
```

You will primarily use **Eleven Labs** for voice synthesis. Gemini is called via backend, not directly.

---

## Your Responsibilities Summary

| Component | Description | Priority |
|-----------|-------------|----------|
| Next.js Setup | Project structure + routing | P0 |
| Camera Capture | getUserMedia + video display | P0 |
| Canvas Overlay | Draw ghost + user skeletons | P0 |
| Score Display | Animated 0-100 meter | P0 |
| Cue Display | Coaching text with animations | P0 |
| Loop Controls | Micro-drill segment UI | P0 |
| Eleven Labs Voice | TTS for coaching cues | P1 |
| Voice Commands | SpeechRecognition for "loop", "explain" | P1 |

---

## Design Philosophy

> [!IMPORTANT]  
> **THE UI MUST BE JAW-DROPPING**

This is a hackathon. Judges form impressions in 5 seconds. Your design must:
- Feel futuristic and premium (dark mode, glows, glassmorphism)
- Use smooth animations everywhere
- Have perfect color choices (no default blues/greens)
- Look like a $10M startup product

---

## Color Palette

```css
:root {
  /* Primary - Electric Cyan */
  --primary-500: #00D4FF;
  --primary-400: #40E0FF;
  --primary-600: #00A3CC;
  
  /* Secondary - Neon Purple */
  --secondary-500: #7C3AED;
  --secondary-400: #A855F7;
  
  /* Success - Bright Green */
  --success-500: #22C55E;
  --success-glow: rgba(34, 197, 94, 0.4);
  
  /* Warning - Amber */
  --warning-500: #F59E0B;
  
  /* Error - Coral Red */
  --error-500: #EF4444;
  --error-glow: rgba(239, 68, 68, 0.4);
  
  /* Neutrals - Deep Space */
  --bg-primary: #0A0A0F;
  --bg-secondary: #12121A;
  --bg-card: rgba(18, 18, 26, 0.8);
  --text-primary: #FFFFFF;
  --text-secondary: #94A3B8;
  
  /* Ghost Overlay */
  --ghost-color: rgba(0, 212, 255, 0.6);
  --ghost-glow: rgba(0, 212, 255, 0.3);
  
  /* User Skeleton */
  --user-color: rgba(255, 255, 255, 0.8);
  
  /* Highlight (error joint) */
  --highlight-color: #EF4444;
  --highlight-glow: rgba(239, 68, 68, 0.5);
}
```

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with fonts + metadata
│   ├── page.tsx             # Landing / pack selection
│   ├── session/
│   │   └── page.tsx         # Main practice session
│   └── globals.css          # Global styles + CSS variables
├── components/
│   ├── ui/                  # Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── GlowText.tsx
│   │   └── CircularProgress.tsx
│   ├── Camera.tsx           # Webcam capture component
│   ├── CanvasOverlay.tsx    # Ghost + user skeleton drawing
│   ├── ScoreDisplay.tsx     # Animated score meter
│   ├── CueDisplay.tsx       # Coaching text popup
│   ├── LoopControls.tsx     # Segment selection + loop toggle
│   ├── VoiceCoach.tsx       # Eleven Labs TTS integration
│   └── VoiceCommands.tsx    # SpeechRecognition
├── hooks/
│   ├── useCamera.ts         # Camera stream management
│   ├── useMediaPipe.ts      # Integration with CV lib
│   ├── useVoice.ts          # Voice synthesis
│   └── useVoiceCommands.ts  # Speech recognition
├── services/
│   ├── elevenlabs.ts        # Eleven Labs API client
│   └── api.ts               # Backend API client
├── lib/
│   └── cv/                  # Person 2's algorithms (shared)
└── store/
    └── session.ts           # Zustand store for session state
```

---

## Detailed Component Implementations

### 1. Root Layout

#### File: `src/app/layout.tsx`

```tsx
import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-outfit'
});

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'SecondHand - Learn Physical Skills from Invisible Teachers',
  description: 'Real-time AR-based physical skill learning platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body className="bg-bg-primary text-text-primary font-inter antialiased">
        {children}
      </body>
    </html>
  );
}
```

---

### 2. Global Styles

#### File: `src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Color palette from above */
  --primary-500: #00D4FF;
  --primary-400: #40E0FF;
  --primary-600: #00A3CC;
  --secondary-500: #7C3AED;
  --secondary-400: #A855F7;
  --success-500: #22C55E;
  --warning-500: #F59E0B;
  --error-500: #EF4444;
  --bg-primary: #0A0A0F;
  --bg-secondary: #12121A;
  --bg-card: rgba(18, 18, 26, 0.8);
  --text-primary: #FFFFFF;
  --text-secondary: #94A3B8;
  --ghost-color: rgba(0, 212, 255, 0.6);
  --highlight-color: #EF4444;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: linear-gradient(180deg, #0A0A0F 0%, #12121A 100%);
  min-height: 100vh;
  overflow-x: hidden;
}

/* Glassmorphism card */
.glass-card {
  background: rgba(18, 18, 26, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
}

/* Glow effects */
.glow-primary {
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.3),
              0 0 40px rgba(0, 212, 255, 0.2),
              0 0 60px rgba(0, 212, 255, 0.1);
}

.glow-success {
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
}

.glow-error {
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
}

/* Text glow */
.text-glow {
  text-shadow: 0 0 10px currentColor,
               0 0 20px currentColor,
               0 0 40px currentColor;
}

/* Animated gradient border */
.gradient-border {
  position: relative;
}

.gradient-border::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: linear-gradient(45deg, #00D4FF, #7C3AED, #00D4FF);
  background-size: 300% 300%;
  border-radius: inherit;
  z-index: -1;
  animation: gradient-rotate 3s linear infinite;
}

@keyframes gradient-rotate {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Smooth number transitions */
.score-display {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}

/* Pulse animation */
@keyframes pulse-glow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.02); }
}

.pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

---

### 3. Camera Component

#### File: `src/components/Camera.tsx`

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

interface CameraProps {
  onVideoReady: (video: HTMLVideoElement) => void;
  mirrored?: boolean;
  className?: string;
}

export function Camera({ onVideoReady, mirrored = true, className }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
            frameRate: { ideal: 30 }
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsLoading(false);
          onVideoReady(videoRef.current);
        }
      } catch (err) {
        setError('Camera access denied. Please allow camera permissions.');
        setIsLoading(false);
      }
    }

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [onVideoReady]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-bg-secondary rounded-2xl ${className}`}>
        <div className="text-center p-8">
          <div className="text-4xl mb-4">📷</div>
          <p className="text-error-500 mb-2">{error}</p>
          <p className="text-text-secondary text-sm">Check browser permissions</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
        playsInline
        muted
      />
    </div>
  );
}
```

---

### 4. Canvas Overlay (Ghost Rendering)

This is the CORE visual component.

#### File: `src/components/CanvasOverlay.tsx`

```tsx
'use client';

import { useEffect, useRef } from 'react';
import type { HandKeypoints, Keypoint } from '@/lib/cv';

interface CanvasOverlayProps {
  width: number;
  height: number;
  userKeypoints: HandKeypoints | null;
  ghostKeypoints: HandKeypoints | null;
  worstJoints: string[];
  mirrored?: boolean;
}

// Hand skeleton connections (pairs of joint indices)
const HAND_CONNECTIONS: [string, string][] = [
  ['wrist', 'thumb_cmc'],
  ['thumb_cmc', 'thumb_mcp'],
  ['thumb_mcp', 'thumb_ip'],
  ['thumb_ip', 'thumb_tip'],
  
  ['wrist', 'index_finger_mcp'],
  ['index_finger_mcp', 'index_finger_pip'],
  ['index_finger_pip', 'index_finger_dip'],
  ['index_finger_dip', 'index_finger_tip'],
  
  ['wrist', 'middle_finger_mcp'],
  ['middle_finger_mcp', 'middle_finger_pip'],
  ['middle_finger_pip', 'middle_finger_dip'],
  ['middle_finger_dip', 'middle_finger_tip'],
  
  ['wrist', 'ring_finger_mcp'],
  ['ring_finger_mcp', 'ring_finger_pip'],
  ['ring_finger_pip', 'ring_finger_dip'],
  ['ring_finger_dip', 'ring_finger_tip'],
  
  ['wrist', 'pinky_mcp'],
  ['pinky_mcp', 'pinky_pip'],
  ['pinky_pip', 'pinky_dip'],
  ['pinky_dip', 'pinky_tip'],
  
  // Palm connections
  ['index_finger_mcp', 'middle_finger_mcp'],
  ['middle_finger_mcp', 'ring_finger_mcp'],
  ['ring_finger_mcp', 'pinky_mcp'],
];

export function CanvasOverlay({
  width,
  height,
  userKeypoints,
  ghostKeypoints,
  worstJoints,
  mirrored = true
}: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Apply mirroring
    if (mirrored) {
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // Draw ghost skeleton first (behind user)
    if (ghostKeypoints) {
      drawSkeleton(ctx, ghostKeypoints, {
        jointColor: 'rgba(0, 212, 255, 0.7)',
        jointGlow: 'rgba(0, 212, 255, 0.4)',
        boneColor: 'rgba(0, 212, 255, 0.5)',
        jointRadius: 8,
        boneWidth: 4,
        glowRadius: 16
      });
    }

    // Draw user skeleton on top
    if (userKeypoints) {
      drawSkeleton(ctx, userKeypoints, {
        jointColor: 'rgba(255, 255, 255, 0.9)',
        jointGlow: 'rgba(255, 255, 255, 0.3)',
        boneColor: 'rgba(255, 255, 255, 0.6)',
        jointRadius: 6,
        boneWidth: 3,
        glowRadius: 12,
        highlightJoints: worstJoints,
        highlightColor: '#EF4444',
        highlightGlow: 'rgba(239, 68, 68, 0.5)'
      });
    }

    if (mirrored) {
      ctx.restore();
    }
  }, [width, height, userKeypoints, ghostKeypoints, worstJoints, mirrored]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
    />
  );
}

interface SkeletonStyle {
  jointColor: string;
  jointGlow: string;
  boneColor: string;
  jointRadius: number;
  boneWidth: number;
  glowRadius: number;
  highlightJoints?: string[];
  highlightColor?: string;
  highlightGlow?: string;
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  keypoints: HandKeypoints,
  style: SkeletonStyle
) {
  const kp = keypoints as Record<string, Keypoint>;
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  // Draw bones (connections)
  ctx.strokeStyle = style.boneColor;
  ctx.lineWidth = style.boneWidth;
  ctx.lineCap = 'round';

  for (const [joint1, joint2] of HAND_CONNECTIONS) {
    const p1 = kp[joint1];
    const p2 = kp[joint2];
    if (!p1 || !p2) continue;
    if (p1.confidence < 0.5 || p2.confidence < 0.5) continue;

    ctx.beginPath();
    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
    ctx.stroke();
  }

  // Draw joints
  for (const [jointName, point] of Object.entries(kp)) {
    if (point.confidence < 0.5) continue;

    const x = point.x * width;
    const y = point.y * height;

    const isHighlighted = style.highlightJoints?.includes(jointName);
    const color = isHighlighted ? style.highlightColor! : style.jointColor;
    const glow = isHighlighted ? style.highlightGlow! : style.jointGlow;

    // Glow effect
    ctx.beginPath();
    ctx.arc(x, y, style.glowRadius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, style.glowRadius);
    gradient.addColorStop(0, glow);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Joint circle
    ctx.beginPath();
    ctx.arc(x, y, style.jointRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Pulsing ring for highlighted joints
    if (isHighlighted) {
      ctx.beginPath();
      ctx.arc(x, y, style.jointRadius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = style.highlightColor!;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}
```

---

### 5. Score Display

Animated circular score meter.

#### File: `src/components/ScoreDisplay.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';

interface ScoreDisplayProps {
  score: number;
  size?: number;
  className?: string;
}

export function ScoreDisplay({ score, size = 160, className }: ScoreDisplayProps) {
  const [displayScore, setDisplayScore] = useState(0);
  
  // Smooth score animation
  useEffect(() => {
    const diff = score - displayScore;
    if (Math.abs(diff) < 1) {
      setDisplayScore(score);
      return;
    }
    
    const timer = setTimeout(() => {
      setDisplayScore(prev => prev + diff * 0.2);
    }, 16);
    
    return () => clearTimeout(timer);
  }, [score, displayScore]);

  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;
  
  // Color based on score
  const getColor = () => {
    if (displayScore >= 80) return '#22C55E'; // Green
    if (displayScore >= 60) return '#00D4FF'; // Cyan
    if (displayScore >= 40) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const color = getColor();

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Background circle */}
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="8"
        />
        
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.3s ease-out, stroke 0.3s ease-out',
            filter: `drop-shadow(0 0 8px ${color})`
          }}
        />
      </svg>
      
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className="text-4xl font-bold font-outfit score-display"
          style={{ color }}
        >
          {Math.round(displayScore)}
        </span>
        <span className="text-xs text-text-secondary uppercase tracking-wider">
          Alignment
        </span>
      </div>
      
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-full opacity-20 blur-xl"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
```

---

### 6. Cue Display

Animated coaching cue popup.

#### File: `src/components/CueDisplay.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CueDisplayProps {
  cue: string | null;
  className?: string;
}

export function CueDisplay({ cue, className }: CueDisplayProps) {
  const [displayCue, setDisplayCue] = useState<string | null>(null);

  useEffect(() => {
    if (cue) {
      setDisplayCue(cue);
      
      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        setDisplayCue(null);
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [cue]);

  return (
    <AnimatePresence>
      {displayCue && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`glass-card px-6 py-4 ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
              <span className="text-xl">💡</span>
            </div>
            <p className="text-lg font-medium text-text-primary">
              {displayCue}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

### 7. Eleven Labs Voice Integration

#### File: `src/services/elevenlabs.ts`

```typescript
const ELEVEN_LABS_API_KEY = process.env.NEXT_PUBLIC_ELEVEN_LABS_API_KEY;

// Rachel voice - warm and encouraging
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM';  

interface VoiceOptions {
  stability?: number;     // 0-1, lower = more expressive
  similarity_boost?: number;  // 0-1, higher = more similar to original
}

export async function speakCue(
  text: string,
  options: VoiceOptions = {}
): Promise<void> {
  const { stability = 0.5, similarity_boost = 0.75 } = options;

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVEN_LABS_API_KEY!
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability,
            similarity_boost
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Eleven Labs error: ${response.status}`);
    }

    // Stream audio
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    await audio.play();
    
    // Cleanup
    audio.onended = () => URL.revokeObjectURL(audioUrl);
  } catch (error) {
    console.error('Voice synthesis error:', error);
    // Fallback to browser TTS
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }
}

// Preload common cues for faster playback (optional)
const CUE_CACHE = new Map<string, string>();

export async function prefetchCue(text: string): Promise<void> {
  if (CUE_CACHE.has(text)) return;
  
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVEN_LABS_API_KEY!
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1'
        })
      }
    );

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    CUE_CACHE.set(text, url);
  } catch (error) {
    console.error('Prefetch error:', error);
  }
}
```

---

### 8. Voice Commands Hook

#### File: `src/hooks/useVoiceCommands.ts`

```typescript
import { useEffect, useCallback, useRef, useState } from 'react';

type CommandHandler = () => void;

interface VoiceCommandsOptions {
  commands: Record<string, CommandHandler>;
  continuous?: boolean;
}

export function useVoiceCommands({ commands, continuous = true }: VoiceCommandsOptions) {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = continuous;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();
      
      // Match commands
      for (const [trigger, handler] of Object.entries(commands)) {
        if (transcript.includes(trigger.toLowerCase())) {
          setLastCommand(trigger);
          handler();
          break;
        }
      }
    };

    recognition.onend = () => {
      if (continuous && isListening) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [commands, continuous, isListening]);

  const startListening = useCallback(() => {
    recognitionRef.current?.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return {
    isListening,
    lastCommand,
    startListening,
    stopListening
  };
}

// Example usage:
// const { isListening, startListening } = useVoiceCommands({
//   commands: {
//     'loop': () => toggleLoop(),
//     'explain': () => requestExplanation(),
//     'slow down': () => slowGhost(),
//     'stop': () => stopSession()
//   }
// });
```

---

### 9. Loop Controls Component

#### File: `src/components/LoopControls.tsx`

```tsx
'use client';

import { useState } from 'react';

interface LoopSegment {
  id: string;
  name: string;
  startFrame: number;
  endFrame: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface LoopControlsProps {
  segments: LoopSegment[];
  activeSegment: string | null;
  isLooping: boolean;
  onSegmentSelect: (id: string) => void;
  onLoopToggle: () => void;
  className?: string;
}

const DIFFICULTY_COLORS = {
  easy: 'bg-success-500',
  medium: 'bg-warning-500',
  hard: 'bg-error-500'
};

export function LoopControls({
  segments,
  activeSegment,
  isLooping,
  onSegmentSelect,
  onLoopToggle,
  className
}: LoopControlsProps) {
  return (
    <div className={`glass-card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
          Micro-Drills
        </h3>
        <button
          onClick={onLoopToggle}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            isLooping
              ? 'bg-primary-500 text-white glow-primary'
              : 'bg-white/10 text-text-secondary hover:bg-white/20'
          }`}
        >
          {isLooping ? '🔁 Looping' : '▶️ Play Once'}
        </button>
      </div>
      
      <div className="flex gap-2 flex-wrap">
        {segments.map((segment) => (
          <button
            key={segment.id}
            onClick={() => onSegmentSelect(segment.id)}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSegment === segment.id
                ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500'
                : 'bg-white/5 text-text-secondary hover:bg-white/10'
            }`}
          >
            <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${DIFFICULTY_COLORS[segment.difficulty]}`} />
            {segment.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

### 10. Session Page (Main Practice View)

#### File: `src/app/session/page.tsx`

```tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Camera } from '@/components/Camera';
import { CanvasOverlay } from '@/components/CanvasOverlay';
import { ScoreDisplay } from '@/components/ScoreDisplay';
import { CueDisplay } from '@/components/CueDisplay';
import { LoopControls } from '@/components/LoopControls';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { speakCue } from '@/services/elevenlabs';
import { 
  MediaPipeDetector,
  SpatialAligner,
  calculateFrameScore,
  ScoreSmoother,
  CueMapper,
  type HandKeypoints,
  type FrameKeypoints
} from '@/lib/cv';

// Sample expert keypoints (would be loaded from backend in real app)
import expertData from '@/data/lesson_hello.json';

export default function SessionPage() {
  const [score, setScore] = useState(0);
  const [currentCue, setCurrentCue] = useState<string | null>(null);
  const [worstJoints, setWorstJoints] = useState<string[]>([]);
  const [userKeypoints, setUserKeypoints] = useState<HandKeypoints | null>(null);
  const [ghostKeypoints, setGhostKeypoints] = useState<HandKeypoints | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [activeSegment, setActiveSegment] = useState<string | null>('intro');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<MediaPipeDetector | null>(null);
  const alignerRef = useRef<SpatialAligner>(new SpatialAligner());
  const scorerRef = useRef<ScoreSmoother>(new ScoreSmoother(0.25));
  const cueMapperRef = useRef<CueMapper>(new CueMapper('sign_language'));
  const frameIndexRef = useRef(0);
  const lastCueTimeRef = useRef(0);

  // Voice commands
  const { isListening, startListening } = useVoiceCommands({
    commands: {
      'loop': () => setIsLooping(prev => !prev),
      'explain': () => requestExplanation(),
      'slow': () => console.log('Slow down ghost'),
      'stop': () => window.location.href = '/'
    }
  });

  // Process each frame
  const onKeypointsDetected = useCallback((frame: FrameKeypoints) => {
    const userHand = frame.rightHand || frame.leftHand;
    if (!userHand) return;

    setUserKeypoints(userHand);

    // Get current expert frame
    const expertFrame = expertData.frames[frameIndexRef.current];
    if (!expertFrame) return;

    const expertHand = expertFrame.keypoints as HandKeypoints;

    // Align ghost to user
    const aligned = alignerRef.current.align(expertHand, userHand);
    setGhostKeypoints(aligned.aligned);

    // Calculate score
    const frameScore = calculateFrameScore(userHand, aligned.aligned);
    const smoothedScore = scorerRef.current.update(frameScore.overallScore);
    setScore(smoothedScore);
    setWorstJoints(frameScore.worstJoints);

    // Generate cue (throttle to every 3 seconds)
    const now = Date.now();
    if (now - lastCueTimeRef.current > 3000 && smoothedScore < 70) {
      const cues = cueMapperRef.current.generateCues(frameScore, userHand, aligned.aligned);
      if (cues.length > 0) {
        const cue = cues[0].cueText;
        setCurrentCue(cue);
        speakCue(cue);
        lastCueTimeRef.current = now;
      }
    }

    // Advance frame
    frameIndexRef.current = (frameIndexRef.current + 1) % expertData.frames.length;
  }, []);

  // Initialize detector when video is ready
  const onVideoReady = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video;
    
    const detector = new MediaPipeDetector(onKeypointsDetected);
    detectorRef.current = detector;

    // Start processing loop
    const processFrame = async () => {
      if (videoRef.current && detectorRef.current) {
        await detectorRef.current.processFrame(videoRef.current);
      }
      requestAnimationFrame(processFrame);
    };
    processFrame();

    // Start voice commands
    startListening();
  }, [onKeypointsDetected, startListening]);

  const requestExplanation = async () => {
    // Call backend for detailed explanation
    const res = await fetch('/api/coaching/explain', {
      method: 'POST',
      body: JSON.stringify({
        joint: worstJoints[0] || 'wrist',
        error_type: 'position',
        magnitude: 100 - score,
        pack_context: 'sign_language'
      })
    });
    const data = await res.json();
    setCurrentCue(data.explanation);
    speakCue(data.explanation);
  };

  const segments = [
    { id: 'intro', name: 'Hello', startFrame: 0, endFrame: 30, difficulty: 'easy' as const },
    { id: 'wave', name: 'Wave', startFrame: 31, endFrame: 60, difficulty: 'medium' as const },
    { id: 'goodbye', name: 'Goodbye', startFrame: 61, endFrame: 90, difficulty: 'hard' as const }
  ];

  return (
    <div className="min-h-screen bg-bg-primary p-4 lg:p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-outfit text-glow text-primary-400">
            SecondHand
          </h1>
          <p className="text-text-secondary text-sm">Sign Language Pack</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            isListening ? 'bg-success-500/20 text-success-500' : 'bg-white/10 text-text-secondary'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-success-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-sm">Voice {isListening ? 'Active' : 'Off'}</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="grid lg:grid-cols-[1fr,320px] gap-6">
        {/* Camera + Overlay */}
        <div className="relative aspect-video rounded-2xl overflow-hidden gradient-border">
          <Camera onVideoReady={onVideoReady} className="w-full h-full" />
          <CanvasOverlay
            width={1280}
            height={720}
            userKeypoints={userKeypoints}
            ghostKeypoints={ghostKeypoints}
            worstJoints={worstJoints}
          />
          
          {/* Cue overlay */}
          <CueDisplay cue={currentCue} className="absolute bottom-4 left-4 right-4" />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Score */}
          <div className="glass-card p-6 flex justify-center">
            <ScoreDisplay score={score} size={180} />
          </div>

          {/* Loop controls */}
          <LoopControls
            segments={segments}
            activeSegment={activeSegment}
            isLooping={isLooping}
            onSegmentSelect={setActiveSegment}
            onLoopToggle={() => setIsLooping(prev => !prev)}
          />

          {/* Voice commands hint */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Voice Commands</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <code className="bg-white/5 px-2 py-1 rounded">"Loop"</code>
              <code className="bg-white/5 px-2 py-1 rounded">"Explain"</code>
              <code className="bg-white/5 px-2 py-1 rounded">"Slow"</code>
              <code className="bg-white/5 px-2 py-1 rounded">"Stop"</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 11. Landing Page

#### File: `src/app/page.tsx`

```tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const PACKS = [
  { id: 'sign-language', name: 'Sign Language', emoji: '🤟', status: 'ready' },
  { id: 'cpr', name: 'CPR Training', emoji: '❤️', status: 'coming' },
  { id: 'piano', name: 'Piano Technique', emoji: '🎹', status: 'coming' },
  { id: 'sports', name: 'Sports Form', emoji: '⚡', status: 'coming' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-7xl font-bold font-outfit mb-4">
            <span className="text-glow text-primary-400">Second</span>
            <span className="text-white">Hand</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Learn physical skills from invisible teachers.
            <br />
            <span className="text-primary-400">Match the ghost. Master the movement.</span>
          </p>
        </motion.div>

        {/* Pack selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full"
        >
          {PACKS.map((pack) => (
            <Link
              key={pack.id}
              href={pack.status === 'ready' ? '/session' : '#'}
              className={`glass-card p-6 text-center transition-all ${
                pack.status === 'ready'
                  ? 'hover:scale-105 hover:glow-primary cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="text-4xl mb-3">{pack.emoji}</div>
              <h3 className="font-medium text-white mb-1">{pack.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                pack.status === 'ready' 
                  ? 'bg-success-500/20 text-success-500'
                  : 'bg-white/10 text-text-secondary'
              }`}>
                {pack.status === 'ready' ? 'Start' : 'Coming Soon'}
              </span>
            </Link>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-text-secondary text-sm">
        Built with 💜 for McHacks 13
      </footer>
    </div>
  );
}
```

---

## Integration Points

### With Person 1 (Backend):
- Call `/api/lessons` to get lesson metadata
- Call `/api/coaching/cue` for NLP-polished cues (optional)
- Call `/api/coaching/explain` when user says "explain"

### With Person 2 (CV Lead):
- Import their modules from `@/lib/cv`
- Use `MediaPipeDetector`, `SpatialAligner`, `calculateFrameScore`, etc.
- They'll tell you the keypoint data format

---

## Commands to Get Started

```bash
cd /Users/adityaranjan/Documents/mchacks13

# Create Next.js app
npx -y create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Install dependencies
npm install framer-motion zustand @mediapipe/hands @mediapipe/camera_utils

# Add Eleven Labs key to .env.local
echo "NEXT_PUBLIC_ELEVEN_LABS_API_KEY=sk_3afeb9ee67a61c3b28703ac6e98e244056d0664d631ffdac" >> .env.local

# Run dev server
npm run dev
```

---

## Success Criteria

1. ✅ Landing page looks STUNNING (dark, glowing, premium)
2. ✅ Camera capture works reliably
3. ✅ Ghost skeleton renders smoothly over user
4. ✅ Score animates in response to alignment
5. ✅ Coaching cues appear and speak via Eleven Labs
6. ✅ Loop controls work for micro-drills
7. ✅ Voice commands work (at least "loop" and "explain")

---

## Timeline

| Hour | Task |
|------|------|
| 0-2 | Next.js setup + global styles + Camera component |
| 2-4 | Canvas overlay + ghost rendering |
| 4-6 | Score display + cue display + loop controls |
| 6-8 | Eleven Labs voice + voice commands |
| 8+ | Polish animations, test demo flow, fix bugs |

---

**YOU ARE THE FACE OF THE PRODUCT. IF IT LOOKS BAD, WE LOSE. MAKE IT BEAUTIFUL.**
