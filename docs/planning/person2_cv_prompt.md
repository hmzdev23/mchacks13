# PERSON 2: CV Engine + Algorithms Agent Prompt

## MISSION
You are building the **computer vision and alignment engine** for SecondHand. Your code makes the "ghost overlay" actually work - extracting user poses, aligning them to expert data, and calculating scores.

---

## DIRECTORY STRUCTURE TO CREATE
```
frontend/src/lib/
├── mediapipe/
│   ├── handTracker.ts      # Hand keypoint extraction
│   ├── poseTracker.ts      # Body pose extraction
│   ├── types.ts            # Shared types
│   └── smoothing.ts        # Temporal smoothing
├── alignment/
│   ├── spatialAlign.ts     # Anchor-based alignment
│   ├── temporalSync.ts     # Phase synchronization
│   ├── normalize.ts        # Keypoint normalization
│   ├── procrustes.ts       # Best-fit transform
│   └── scoring.ts          # Similarity calculation
├── feedback/
│   ├── cueMapper.ts        # Deterministic rule mapping
│   ├── errorAnalysis.ts    # Joint error vectors
│   └── driftDetector.ts    # Top-k problem joints
└── types/
    └── keypoints.ts        # Core type definitions
```

---

## FILE: lib/types/keypoints.ts
```typescript
export interface Keypoint {
  x: number;
  y: number;
  z?: number;
  confidence: number;
  name: string;
}

export interface NormalizedKeypoint extends Keypoint {
  normalizedX: number;
  normalizedY: number;
}

export interface HandLandmarks {
  landmarks: Keypoint[];
  handedness: 'Left' | 'Right';
  confidence: number;
}

export interface PoseLandmarks {
  landmarks: Keypoint[];
  confidence: number;
}

export interface FrameData {
  timestamp: number;
  hands: HandLandmarks[];
  pose?: PoseLandmarks;
}

export interface ErrorVector {
  jointName: string;
  deltaX: number;
  deltaY: number;
  angleDiff: number;
  magnitude: number;
  confidence: number;
}

export interface AlignmentResult {
  score: number;
  errors: ErrorVector[];
  topErrors: ErrorVector[];
  ghostTransform: Transform2D;
}

export interface Transform2D {
  translateX: number;
  translateY: number;
  scale: number;
  rotation: number;
}

// MediaPipe hand landmark indices
export const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20
} as const;

// Joint importance weights for scoring
export const JOINT_WEIGHTS: Record<string, number> = {
  wrist: 1.0,
  thumb_tip: 0.9,
  index_tip: 0.95,
  middle_tip: 0.9,
  ring_tip: 0.8,
  pinky_tip: 0.8,
  index_mcp: 0.7,
  middle_mcp: 0.7,
};
```

---

## FILE: lib/mediapipe/handTracker.ts
```typescript
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import type { HandLandmarks, Keypoint } from '../types/keypoints';

export class HandTracker {
  private hands: Hands;
  private camera: Camera | null = null;
  private onResults: ((hands: HandLandmarks[]) => void) | null = null;

  constructor() {
    this.hands = new Hands({
      locateFile: (file) => 
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    this.hands.onResults(this.processResults.bind(this));
  }

  private processResults(results: Results): void {
    if (!this.onResults) return;

    const hands: HandLandmarks[] = [];

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i];

        const keypoints: Keypoint[] = landmarks.map((lm, idx) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          confidence: lm.visibility ?? 1.0,
          name: this.getLandmarkName(idx),
        }));

        hands.push({
          landmarks: keypoints,
          handedness: handedness.label as 'Left' | 'Right',
          confidence: handedness.score,
        });
      }
    }

    this.onResults(hands);
  }

  private getLandmarkName(idx: number): string {
    const names = [
      'wrist',
      'thumb_cmc', 'thumb_mcp', 'thumb_ip', 'thumb_tip',
      'index_mcp', 'index_pip', 'index_dip', 'index_tip',
      'middle_mcp', 'middle_pip', 'middle_dip', 'middle_tip',
      'ring_mcp', 'ring_pip', 'ring_dip', 'ring_tip',
      'pinky_mcp', 'pinky_pip', 'pinky_dip', 'pinky_tip',
    ];
    return names[idx] || `landmark_${idx}`;
  }

  async start(
    videoElement: HTMLVideoElement,
    callback: (hands: HandLandmarks[]) => void
  ): Promise<void> {
    this.onResults = callback;

    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        await this.hands.send({ image: videoElement });
      },
      width: 1280,
      height: 720,
    });

    await this.camera.start();
  }

  stop(): void {
    this.camera?.stop();
    this.camera = null;
  }
}

export const handTracker = new HandTracker();
```

