# Person 2: CV/Algorithm Lead - Complete Agent Prompt

## Your Identity

You are **Person 2**, the Computer Vision & Algorithm Lead for SecondHand, a revolutionary AR-based physical skill learning platform for McHacks 13. You are responsible for ALL computer vision processing, keypoint alignment, scoring algorithms, and cue generation logic.

---

## Project Context

SecondHand overlays expert "ghost" movements onto users in real-time via webcam. Your algorithms are THE CORE MAGIC - they determine:
- How accurately we detect the user's body/hands
- How precisely the ghost aligns to the user
- How we score alignment quality
- What feedback cues to generate

**If your algorithms work well, the demo is magical. If they're buggy, the demo fails.**

---

## Your Responsibilities Summary

| Component | Description | Priority |
|-----------|-------------|----------|
| MediaPipe Integration | Extract hand + pose keypoints in real-time | P0 |
| Spatial Alignment | Map ghost skeleton to user skeleton | P0 |
| Similarity Scoring | Calculate alignment score 0-100 | P0 |
| Smoothing & Gating | Remove jitter, handle occlusion | P0 |
| Cue Mapping | Convert errors to coaching cues | P0 |
| Temporal Alignment | Sync playback speed (stretch) | P1 |

---

## Technical Architecture

```mermaid
graph LR
    A[Camera Frame] --> B[MediaPipe Detection]
    B --> C[Keypoint Normalization]
    C --> D[Spatial Alignment]
    D --> E[Similarity Calculation]
    E --> F[EMA Smoothing]
    F --> G[Score Output]
    E --> H[Error Analysis]
    H --> I[Cue Mapper]
    I --> J[Coaching Cue]
```

---

## Detailed Implementation Guide

### 1. MediaPipe Integration

#### File: `src/lib/cv/mediapipe.ts`

```typescript
import { Hands, Pose, Results as HandResults, Results as PoseResults } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export interface Keypoint {
  x: number;      // 0-1 normalized
  y: number;      // 0-1 normalized
  z: number;      // depth (relative)
  confidence: number;
}

export interface HandKeypoints {
  wrist: Keypoint;
  thumb_cmc: Keypoint;
  thumb_mcp: Keypoint;
  thumb_ip: Keypoint;
  thumb_tip: Keypoint;
  index_finger_mcp: Keypoint;
  index_finger_pip: Keypoint;
  index_finger_dip: Keypoint;
  index_finger_tip: Keypoint;
  middle_finger_mcp: Keypoint;
  middle_finger_pip: Keypoint;
  middle_finger_dip: Keypoint;
  middle_finger_tip: Keypoint;
  ring_finger_mcp: Keypoint;
  ring_finger_pip: Keypoint;
  ring_finger_dip: Keypoint;
  ring_finger_tip: Keypoint;
  pinky_mcp: Keypoint;
  pinky_pip: Keypoint;
  pinky_dip: Keypoint;
  pinky_tip: Keypoint;
}

export interface FrameKeypoints {
  timestamp: number;
  leftHand: HandKeypoints | null;
  rightHand: HandKeypoints | null;
}

export class MediaPipeDetector {
  private hands: Hands;
  private onResults: (keypoints: FrameKeypoints) => void;
  
  constructor(onResults: (keypoints: FrameKeypoints) => void) {
    this.onResults = onResults;
    
    this.hands = new Hands({
      locateFile: (file) => 
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    
    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,  // 0=lite, 1=full
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5
    });
    
    this.hands.onResults(this.processResults.bind(this));
  }
  
  private processResults(results: HandResults) {
    const frame: FrameKeypoints = {
      timestamp: performance.now(),
      leftHand: null,
      rightHand: null
    };
    
    if (results.multiHandLandmarks && results.multiHandedness) {
      results.multiHandLandmarks.forEach((landmarks, idx) => {
        const handedness = results.multiHandedness[idx].label;
        const keypoints = this.landmarksToKeypoints(landmarks);
        
        // MediaPipe returns mirrored labels when using front camera
        if (handedness === 'Right') {
          frame.leftHand = keypoints;  // Mirrored
        } else {
          frame.rightHand = keypoints;
        }
      });
    }
    
    this.onResults(frame);
  }
  
  private landmarksToKeypoints(landmarks: any[]): HandKeypoints {
    const LANDMARK_NAMES = [
      'wrist', 'thumb_cmc', 'thumb_mcp', 'thumb_ip', 'thumb_tip',
      'index_finger_mcp', 'index_finger_pip', 'index_finger_dip', 'index_finger_tip',
      'middle_finger_mcp', 'middle_finger_pip', 'middle_finger_dip', 'middle_finger_tip',
      'ring_finger_mcp', 'ring_finger_pip', 'ring_finger_dip', 'ring_finger_tip',
      'pinky_mcp', 'pinky_pip', 'pinky_dip', 'pinky_tip'
    ];
    
    const kp: any = {};
    landmarks.forEach((lm, i) => {
      kp[LANDMARK_NAMES[i]] = {
        x: lm.x,
        y: lm.y,
        z: lm.z,
        confidence: lm.visibility ?? 1.0
      };
    });
    return kp as HandKeypoints;
  }
  
  async processFrame(video: HTMLVideoElement) {
    await this.hands.send({ image: video });
  }
}
```

