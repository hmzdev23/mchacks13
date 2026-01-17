# PERSON 3: Frontend + UX Agent Prompt

## MISSION
You are building the **premium frontend experience** for SecondHand. Your job is to create a jaw-dropping, futuristic UI with buttery-smooth animations, dark glassmorphism, and seamless voice feedback integration.

---

## DIRECTORY STRUCTURE TO CREATE
```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing
│   │   ├── globals.css
│   │   ├── session/
│   │   │   └── page.tsx          # Main session
│   │   └── calibrate/
│   │       └── page.tsx          # Calibration
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── ProgressRing.tsx
│   │   ├── camera/
│   │   │   ├── CameraView.tsx
│   │   │   └── MirrorToggle.tsx
│   │   ├── ghost/
│   │   │   ├── GhostRenderer.tsx
│   │   │   ├── SkeletonOverlay.tsx
│   │   │   └── JointGlow.tsx
│   │   ├── feedback/
│   │   │   ├── ScoreDisplay.tsx
│   │   │   ├── CueOverlay.tsx
│   │   │   └── TrendMeter.tsx
│   │   ├── coach/
│   │   │   ├── VoiceCoach.tsx
│   │   │   └── VoiceWave.tsx
│   │   └── session/
│   │       ├── LoopControls.tsx
│   │       └── PackSelector.tsx
│   ├── stores/
│   │   ├── sessionStore.ts
│   │   └── settingsStore.ts
│   └── hooks/
│       ├── useVoiceCommands.ts
│       └── useAudioFeedback.ts
├── public/
│   └── sounds/
│       ├── success.mp3
│       └── hint.mp3
├── package.json
├── tailwind.config.ts
└── next.config.js
```

---

## SETUP COMMANDS
```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir
cd frontend
npm install framer-motion zustand @mediapipe/hands @mediapipe/camera_utils
npm install lucide-react clsx tailwind-merge
```

---