---

## FILE: lib/mediapipe/smoothing.ts
```typescript
import type { Keypoint } from '../types/keypoints';

export class EMASmoothing {
  private alpha: number;
  private history: Map<string, { x: number; y: number; z: number }> = new Map();

  constructor(alpha = 0.4) {
    this.alpha = alpha;
  }

  smooth(keypoints: Keypoint[]): Keypoint[] {
    return keypoints.map((kp) => {
      const key = kp.name;
      const prev = this.history.get(key);

      if (!prev) {
        this.history.set(key, { x: kp.x, y: kp.y, z: kp.z ?? 0 });
        return kp;
      }

      const smoothed = {
        x: this.alpha * kp.x + (1 - this.alpha) * prev.x,
        y: this.alpha * kp.y + (1 - this.alpha) * prev.y,
        z: this.alpha * (kp.z ?? 0) + (1 - this.alpha) * prev.z,
      };

      this.history.set(key, smoothed);

      return {
        ...kp,
        x: smoothed.x,
        y: smoothed.y,
        z: smoothed.z,
      };
    });
  }

  reset(): void {
    this.history.clear();
  }
}

export class ConfidenceGate {
  private threshold: number;

  constructor(threshold = 0.5) {
    this.threshold = threshold;
  }

  filter(keypoints: Keypoint[]): Keypoint[] {
    return keypoints.filter((kp) => kp.confidence >= this.threshold);
  }

  applyWeights(keypoints: Keypoint[]): Keypoint[] {
    return keypoints.map((kp) => ({
      ...kp,
      confidence: kp.confidence >= this.threshold ? kp.confidence : 0,
    }));
  }
}
```

---

## FILE: lib/alignment/normalize.ts
```typescript
import type { Keypoint, NormalizedKeypoint } from '../types/keypoints';

export function normalizeHandKeypoints(keypoints: Keypoint[]): NormalizedKeypoint[] {
  const wrist = keypoints.find((k) => k.name === 'wrist');
  const middleTip = keypoints.find((k) => k.name === 'middle_tip');

  if (!wrist || !middleTip) {
    throw new Error('Missing anchor points for normalization');
  }

  // Calculate scale using wrist to middle fingertip distance
  const scale = Math.sqrt(
    Math.pow(middleTip.x - wrist.x, 2) + 
    Math.pow(middleTip.y - wrist.y, 2)
  );

  if (scale < 0.01) {
    throw new Error('Scale too small for reliable normalization');
  }

  return keypoints.map((kp) => ({
    ...kp,
    normalizedX: (kp.x - wrist.x) / scale,
    normalizedY: (kp.y - wrist.y) / scale,
  }));
}

export function denormalizeKeypoints(
  normalized: NormalizedKeypoint[],
  targetWrist: { x: number; y: number },
  targetScale: number
): Keypoint[] {
  return normalized.map((kp) => ({
    ...kp,
    x: kp.normalizedX * targetScale + targetWrist.x,
    y: kp.normalizedY * targetScale + targetWrist.y,
  }));
}
```

---