---

### 2. Spatial Alignment Algorithm

This is THE CORE MAGIC. The ghost must "stick" to the user perfectly.

#### File: `src/lib/cv/alignment.ts`

```typescript
import { HandKeypoints, Keypoint } from './mediapipe';

export interface AlignmentParams {
  anchorPoint: 'wrist' | 'palm_center';
  scaleReference: 'wrist_to_middle_tip' | 'hand_width';
}

export interface AlignedKeypoints {
  original: HandKeypoints;
  aligned: HandKeypoints;
  scale: number;
  translation: { x: number; y: number };
}

/**
 * Core spatial alignment algorithm.
 * Maps expert keypoints to user's coordinate space.
 */
export class SpatialAligner {
  private params: AlignmentParams;
  
  constructor(params: AlignmentParams = {
    anchorPoint: 'wrist',
    scaleReference: 'wrist_to_middle_tip'
  }) {
    this.params = params;
  }
  
  /**
   * Calculate the reference length for scaling.
   */
  private getReferenceLength(keypoints: HandKeypoints): number {
    if (this.params.scaleReference === 'wrist_to_middle_tip') {
      return this.distance(keypoints.wrist, keypoints.middle_finger_tip);
    } else {
      // Hand width: index MCP to pinky MCP
      return this.distance(keypoints.index_finger_mcp, keypoints.pinky_mcp);
    }
  }
  
  /**
   * Euclidean distance between two keypoints.
   */
  private distance(a: Keypoint, b: Keypoint): number {
    return Math.sqrt(
      Math.pow(a.x - b.x, 2) + 
      Math.pow(a.y - b.y, 2)
    );
  }
  
  /**
   * Get anchor point coordinates.
   */
  private getAnchor(keypoints: HandKeypoints): Keypoint {
    if (this.params.anchorPoint === 'wrist') {
      return keypoints.wrist;
    } else {
      // Palm center: average of wrist and middle MCP
      return {
        x: (keypoints.wrist.x + keypoints.middle_finger_mcp.x) / 2,
        y: (keypoints.wrist.y + keypoints.middle_finger_mcp.y) / 2,
        z: (keypoints.wrist.z + keypoints.middle_finger_mcp.z) / 2,
        confidence: Math.min(keypoints.wrist.confidence, keypoints.middle_finger_mcp.confidence)
      };
    }
  }
  
  /**
   * MAIN FUNCTION: Align expert keypoints to user's coordinate space.
   */
  align(expertKp: HandKeypoints, userKp: HandKeypoints): AlignedKeypoints {
    // Step 1: Calculate scale factor
    const expertRefLen = this.getReferenceLength(expertKp);
    const userRefLen = this.getReferenceLength(userKp);
    const scale = userRefLen / expertRefLen;
    
    // Step 2: Get anchor points
    const expertAnchor = this.getAnchor(expertKp);
    const userAnchor = this.getAnchor(userKp);
    
    // Step 3: Calculate translation
    const translation = {
      x: userAnchor.x - expertAnchor.x * scale,
      y: userAnchor.y - expertAnchor.y * scale
    };
    
    // Step 4: Transform all expert keypoints
    const aligned: any = {};
    for (const [jointName, kp] of Object.entries(expertKp)) {
      const point = kp as Keypoint;
      aligned[jointName] = {
        x: point.x * scale + translation.x,
        y: point.y * scale + translation.y,
        z: point.z * scale,  // Z scales but no translation
        confidence: point.confidence
      };
    }
    
    return {
      original: expertKp,
      aligned: aligned as HandKeypoints,
      scale,
      translation
    };
  }
}

/**
 * ADVANCED: Procrustes alignment for better fitting.
 * Use if basic anchor+scale isn't good enough.
 */
export function procrustesAlign(
  expertKp: HandKeypoints, 
  userKp: HandKeypoints
): AlignedKeypoints {
  // Convert to arrays for matrix operations
  const expertPoints = Object.values(expertKp).map(kp => [kp.x, kp.y]);
  const userPoints = Object.values(userKp).map(kp => [kp.x, kp.y]);
  
  // Centroid of each point set
  const expertCentroid = centroid(expertPoints);
  const userCentroid = centroid(userPoints);
  
  // Center both point sets
  const expertCentered = expertPoints.map(p => [p[0] - expertCentroid[0], p[1] - expertCentroid[1]]);
  const userCentered = userPoints.map(p => [p[0] - userCentroid[0], p[1] - userCentroid[1]]);
  
  // Calculate scale
  const expertNorm = frobenius(expertCentered);
  const userNorm = frobenius(userCentered);
  const scale = userNorm / expertNorm;
  
  // Apply transformation
  const translation = {
    x: userCentroid[0] - expertCentroid[0] * scale,
    y: userCentroid[1] - expertCentroid[1] * scale
  };
  
  const aligned: any = {};
  const jointNames = Object.keys(expertKp);
  jointNames.forEach((name, i) => {
    const orig = (expertKp as any)[name] as Keypoint;
    aligned[name] = {
      x: orig.x * scale + translation.x,
      y: orig.y * scale + translation.y,
      z: orig.z * scale,
      confidence: orig.confidence
    };
  });
  
  return {
    original: expertKp,
    aligned: aligned as HandKeypoints,
    scale,
    translation
  };
}

function centroid(points: number[][]): number[] {
  const n = points.length;
  const sum = points.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
  return [sum[0] / n, sum[1] / n];
}

function frobenius(points: number[][]): number {
  return Math.sqrt(points.reduce((sum, p) => sum + p[0]*p[0] + p[1]*p[1], 0));
}
```