## FILE: tailwind.config.ts
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          900: '#0c4a6e',
        },
        ghost: {
          DEFAULT: 'rgba(56, 189, 248, 0.6)',
          glow: 'rgba(56, 189, 248, 0.3)',
        },
        glass: {
          DEFAULT: 'rgba(15, 23, 42, 0.7)',
          light: 'rgba(30, 41, 59, 0.5)',
          border: 'rgba(148, 163, 184, 0.1)',
        },
      },
      backdropBlur: {
        glass: '20px',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'score-pop': 'scorePop 0.3s ease-out',
        'voice-wave': 'voiceWave 1.5s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        scorePop: {
          '0%': { transform: 'scale(0.8)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        voiceWave: {
          '0%, 100%': { height: '4px' },
          '50%': { height: '20px' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## FILE: src/app/globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --ghost-color: rgba(56, 189, 248, 0.6);
  --error-glow: rgba(239, 68, 68, 0.8);
  --success-glow: rgba(34, 197, 94, 0.8);
}

body {
  @apply bg-slate-950 text-white antialiased;
  background: radial-gradient(ellipse at top, #0f172a 0%, #020617 100%);
  min-height: 100vh;
}

/* Glassmorphism base */
.glass {
  @apply bg-glass backdrop-blur-glass border border-glass-border rounded-2xl;
}

.glass-light {
  @apply bg-glass-light backdrop-blur-glass border border-glass-border rounded-xl;
}

/* Ghost skeleton styling */
.ghost-skeleton line {
  stroke: var(--ghost-color);
  stroke-width: 3;
  stroke-linecap: round;
  filter: drop-shadow(0 0 8px var(--ghost-color));
}

.ghost-skeleton circle {
  fill: var(--ghost-color);
  filter: drop-shadow(0 0 6px var(--ghost-color));
}

/* Error joint glow */
.joint-error {
  fill: var(--error-glow);
  filter: drop-shadow(0 0 12px var(--error-glow));
  animation: pulseGlow 1s ease-in-out infinite;
}

/* Score number styling */
.score-text {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
```

---

## FILE: src/app/page.tsx (Landing)
```tsx
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Play, Zap, Target } from 'lucide-react';

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-3xl"
      >
        {/* Logo/Brand */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-primary-400 via-cyan-300 to-primary-500 bg-clip-text text-transparent">
            SecondHand
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 mt-4 font-light">
            Learn physical skills from invisible teachers
          </p>
        </motion.div>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {[
            { icon: <Zap className="w-4 h-4" />, text: 'Real-time Feedback' },
            { icon: <Target className="w-4 h-4" />, text: 'AI Voice Coaching' },
          ].map((feature, i) => (
            <span
              key={i}
              className="glass-light px-4 py-2 flex items-center gap-2 text-sm text-slate-300"
            >
              {feature.icon}
              {feature.text}
            </span>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Link
            href="/session"
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-full text-lg font-semibold transition-all hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/30"
          >
            <Play className="w-6 h-6" />
            Start Learning
            <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </motion.div>
      </motion.div>

      {/* Floating orbs decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>
    </main>
  );
}
```

---

## FILE: src/components/ghost/GhostRenderer.tsx
```tsx
'use client';

import { useRef, useEffect } from 'react';
import type { Keypoint, Transform2D } from '@/lib/types/keypoints';

interface GhostRendererProps {
  expertKeypoints: Keypoint[];
  userKeypoints: Keypoint[];
  transform: Transform2D;
  topErrorJoints: string[];
  width: number;
  height: number;
}

// Hand skeleton connections
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],     // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],     // Index
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17],          // Palm
];

export function GhostRenderer({
  expertKeypoints,
  userKeypoints,
  transform,
  topErrorJoints,
  width,
  height,
}: GhostRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Apply transform and draw ghost skeleton
    const transformed = expertKeypoints.map((kp) => ({
      ...kp,
      x: kp.x * transform.scale + transform.translateX,
      y: kp.y * transform.scale + transform.translateY,
    }));

    // Draw ghost connections
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
    ctx.shadowBlur = 12;

    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const start = transformed[startIdx];
      const end = transformed[endIdx];
      if (!start || !end) continue;

      ctx.beginPath();
      ctx.moveTo(start.x * width, start.y * height);
      ctx.lineTo(end.x * width, end.y * height);
      ctx.stroke();
    }

    // Draw ghost joints
    for (const kp of transformed) {
      const isError = topErrorJoints.includes(kp.name);
      
      ctx.beginPath();
      ctx.arc(kp.x * width, kp.y * height, isError ? 10 : 6, 0, Math.PI * 2);
      
      if (isError) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.shadowColor = 'rgba(239, 68, 68, 1)';
        ctx.shadowBlur = 16;
      } else {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
        ctx.shadowBlur = 8;
      }
      
      ctx.fill();
    }

    // Draw user skeleton (optional - fainter)
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 4;

    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const start = userKeypoints[startIdx];
      const end = userKeypoints[endIdx];
      if (!start || !end) continue;

      ctx.beginPath();
      ctx.moveTo(start.x * width, start.y * height);
      ctx.lineTo(end.x * width, end.y * height);
      ctx.stroke();
    }
  }, [expertKeypoints, userKeypoints, transform, topErrorJoints, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
    />
  );
}
```

---

## FILE: src/components/feedback/ScoreDisplay.tsx
```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

interface ScoreDisplayProps {
  score: number;
  trend?: 'up' | 'down' | 'stable';
}

export function ScoreDisplay({ score, trend = 'stable' }: ScoreDisplayProps) {
  const color = useMemo(() => {
    if (score >= 85) return 'from-emerald-400 to-green-500';
    if (score >= 70) return 'from-amber-400 to-yellow-500';
    return 'from-red-400 to-rose-500';
  }, [score]);

  const glowColor = useMemo(() => {
    if (score >= 85) return 'shadow-emerald-500/50';
    if (score >= 70) return 'shadow-amber-500/50';
    return 'shadow-red-500/50';
  }, [score]);

  return (
    <motion.div
      className="glass p-6 min-w-[180px]"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <div className="text-center">
        <span className="text-sm text-slate-400 uppercase tracking-wider">
          Alignment
        </span>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={score}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className={`text-6xl font-bold score-text bg-gradient-to-r ${color} bg-clip-text text-transparent mt-2`}
          >
            {score}
          </motion.div>
        </AnimatePresence>

        {/* Progress Ring */}
        <div className={`mt-4 mx-auto w-32 h-2 rounded-full bg-slate-800 overflow-hidden shadow-lg ${glowColor}`}>
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${color}`}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ type: 'spring', stiffness: 50 }}
          />
        </div>

        {/* Trend indicator */}
        {trend !== 'stable' && (
          <motion.span
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`inline-block mt-2 text-sm ${
              trend === 'up' ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {trend === 'up' ? '↑ Improving' : '↓ Focus here'}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
```

---

## FILE: src/components/feedback/CueOverlay.tsx
```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface CueOverlayProps {
  cue: string | null;
  isVoicePlaying?: boolean;
}

export function CueOverlay({ cue, isVoicePlaying }: CueOverlayProps) {
  return (
    <AnimatePresence>
      {cue && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
        >
          <div className="glass px-8 py-4 flex items-center gap-4 max-w-xl">
            {isVoicePlaying && (
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-primary-400 rounded-full"
                    animate={{ height: ['4px', '20px', '4px'] }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
            )}
            
            <motion.p
              className="text-xl font-medium text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {cue}
            </motion.p>
            
            <Sparkles className="w-5 h-5 text-primary-400 animate-pulse" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## FILE: src/components/coach/VoiceCoach.tsx
```tsx
'use client';

import { useRef, useCallback, useState } from 'react';

interface VoiceCoachProps {
  onCueReceived: (cue: string) => void;
  backendUrl: string;
}

export function useVoiceCoach({ backendUrl }: { backendUrl: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const speak = useCallback(async (text: string) => {
    try {
      const response = await fetch(`${backendUrl}/api/voice/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('TTS failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      audioRef.current = new Audio(audioUrl);
      audioRef.current.onplay = () => setIsPlaying(true);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audioRef.current.play();
    } catch (error) {
      console.error('Voice coach error:', error);
      setIsPlaying(false);
    }
  }, [backendUrl]);

  return { speak, isPlaying };
}
```

---

## FILE: src/hooks/useVoiceCommands.ts
```tsx
'use client';

import { useEffect, useCallback, useState } from 'react';

type VoiceCommand = 'start' | 'stop' | 'loop' | 'explain' | 'slow' | 'next';

interface UseVoiceCommandsProps {
  onCommand: (command: VoiceCommand) => void;
  enabled?: boolean;
}

export function useVoiceCommands({ onCommand, enabled = true }: UseVoiceCommandsProps) {
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript.toLowerCase().trim();

      // Parse commands
      if (transcript.includes('start')) onCommand('start');
      else if (transcript.includes('stop')) onCommand('stop');
      else if (transcript.includes('loop')) onCommand('loop');
      else if (transcript.includes('explain') || transcript.includes('what')) onCommand('explain');
      else if (transcript.includes('slow')) onCommand('slow');
      else if (transcript.includes('next')) onCommand('next');
    };

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      if (enabled) recognition.start(); // Auto-restart
    };

    recognition.start();

    return () => recognition.stop();
  }, [enabled, onCommand]);

  return { isListening };
}
```

---

## FILE: src/stores/sessionStore.ts
```typescript
import { create } from 'zustand';
import type { Keypoint, ErrorVector } from '@/lib/types/keypoints';

interface SessionState {
  // State
  isActive: boolean;
  score: number;
  currentCue: string | null;
  isLooping: boolean;
  loopSegment: [number, number] | null;
  
  // User data
  userKeypoints: Keypoint[];
  errors: ErrorVector[];
  scoreHistory: number[];
  
  // Actions
  setActive: (active: boolean) => void;
  setScore: (score: number) => void;
  setCue: (cue: string | null) => void;
  setUserKeypoints: (keypoints: Keypoint[]) => void;
  setErrors: (errors: ErrorVector[]) => void;
  toggleLoop: () => void;
  setLoopSegment: (segment: [number, number] | null) => void;
  addScoreToHistory: (score: number) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  isActive: false,
  score: 0,
  currentCue: null,
  isLooping: false,
  loopSegment: null,
  userKeypoints: [],
  errors: [],
  scoreHistory: [],

  setActive: (active) => set({ isActive: active }),
  setScore: (score) => set({ score }),
  setCue: (cue) => set({ currentCue: cue }),
  setUserKeypoints: (keypoints) => set({ userKeypoints: keypoints }),
  setErrors: (errors) => set({ errors }),
  toggleLoop: () => set((s) => ({ isLooping: !s.isLooping })),
  setLoopSegment: (segment) => set({ loopSegment: segment }),
  addScoreToHistory: (score) => 
    set((s) => ({ scoreHistory: [...s.scoreHistory.slice(-20), score] })),
  reset: () => set({
    isActive: false,
    score: 0,
    currentCue: null,
    isLooping: false,
    userKeypoints: [],
    errors: [],
    scoreHistory: [],
  }),
}));
```

---

## FILE: src/app/session/page.tsx
```tsx
'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GhostRenderer } from '@/components/ghost/GhostRenderer';
import { ScoreDisplay } from '@/components/feedback/ScoreDisplay';
import { CueOverlay } from '@/components/feedback/CueOverlay';
import { useSessionStore } from '@/stores/sessionStore';
import { useVoiceCoach } from '@/components/coach/VoiceCoach';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';

// Import hooks from Person 2's code
// import { useMediaPipe } from '@/lib/hooks/useMediaPipe';
// import { useAlignment } from '@/lib/hooks/useAlignment';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function SessionPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1280, height: 720 });
  
  const { score, currentCue, errors, setScore, setCue, setErrors } = useSessionStore();
  const { speak, isPlaying } = useVoiceCoach({ backendUrl: BACKEND_URL });

  // Voice commands
  useVoiceCommands({
    enabled: true,
    onCommand: async (cmd) => {
      if (cmd === 'explain') {
        // Request AI explanation from backend
        const response = await fetch(`${BACKEND_URL}/api/coach/cue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error_vectors: errors.map(e => ({
              name: e.jointName,
              delta_x: e.deltaX,
              delta_y: e.deltaY,
              angle_diff: e.angleDiff,
              confidence: e.confidence,
            })),
            max_error_joint: errors[0]?.jointName || 'wrist',
            overall_score: score,
          }),
        });
        const data = await response.json();
        setCue(data.cue);
        speak(data.cue);
      }
    },
  });

  // Camera setup
  useEffect(() => {
    async function setupCamera() {
      if (!videoRef.current) return;
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
      });
      videoRef.current.srcObject = stream;
    }
    
    setupCamera();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 overflow-hidden">
      {/* Camera container */}
      <div className="relative w-full h-screen">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
        />

        {/* Ghost overlay canvas - connects to Person 2's code */}
        <GhostRenderer
          expertKeypoints={[]} // Load from JSON
          userKeypoints={[]}   // From MediaPipe
          transform={{ translateX: 0, translateY: 0, scale: 1, rotation: 0 }}
          topErrorJoints={errors.slice(0, 3).map(e => e.jointName)}
          width={dimensions.width}
          height={dimensions.height}
        />

        {/* UI Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Score display - top right */}
          <motion.div
            className="absolute top-8 right-8 pointer-events-auto"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <ScoreDisplay score={score} />
          </motion.div>

          {/* Cue overlay - bottom center */}
          <CueOverlay cue={currentCue} isVoicePlaying={isPlaying} />
        </div>
      </div>
    </main>
  );
}
```

---

## CRITICAL DESIGN REQUIREMENTS

1. **Dark Glassmorphism** - Every surface should have `backdrop-blur` and subtle borders
2. **Glow Effects** - Use `drop-shadow` with matching colors for neon feel
3. **Smooth Animations** - Framer Motion on all interactive elements
4. **Tabular Numbers** - Use `font-variant-numeric: tabular-nums` for score
5. **Color Coding** - Green (>85), Yellow (70-85), Red (<70) for scores
6. **Voice Feedback Visual** - Animated wave bars when TTS is playing
7. **Responsive** - Works on laptop cameras for demo

---

## INTEGRATION WITH PERSON 1 & 2

**From Person 2 (CV):**
- Import `useMediaPipe` hook for hand tracking
- Import `useAlignment` hook for score calculation
- Import `getDeterministicCue` for fallback cues

**From Person 1 (Backend):**
- POST to `/api/coach/cue` for AI coaching
- POST to `/api/voice/synthesize` for TTS audio
- Set `NEXT_PUBLIC_BACKEND_URL` in `.env.local`