## FILE: lib/alignment/spatialAlign.ts
```typescript
import type { Keypoint, Transform2D, NormalizedKeypoint } from '../types/keypoints';
import { normalizeHandKeypoints } from './normalize';

export function calculateSpatialAlignment(
  userKeypoints: Keypoint[],
  expertKeypoints: Keypoint[]
): Transform2D {
  const userWrist = userKeypoints.find((k) => k.name === 'wrist');
  const expertWrist = expertKeypoints.find((k) => k.name === 'wrist');

  if (!userWrist || !expertWrist) {
    return { translateX: 0, translateY: 0, scale: 1, rotation: 0 };
  }

  // Calculate scale factors
  const userMiddle = userKeypoints.find((k) => k.name === 'middle_tip');
  const expertMiddle = expertKeypoints.find((k) => k.name === 'middle_tip');

  let scale = 1;
  if (userMiddle && expertMiddle) {
    const userDist = distance(userWrist, userMiddle);
    const expertDist = distance(expertWrist, expertMiddle);
    scale = userDist / expertDist;
  }

  // Translation to align wrists
  const translateX = userWrist.x - expertWrist.x * scale;
  const translateY = userWrist.y - expertWrist.y * scale;

  return { translateX, translateY, scale, rotation: 0 };
}

export function applyTransform(
  keypoints: Keypoint[],
  transform: Transform2D
): Keypoint[] {
  return keypoints.map((kp) => ({
    ...kp,
    x: kp.x * transform.scale + transform.translateX,
    y: kp.y * transform.scale + transform.translateY,
  }));
}

function distance(a: Keypoint, b: Keypoint): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}
```

---

## FILE: lib/alignment/scoring.ts
```typescript
import type { Keypoint, ErrorVector } from '../types/keypoints';
import { JOINT_WEIGHTS } from '../types/keypoints';

const K_FACTOR = 50; // Error scaling factor

export function calculateSimilarityScore(
  user: Keypoint[],
  expert: Keypoint[]
): { score: number; errors: ErrorVector[] } {
  const errors: ErrorVector[] = [];
  let totalWeightedError = 0;
  let totalWeight = 0;

  for (const userKp of user) {
    const expertKp = expert.find((e) => e.name === userKp.name);
    if (!expertKp) continue;

    const deltaX = userKp.x - expertKp.x;
    const deltaY = userKp.y - expertKp.y;
    const posError = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Calculate angle difference for finger joints
    const angleDiff = calculateAngleDiff(userKp, expertKp, user, expert);

    const magnitude = posError * 0.6 + Math.abs(angleDiff) * 0.004;
    const weight = (JOINT_WEIGHTS[userKp.name] ?? 0.5) * userKp.confidence;

    errors.push({
      jointName: userKp.name,
      deltaX,
      deltaY,
      angleDiff,
      magnitude,
      confidence: userKp.confidence,
    });

    totalWeightedError += magnitude * weight;
    totalWeight += weight;
  }

  const avgError = totalWeight > 0 ? totalWeightedError / totalWeight : 0;
  const score = Math.max(0, Math.min(100, 100 - avgError * K_FACTOR));

  return { score, errors };
}

function calculateAngleDiff(
  userKp: Keypoint,
  expertKp: Keypoint,
  userAll: Keypoint[],
  expertAll: Keypoint[]
): number {
  // Find parent joint for angle calculation
  const parentMap: Record<string, string> = {
    thumb_tip: 'thumb_ip',
    index_tip: 'index_dip',
    middle_tip: 'middle_dip',
    ring_tip: 'ring_dip',
    pinky_tip: 'pinky_dip',
  };

  const parentName = parentMap[userKp.name];
  if (!parentName) return 0;

  const userParent = userAll.find((k) => k.name === parentName);
  const expertParent = expertAll.find((k) => k.name === parentName);

  if (!userParent || !expertParent) return 0;

  const userAngle = Math.atan2(userKp.y - userParent.y, userKp.x - userParent.x);
  const expertAngle = Math.atan2(expertKp.y - expertParent.y, expertKp.x - expertParent.x);

  return ((userAngle - expertAngle) * 180) / Math.PI;
}

export class ScoreSmoothing {
  private alpha: number;
  private value: number | null = null;

  constructor(alpha = 0.3) {
    this.alpha = alpha;
  }

  update(newScore: number): number {
    if (this.value === null) {
      this.value = newScore;
    } else {
      this.value = this.alpha * newScore + (1 - this.alpha) * this.value;
    }
    return Math.round(this.value);
  }

  reset(): void {
    this.value = null;
  }
}
```