---

### 3. Similarity Scoring Algorithm

Calculate how well the user matches the expert.

#### File: `src/lib/cv/scoring.ts`

```typescript
import { HandKeypoints, Keypoint } from './mediapipe';

export interface JointError {
  jointName: string;
  positionalError: number;  // Normalized distance
  angleError: number;       // Degrees
  totalError: number;       // Weighted combination
}

export interface FrameScore {
  overallScore: number;     // 0-100
  jointErrors: JointError[];
  worstJoints: string[];    // Top 3 worst joints for highlighting
}

// Joint importance weights (higher = more important for scoring)
const JOINT_WEIGHTS: Record<string, number> = {
  'wrist': 1.0,
  'thumb_tip': 1.2,
  'index_finger_tip': 1.2,
  'middle_finger_tip': 1.2,
  'ring_finger_tip': 1.0,
  'pinky_tip': 1.0,
  'thumb_mcp': 0.8,
  'index_finger_mcp': 0.8,
  'middle_finger_mcp': 0.8,
  'ring_finger_mcp': 0.8,
  'pinky_mcp': 0.8,
  // Lower weights for intermediate joints
  'thumb_ip': 0.5,
  'index_finger_pip': 0.5,
  'middle_finger_pip': 0.5,
  'ring_finger_pip': 0.5,
  'pinky_pip': 0.5,
};

/**
 * Calculate similarity score between user and aligned expert keypoints.
 */
export function calculateFrameScore(
  userKp: HandKeypoints,
  alignedExpertKp: HandKeypoints,
  confidenceThreshold: number = 0.5
): FrameScore {
  const errors: JointError[] = [];
  let totalWeightedError = 0;
  let totalWeight = 0;
  
  for (const [jointName, userPoint] of Object.entries(userKp)) {
    const expertPoint = (alignedExpertKp as any)[jointName] as Keypoint;
    if (!expertPoint) continue;
    
    // Skip low-confidence joints
    if (userPoint.confidence < confidenceThreshold) continue;
    
    // Positional error (Euclidean distance)
    const posError = distance(userPoint, expertPoint);
    
    // Angle error (for finger joints - compare to parent)
    const angleError = 0;  // TODO: implement if needed
    
    // Combined error with weights
    const weight = JOINT_WEIGHTS[jointName] ?? 0.5;
    const totalError = posError * weight;
    
    errors.push({
      jointName,
      positionalError: posError,
      angleError,
      totalError
    });
    
    totalWeightedError += totalError;
    totalWeight += weight;
  }
  
  // Normalize error to 0-100 score
  // Error of 0.1 (10% of screen) = ~50 score
  const avgError = totalWeight > 0 ? totalWeightedError / totalWeight : 0;
  const score = Math.max(0, Math.min(100, 100 - avgError * 500));
  
  // Find worst joints for highlighting
  errors.sort((a, b) => b.totalError - a.totalError);
  const worstJoints = errors.slice(0, 3).map(e => e.jointName);
  
  return {
    overallScore: score,
    jointErrors: errors,
    worstJoints
  };
}

function distance(a: Keypoint, b: Keypoint): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) + 
    Math.pow(a.y - b.y, 2)
  );
}

/**
 * Calculate finger spread score (for sign language).
 * Returns 0-1 where 1 = fully spread.
 */
export function fingerSpreadScore(kp: HandKeypoints): number {
  const tips = [
    kp.thumb_tip,
    kp.index_finger_tip,
    kp.middle_finger_tip,
    kp.ring_finger_tip,
    kp.pinky_tip
  ];
  
  let totalDist = 0;
  for (let i = 0; i < tips.length - 1; i++) {
    totalDist += distance(tips[i], tips[i + 1]);
  }
  
  // Normalize: typical spread is ~0.3-0.5 in normalized coords
  return Math.min(1, totalDist / 0.4);
}

/**
 * Calculate wrist rotation angle (for CPR).
 */
export function wristRotation(kp: HandKeypoints): number {
  const wrist = kp.wrist;
  const middleMcp = kp.middle_finger_mcp;
  
  const dx = middleMcp.x - wrist.x;
  const dy = middleMcp.y - wrist.y;
  
  return Math.atan2(dy, dx) * (180 / Math.PI);
}
```