---

## FILE: lib/feedback/cueMapper.ts
```typescript
import type { ErrorVector } from '../types/keypoints';

interface CueRule {
  condition: (errors: ErrorVector[], score: number) => boolean;
  getCue: (errors: ErrorVector[]) => string;
  priority: number;
}

const CUE_RULES: CueRule[] = [
  {
    priority: 1,
    condition: (errors) => {
      const wrist = errors.find((e) => e.jointName === 'wrist');
      return wrist ? Math.abs(wrist.angleDiff) > 15 : false;
    },
    getCue: (errors) => {
      const wrist = errors.find((e) => e.jointName === 'wrist')!;
      return wrist.angleDiff > 0 ? 'Rotate wrist left' : 'Rotate wrist right';
    },
  },
  {
    priority: 2,
    condition: (errors) => {
      const fingerTips = errors.filter((e) => e.jointName.includes('_tip'));
      const avgSpread = fingerTips.reduce((acc, e) => acc + e.magnitude, 0) / fingerTips.length;
      return avgSpread > 0.05;
    },
    getCue: () => 'Open your fingers wider',
  },
  {
    priority: 3,
    condition: (errors) => {
      const wrist = errors.find((e) => e.jointName === 'wrist');
      return wrist ? Math.abs(wrist.deltaY) > 0.08 : false;
    },
    getCue: (errors) => {
      const wrist = errors.find((e) => e.jointName === 'wrist')!;
      return wrist.deltaY > 0 ? 'Lower your hand' : 'Raise your hand';
    },
  },
  {
    priority: 4,
    condition: (errors) => {
      const wrist = errors.find((e) => e.jointName === 'wrist');
      return wrist ? Math.abs(wrist.deltaX) > 0.08 : false;
    },
    getCue: (errors) => {
      const wrist = errors.find((e) => e.jointName === 'wrist')!;
      return wrist.deltaX > 0 ? 'Move hand left' : 'Move hand right';
    },
  },
];

export function getDeterministicCue(errors: ErrorVector[], score: number): string | null {
  const applicableRules = CUE_RULES
    .filter((rule) => rule.condition(errors, score))
    .sort((a, b) => a.priority - b.priority);

  return applicableRules[0]?.getCue(errors) ?? null;
}

export function getTopErrorJoints(errors: ErrorVector[], k = 3): ErrorVector[] {
  return [...errors]
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, k);
}
```

---

## FILE: lib/feedback/errorAnalysis.ts
```typescript
import type { ErrorVector } from '../types/keypoints';

export interface AnalysisResult {
  maxErrorJoint: string;
  primaryIssue: 'position' | 'angle' | 'both';
  severity: 'minor' | 'moderate' | 'major';
  suggestion: string;
}

export function analyzeErrors(errors: ErrorVector[]): AnalysisResult {
  if (errors.length === 0) {
    return {
      maxErrorJoint: 'none',
      primaryIssue: 'position',
      severity: 'minor',
      suggestion: 'Looking good!',
    };
  }

  const sorted = [...errors].sort((a, b) => b.magnitude - a.magnitude);
  const worst = sorted[0];

  const posError = Math.sqrt(worst.deltaX ** 2 + worst.deltaY ** 2);
  const angleError = Math.abs(worst.angleDiff);

  let primaryIssue: 'position' | 'angle' | 'both';
  if (posError > 0.05 && angleError > 10) {
    primaryIssue = 'both';
  } else if (angleError > 10) {
    primaryIssue = 'angle';
  } else {
    primaryIssue = 'position';
  }

  let severity: 'minor' | 'moderate' | 'major';
  if (worst.magnitude > 0.1) {
    severity = 'major';
  } else if (worst.magnitude > 0.05) {
    severity = 'moderate';
  } else {
    severity = 'minor';
  }

  return {
    maxErrorJoint: worst.jointName,
    primaryIssue,
    severity,
    suggestion: generateSuggestion(worst, primaryIssue),
  };
}

function generateSuggestion(error: ErrorVector, issue: string): string {
  const joint = error.jointName.replace('_', ' ');
  
  if (issue === 'angle') {
    return `Adjust ${joint} rotation`;
  } else if (issue === 'position') {
    return `Reposition your ${joint}`;
  } else {
    return `Check your ${joint} form`;
  }
}
```