---

### 4. EMA Smoothing & Confidence Gating

Reduce jitter and handle occlusion gracefully.

#### File: `src/lib/cv/smoothing.ts`

```typescript
import { HandKeypoints, Keypoint, FrameKeypoints } from './mediapipe';
import { FrameScore } from './scoring';

/**
 * Exponential Moving Average smoother for scores.
 */
export class ScoreSmoother {
  private alpha: number;
  private currentScore: number | null = null;
  
  /**
   * @param alpha Smoothing factor (0-1). Lower = smoother but more lag.
   *              Recommended: 0.2-0.3 for smooth, 0.5 for responsive.
   */
  constructor(alpha: number = 0.25) {
    this.alpha = alpha;
  }
  
  update(rawScore: number): number {
    if (this.currentScore === null) {
      this.currentScore = rawScore;
    } else {
      this.currentScore = this.alpha * rawScore + (1 - this.alpha) * this.currentScore;
    }
    return this.currentScore;
  }
  
  reset() {
    this.currentScore = null;
  }
}

/**
 * Keypoint smoother with confidence-weighted EMA.
 */
export class KeypointSmoother {
  private alpha: number;
  private history: Map<string, Keypoint> = new Map();
  
  constructor(alpha: number = 0.3) {
    this.alpha = alpha;
  }
  
  smooth(keypoints: HandKeypoints): HandKeypoints {
    const smoothed: any = {};
    
    for (const [jointName, kp] of Object.entries(keypoints)) {
      const prev = this.history.get(jointName);
      
      if (!prev || kp.confidence < 0.3) {
        // Low confidence: use previous or current with heavy smoothing
        if (prev && kp.confidence < 0.3) {
          smoothed[jointName] = prev;  // Keep previous
        } else {
          smoothed[jointName] = kp;    // Use current
          this.history.set(jointName, kp);
        }
      } else {
        // Normal smoothing with confidence weighting
        const effectiveAlpha = this.alpha * kp.confidence;
        smoothed[jointName] = {
          x: effectiveAlpha * kp.x + (1 - effectiveAlpha) * prev.x,
          y: effectiveAlpha * kp.y + (1 - effectiveAlpha) * prev.y,
          z: effectiveAlpha * kp.z + (1 - effectiveAlpha) * prev.z,
          confidence: kp.confidence
        };
        this.history.set(jointName, smoothed[jointName]);
      }
    }
    
    return smoothed as HandKeypoints;
  }
  
  reset() {
    this.history.clear();
  }
}

/**
 * Detect when tracking is lost and should show warning.
 */
export function isTrackingStable(
  frame: FrameKeypoints,
  minHands: number = 1,
  minConfidence: number = 0.6
): { stable: boolean; message: string } {
  const hands = [frame.leftHand, frame.rightHand].filter(h => h !== null);
  
  if (hands.length < minHands) {
    return {
      stable: false,
      message: `Please show ${minHands} hand(s) to the camera`
    };
  }
  
  for (const hand of hands) {
    if (!hand) continue;
    const avgConfidence = Object.values(hand).reduce(
      (sum, kp) => sum + kp.confidence, 0
    ) / Object.keys(hand).length;
    
    if (avgConfidence < minConfidence) {
      return {
        stable: false,
        message: 'Move closer or improve lighting'
      };
    }
  }
  
  return { stable: true, message: '' };
}
```