---

## HOOKS TO EXPORT (for frontend integration)

### useMediaPipe.ts
```typescript
import { useState, useEffect, useRef } from 'react';
import { HandTracker } from '../lib/mediapipe/handTracker';
import { EMASmoothing } from '../lib/mediapipe/smoothing';
import type { HandLandmarks } from '../lib/types/keypoints';

export function useMediaPipe(videoRef: React.RefObject<HTMLVideoElement>) {
  const [hands, setHands] = useState<HandLandmarks[]>([]);
  const [isReady, setIsReady] = useState(false);
  const trackerRef = useRef<HandTracker | null>(null);
  const smootherRef = useRef(new EMASmoothing(0.4));

  useEffect(() => {
    if (!videoRef.current) return;

    trackerRef.current = new HandTracker();
    
    trackerRef.current.start(videoRef.current, (detectedHands) => {
      const smoothed = detectedHands.map((hand) => ({
        ...hand,
        landmarks: smootherRef.current.smooth(hand.landmarks),
      }));
      setHands(smoothed);
      setIsReady(true);
    });

    return () => {
      trackerRef.current?.stop();
    };
  }, [videoRef]);

  return { hands, isReady };
}
```

### useAlignment.ts
```typescript
import { useMemo } from 'react';
import { calculateSpatialAlignment, applyTransform } from '../lib/alignment/spatialAlign';
import { calculateSimilarityScore, ScoreSmoothing } from '../lib/alignment/scoring';
import type { Keypoint, AlignmentResult } from '../lib/types/keypoints';

const scoreSmoothing = new ScoreSmoothing(0.3);

export function useAlignment(
  userKeypoints: Keypoint[],
  expertKeypoints: Keypoint[]
): AlignmentResult {
  return useMemo(() => {
    if (userKeypoints.length === 0 || expertKeypoints.length === 0) {
      return {
        score: 0,
        errors: [],
        topErrors: [],
        ghostTransform: { translateX: 0, translateY: 0, scale: 1, rotation: 0 },
      };
    }

    const transform = calculateSpatialAlignment(userKeypoints, expertKeypoints);
    const alignedExpert = applyTransform(expertKeypoints, transform);
    const { score, errors } = calculateSimilarityScore(userKeypoints, alignedExpert);

    const smoothedScore = scoreSmoothing.update(score);
    const topErrors = [...errors].sort((a, b) => b.magnitude - a.magnitude).slice(0, 3);

    return {
      score: smoothedScore,
      errors,
      topErrors,
      ghostTransform: transform,
    };
  }, [userKeypoints, expertKeypoints]);
}
```

---

## INTEGRATION POINTS

**Exports for Person 3 (Frontend):**
```typescript
// Main hooks
export { useMediaPipe } from './hooks/useMediaPipe';
export { useAlignment } from './hooks/useAlignment';

// Utilities
export { getDeterministicCue, getTopErrorJoints } from './lib/feedback/cueMapper';
export { analyzeErrors } from './lib/feedback/errorAnalysis';

// Types
export type { Keypoint, HandLandmarks, AlignmentResult, ErrorVector } from './lib/types/keypoints';
```

**Exports for Person 1 (Backend):**
```typescript
// Error analysis for Gemini prompts
export { analyzeErrors, type AnalysisResult } from './lib/feedback/errorAnalysis';
export type { ErrorVector } from './lib/types/keypoints';
```