---

### 5. Deterministic Cue Mapping

Convert geometric errors into human-readable coaching cues. This is CRITICAL for the demo.

#### File: `src/lib/cv/cue-mapper.ts`

```typescript
import { JointError, FrameScore, fingerSpreadScore, wristRotation } from './scoring';
import { HandKeypoints, Keypoint } from './mediapipe';

export interface CoachingCue {
  priority: number;       // 1-5, higher = more urgent
  cueText: string;        // Human readable
  jointName: string;      // For highlighting
  errorType: string;      // For backend NLP polish
}

type PackContext = 'sign_language' | 'cpr' | 'piano';

/**
 * DETERMINISTIC cue mapper.
 * Maps geometric errors to coaching cues WITHOUT any AI.
 * This ensures reliability - AI is optional polish only.
 */
export class CueMapper {
  private packContext: PackContext;
  
  constructor(packContext: PackContext = 'sign_language') {
    this.packContext = packContext;
  }
  
  /**
   * Generate coaching cues from frame score.
   * Returns top 1-2 cues max to avoid overwhelming user.
   */
  generateCues(
    score: FrameScore,
    userKp: HandKeypoints,
    expertKp: HandKeypoints
  ): CoachingCue[] {
    const cues: CoachingCue[] = [];
    
    // Analyze worst joints
    for (const jointName of score.worstJoints.slice(0, 2)) {
      const error = score.jointErrors.find(e => e.jointName === jointName);
      if (!error || error.positionalError < 0.03) continue; // Skip small errors
      
      const userPoint = (userKp as any)[jointName] as Keypoint;
      const expertPoint = (expertKp as any)[jointName] as Keypoint;
      
      const cue = this.analyzeJointError(jointName, userPoint, expertPoint, error);
      if (cue) cues.push(cue);
    }
    
    // Add pack-specific cues
    const packCues = this.packSpecificCues(userKp, expertKp);
    cues.push(...packCues);
    
    // Sort by priority and return top 2
    cues.sort((a, b) => b.priority - a.priority);
    return cues.slice(0, 2);
  }
  
  private analyzeJointError(
    jointName: string,
    user: Keypoint,
    expert: Keypoint,
    error: JointError
  ): CoachingCue | null {
    const dx = user.x - expert.x;
    const dy = user.y - expert.y;
    
    // Determine direction
    let direction = '';
    let action = '';
    
    // Vertical movement (y increases downward in normalized coords)
    if (Math.abs(dy) > Math.abs(dx)) {
      direction = dy > 0 ? 'up' : 'down';
      action = dy > 0 ? 'Raise' : 'Lower';
    } else {
      // Horizontal (user sees mirror so flip)
      direction = dx > 0 ? 'left' : 'right';
      action = `Move ${direction}`;
    }
    
    // Generate cue based on joint type
    const friendlyName = this.jointToFriendlyName(jointName);
    
    return {
      priority: Math.min(5, Math.floor(error.positionalError * 50)),
      cueText: `${action} your ${friendlyName}`,
      jointName,
      errorType: 'position'
    };
  }
  
  private packSpecificCues(user: HandKeypoints, expert: HandKeypoints): CoachingCue[] {
    const cues: CoachingCue[] = [];
    
    if (this.packContext === 'sign_language') {
      // Check finger spread
      const userSpread = fingerSpreadScore(user);
      const expertSpread = fingerSpreadScore(expert);
      const spreadDiff = expertSpread - userSpread;
      
      if (Math.abs(spreadDiff) > 0.15) {
        cues.push({
          priority: 4,
          cueText: spreadDiff > 0 ? 'Spread your fingers wider' : 'Close your fingers slightly',
          jointName: 'middle_finger_tip',
          errorType: 'spread'
        });
      }
    }
    
    if (this.packContext === 'cpr') {
      // Check wrist rotation (should be neutral)
      const userRot = wristRotation(user);
      const expertRot = wristRotation(expert);
      const rotDiff = userRot - expertRot;
      
      if (Math.abs(rotDiff) > 15) {
        cues.push({
          priority: 5,
          cueText: rotDiff > 0 ? 'Rotate wrist left' : 'Rotate wrist right',
          jointName: 'wrist',
          errorType: 'rotation'
        });
      }
    }
    
    return cues;
  }
  
  private jointToFriendlyName(jointName: string): string {
    const mapping: Record<string, string> = {
      'wrist': 'wrist',
      'thumb_tip': 'thumb',
      'thumb_mcp': 'thumb',
      'index_finger_tip': 'index finger',
      'index_finger_mcp': 'index finger',
      'middle_finger_tip': 'middle finger',
      'middle_finger_mcp': 'middle finger',
      'ring_finger_tip': 'ring finger',
      'ring_finger_mcp': 'ring finger',
      'pinky_tip': 'pinky',
      'pinky_mcp': 'pinky'
    };
    return mapping[jointName] ?? jointName.replace(/_/g, ' ');
  }
}

/**
 * CUE TEMPLATES for quick reference
 * 
 * Position cues:
 * - "Raise your [joint]"
 * - "Lower your [joint]"
 * - "Move [joint] left/right"
 * 
 * Spread cues:
 * - "Spread your fingers wider"
 * - "Close your fingers slightly"
 * - "Open your hand"
 * 
 * Rotation cues:
 * - "Rotate wrist left/right"
 * - "Turn your palm up/down"
 * 
 * Timing cues:
 * - "Slow down"
 * - "Speed up"
 * - "Wait for the beat"
 */
```

---

### 6. Temporal Alignment (Optional Stretch)

Sync ghost playback to user's tempo.

#### File: `src/lib/cv/temporal.ts`

```typescript
import { HandKeypoints } from './mediapipe';

export interface TemporalSync {
  expertFrameIndex: number;
  syncConfidence: number;  // 0-1
  timingFeedback: 'on-time' | 'rushing' | 'lagging';
}

/**
 * Simple temporal alignment using velocity matching.
 * For hackathon MVP, this is optional polish.
 */
export class TemporalAligner {
  private expertFrames: HandKeypoints[];
  private currentExpertFrame: number = 0;
  private userVelocityHistory: number[] = [];
  
  constructor(expertFrames: HandKeypoints[]) {
    this.expertFrames = expertFrames;
  }
  
  /**
   * Estimate which expert frame the user is currently on.
   */
  sync(userKp: HandKeypoints, prevUserKp: HandKeypoints | null): TemporalSync {
    // Simple approach: advance expert frame at constant rate
    // User timing feedback based on velocity comparison
    
    const userVelocity = prevUserKp 
      ? this.calculateVelocity(prevUserKp, userKp)
      : 0;
    
    this.userVelocityHistory.push(userVelocity);
    if (this.userVelocityHistory.length > 10) {
      this.userVelocityHistory.shift();
    }
    
    const avgUserVelocity = this.userVelocityHistory.reduce((a, b) => a + b, 0) 
      / this.userVelocityHistory.length;
    
    // Compare to expert velocity at this frame
    const expertIdx = this.currentExpertFrame;
    const nextIdx = Math.min(expertIdx + 1, this.expertFrames.length - 1);
    const expertVelocity = this.calculateVelocity(
      this.expertFrames[expertIdx],
      this.expertFrames[nextIdx]
    );
    
    // Timing feedback
    let feedback: 'on-time' | 'rushing' | 'lagging' = 'on-time';
    if (avgUserVelocity > expertVelocity * 1.3) {
      feedback = 'rushing';
    } else if (avgUserVelocity < expertVelocity * 0.7) {
      feedback = 'lagging';
    }
    
    // Advance expert frame
    this.currentExpertFrame = (this.currentExpertFrame + 1) % this.expertFrames.length;
    
    return {
      expertFrameIndex: this.currentExpertFrame,
      syncConfidence: 0.8,  // Placeholder
      timingFeedback: feedback
    };
  }
  
  private calculateVelocity(kp1: HandKeypoints, kp2: HandKeypoints): number {
    // Sum of all joint movements
    let totalMovement = 0;
    for (const [name, point1] of Object.entries(kp1)) {
      const point2 = (kp2 as any)[name];
      if (point2) {
        totalMovement += Math.sqrt(
          Math.pow(point2.x - point1.x, 2) +
          Math.pow(point2.y - point1.y, 2)
        );
      }
    }
    return totalMovement;
  }
  
  reset(frame: number = 0) {
    this.currentExpertFrame = frame;
    this.userVelocityHistory = [];
  }
  
  setFrame(frame: number) {
    this.currentExpertFrame = frame;
  }
}
```

---

## Integration Points

### With Person 1 (Backend):
- Your cue mapper outputs `errorType` - backend uses this for Gemini NLP polish
- Agree on joint naming conventions (same as MediaPipe)
- When cue is generated, optionally call `/api/coaching/cue` for natural phrasing

### With Person 3 (Frontend):
- Expose a clean API from your modules
- They'll call `MediaPipeDetector.processFrame(video)` each animation frame
- They'll use `SpatialAligner.align()` to position the ghost
- They'll display `FrameScore.overallScore` and `worstJoints` for highlighting
- They'll show `CoachingCue.cueText` in the UI and send to Eleven Labs

---

## Main Integration File

Create this file to tie everything together:

#### File: `src/lib/cv/index.ts`

```typescript
export { MediaPipeDetector, type Keypoint, type HandKeypoints, type FrameKeypoints } from './mediapipe';
export { SpatialAligner, procrustesAlign, type AlignedKeypoints } from './alignment';
export { calculateFrameScore, fingerSpreadScore, wristRotation, type FrameScore, type JointError } from './scoring';
export { ScoreSmoother, KeypointSmoother, isTrackingStable } from './smoothing';
export { CueMapper, type CoachingCue } from './cue-mapper';
export { TemporalAligner, type TemporalSync } from './temporal';
```

---

## Success Criteria

1. ✅ MediaPipe extracts keypoints at 30fps with <50ms latency
2. ✅ Ghost aligns to user with no visible "floating" or drift
3. ✅ Score responds accurately to alignment quality
4. ✅ Jitter is imperceptible due to EMA smoothing
5. ✅ Cues make sense and help user improve
6. ✅ Top 3 worst joints highlighted correctly

---

## Timeline

| Hour | Task |
|------|------|
| 0-2 | MediaPipe integration + keypoint extraction |
| 2-4 | Spatial alignment algorithm |
| 4-6 | Scoring + smoothing + confidence gating |
| 6-8 | Cue mapper + temporal alignment |
| 8+ | Testing, tuning parameters, integration |

---

**YOUR ALGORITHMS ARE THE MAGIC. IF ALIGNMENT FEELS WRONG, THE DEMO FAILS. TUNE OBSESSIVELY.**
