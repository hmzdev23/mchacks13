# SecondHand - McHacks 13 Master Implementation Plan

> **Learn physical skills from invisible teachers** - Real-time AR motion coaching with AI voice feedback

---

## Executive Summary

SecondHand is a revolutionary motion-learning platform that overlays an expert "ghost" onto the user's body in real-time, providing instant visual feedback and AI-powered voice coaching. This plan integrates:

- **MediaPipe** for real-time pose/hand tracking
- **Gemini AI** for intelligent NLP coaching
- **ElevenLabs** for natural voice synthesis
- **Next.js + React** for a premium frontend experience

---

## Technology Stack (Enhanced)

### Core Technologies
| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14 + React 18 + TypeScript | App framework with SSR |
| Styling | TailwindCSS + Framer Motion | Premium animations |
| State | Zustand + React Query | Fast state management |
| CV | MediaPipe Hands + Pose | Real-time keypoint extraction |
| AI Coach | **Gemini Pro API** | NLP coaching & error interpretation |
| Voice Synth | **ElevenLabs API** | Natural voice feedback |
| Voice Input | Web Speech API + Whisper fallback | Voice commands |
| Canvas | Canvas2D + WebGL shaders | Ghost overlay rendering |
| Backend | FastAPI (Python) | Preprocessing & API proxy |
| Storage | Cloudflare R2 / Vercel Blob | Video & keypoint storage |
| Deploy | Vercel (frontend) + Railway (backend) | Production hosting |

### API Keys Provided
```
ElevenLabs: sk_3afeb9ee67a61c3b28703ac6e98e244056d0664d631ffdac
Gemini: AIzaSyBTKxpu2pkqKRYzmDjPnWddVP9JITOFzd0
```

---

## System Architecture

```mermaid
flowchart TB
    subgraph Frontend["Frontend (Next.js)"]
        UI[Experience Layer]
        CAM[Camera Capture]
        CV[MediaPipe Processing]
        ALIGN[Alignment Engine]
        RENDER[Ghost Renderer]
        SCORE[Scoring System]
    end
    
    subgraph Backend["Backend (FastAPI)"]
        GEMINI[Gemini AI Coach]
        ELEVEN[ElevenLabs TTS]
        PREPROC[Video Preprocessor]
        STORAGE[Keypoint Storage]
    end
    
    CAM --> CV
    CV --> ALIGN
    ALIGN --> RENDER
    ALIGN --> SCORE
    SCORE --> GEMINI
    GEMINI --> ELEVEN
    ELEVEN --> UI
    PREPROC --> STORAGE
    STORAGE --> ALIGN
```

---

## 8-Layer Architecture Detail

### Layer 1: Experience Layer (UI/UX)
- Landing page with pack selection
- Calibration screen ("hold hands up")
- Session view with ghost + score + cues
- Recap screen with improvement metrics
- Voice command indicators

### Layer 2: Capture Layer
- `getUserMedia()` for camera
- 30 FPS locked framerate
- Mirror toggle for learning
- Web Audio API for mic input
- Lighting quality detection

### Layer 3: Perception Layer
- MediaPipe Hands (21 keypoints/hand)
- MediaPipe Pose (33 keypoints for body)
- Confidence gating for stability
- Temporal smoothing (EMA filter)

### Layer 4: Alignment Layer (THE MAGIC)
- Spatial alignment: anchor-based transform
- Scale normalization (wrist→fingertip)
- Procrustes alignment for best-fit
- Temporal sync with phase detection

### Layer 5: Feedback Layer
- Ghost skeleton rendering
- Joint heat glow (error magnitude)
- Directional correction arrows
- EMA-smoothed scoring (0-100)

### Layer 6: Coach Layer
- Voice commands via SpeechRecognition
- Deterministic cue mapping (Tier 1)
- **Gemini AI** for natural phrasing (Tier 2)
- **ElevenLabs** for voice synthesis

### Layer 7: Content Layer
- Pre-extracted expert keypoints (JSON)
- Segment markers for loops
- Pack-specific cue templates
- Difficulty progression

### Layer 8: Infrastructure Layer
- Vercel for frontend
- FastAPI backend for AI proxying
- WebSocket for real-time feedback
- Analytics for demo storytelling

---

## Feature Implementation Priority

### MVP (Must Have)
1. ✅ Live camera + MediaPipe keypoints
2. ✅ Ghost skeleton overlay with alignment
3. ✅ Per-frame similarity score + EMA
4. ✅ Drift highlighting (top joints)
5. ✅ Loop mode for micro-drills
6. ✅ Deterministic cue mapping
7. ✅ **Gemini** natural language coaching
8. ✅ **ElevenLabs** voice feedback
9. ✅ One polished pack (Sign Language)

### Stretch Goals
- Adaptive phase-lock ghost
- Replay mode (side-by-side)
- Upload-to-lesson pipeline
- Multi-pack support
- WebRTC live remote coach

---

## Detailed File Structure

```
mchacks13/
├── frontend/                    # Next.js Application
│   ├── src/
│   │   ├── app/                 # Next.js App Router
│   │   │   ├── page.tsx         # Landing
│   │   │   ├── session/
│   │   │   │   └── page.tsx     # Main session
│   │   │   ├── calibrate/
│   │   │   │   └── page.tsx     # Calibration
│   │   │   └── recap/
│   │   │       └── page.tsx     # Results
│   │   ├── components/
│   │   │   ├── ui/              # Base UI components
│   │   │   ├── camera/          # Camera components
│   │   │   │   ├── CameraView.tsx
│   │   │   │   └── LightingIndicator.tsx
│   │   │   ├── ghost/           # Ghost overlay
│   │   │   │   ├── GhostRenderer.tsx
│   │   │   │   ├── SkeletonOverlay.tsx
│   │   │   │   └── JointHeatmap.tsx
│   │   │   ├── feedback/        # Feedback UI
│   │   │   │   ├── ScoreDisplay.tsx
│   │   │   │   ├── CueOverlay.tsx
│   │   │   │   └── TrendChart.tsx
│   │   │   ├── coach/           # Voice coach
│   │   │   │   ├── VoiceCoach.tsx
│   │   │   │   └── VoiceCommands.tsx
│   │   │   └── session/         # Session components
│   │   │       ├── LoopControls.tsx
│   │   │       └── PackSelector.tsx
│   │   ├── lib/
│   │   │   ├── mediapipe/       # CV integration
│   │   │   │   ├── handTracker.ts
│   │   │   │   ├── poseTracker.ts
│   │   │   │   └── types.ts
│   │   │   ├── alignment/       # Alignment engine
│   │   │   │   ├── spatialAlign.ts
│   │   │   │   ├── temporalSync.ts
│   │   │   │   ├── procrustes.ts
│   │   │   │   └── scoring.ts
│   │   │   ├── feedback/        # Feedback logic
│   │   │   │   ├── cueMapper.ts
│   │   │   │   ├── errorAnalysis.ts
│   │   │   │   └── smoothing.ts
│   │   │   ├── api/             # API clients
│   │   │   │   ├── gemini.ts
│   │   │   │   ├── elevenlabs.ts
│   │   │   │   └── backend.ts
│   │   │   └── audio/           # Audio utils
│   │   │       ├── speechRecognition.ts
│   │   │       └── audioPlayer.ts
│   │   ├── stores/              # Zustand stores
│   │   │   ├── sessionStore.ts
│   │   │   ├── settingsStore.ts
│   │   │   └── coachStore.ts
│   │   ├── hooks/               # Custom hooks
│   │   │   ├── useMediaPipe.ts
│   │   │   ├── useAlignment.ts
│   │   │   ├── useVoiceCommands.ts
│   │   │   └── useAudioFeedback.ts
│   │   ├── data/                # Static data
│   │   │   └── packs/
│   │   │       └── sign-language/
│   │   │           ├── keypoints.json
│   │   │           ├── segments.json
│   │   │           └── cues.json
│   │   └── styles/
│   │       └── globals.css
│   ├── public/
│   │   └── videos/              # Expert reference videos
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.js
│
├── backend/                     # FastAPI Backend
│   ├── app/
│   │   ├── main.py              # FastAPI entry
│   │   ├── routers/
│   │   │   ├── coach.py         # Gemini coaching
│   │   │   ├── voice.py         # ElevenLabs TTS
│   │   │   ├── preprocess.py    # Video processing
│   │   │   └── analytics.py     # Telemetry
│   │   ├── services/
│   │   │   ├── gemini_service.py
│   │   │   ├── elevenlabs_service.py
│   │   │   ├── keypoint_extractor.py
│   │   │   └── scoring_service.py
│   │   ├── models/
│   │   │   ├── session.py
│   │   │   ├── feedback.py
│   │   │   └── cues.py
│   │   └── utils/
│   │       ├── smoothing.py
│   │       └── normalization.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── preprocessing/               # Offline tools
│   ├── extract_keypoints.py
│   ├── smooth_normalize.py
│   └── generate_segments.py
│
├── .env                         # Environment variables
├── .env.example
└── README.md
```

---

## API Integration Details

### Gemini AI Coach Integration

**Purpose**: Transform raw error vectors into natural, actionable coaching cues

**Endpoint**: `POST /api/coach/generate-cue`

**Input Schema**:
```json
{
  "error_vectors": {
    "joints": [
      {"name": "wrist", "delta": [0.05, -0.02], "angle_diff": 15.2},
      {"name": "index_tip", "delta": [-0.03, 0.08], "angle_diff": 8.1}
    ],
    "max_error_joint": "wrist",
    "overall_score": 72
  },
  "pack_context": "sign_language",
  "current_gesture": "hello",
  "user_question": null
}
```

**Gemini Prompt Template**:
```
You are SecondHand's motion coach. Generate 1-2 SHORT, actionable cues.

Context: Teaching {pack_context} - {current_gesture}
User's score: {overall_score}/100
Biggest issue: {max_error_joint} is off by {delta}

Rules:
- Maximum 8 words per cue
- Never lecture or moralize
- Be encouraging but direct
- Only mention the most important fix

Generate the coaching cue:
```

**Output**: 
```json
{
  "cue": "Rotate wrist slightly left",
  "priority": "high",
  "joint_focus": "wrist"
}
```

### ElevenLabs Voice Synthesis

**Purpose**: Convert text cues into natural, encouraging voice

**Voice Settings**:
```json
{
  "voice_id": "21m00Tcm4TlvDq8ikWAM",  // Rachel - warm, professional
  "model_id": "eleven_turbo_v2",
  "voice_settings": {
    "stability": 0.75,
    "similarity_boost": 0.85,
    "style": 0.3,
    "use_speaker_boost": true
  }
}
```

**Endpoint Flow**:
1. Gemini generates text cue
2. Text sent to ElevenLabs `/v1/text-to-speech/{voice_id}`
3. Audio streamed back as MP3
4. Frontend plays via Web Audio API with fade-in

**Caching Strategy**:
- Cache common cues locally
- Only generate for unique/contextual cues
- Reduces latency to <200ms for repeated cues

---

## Algorithmic Specifications

### Keypoint Normalization
```typescript
function normalizeKeypoints(keypoints: Keypoint[]): NormalizedKeypoint[] {
  // 1. Find anchor (wrist for hands, hips for body)
  const anchor = keypoints.find(k => k.name === 'wrist');
  
  // 2. Calculate scale factor (wrist to middle fingertip)
  const middleTip = keypoints.find(k => k.name === 'middle_tip');
  const scale = distance(anchor, middleTip);
  
  // 3. Translate to origin and scale
  return keypoints.map(kp => ({
    ...kp,
    x: (kp.x - anchor.x) / scale,
    y: (kp.y - anchor.y) / scale,
    confidence: kp.confidence
  }));
}
```

### Similarity Score Calculation
```typescript
function calculateSimilarity(user: NormalizedKeypoint[], expert: NormalizedKeypoint[]): number {
  let totalError = 0;
  let totalWeight = 0;
  
  for (let i = 0; i < user.length; i++) {
    const posError = euclideanDistance(user[i], expert[i]);
    const angleError = angleDifference(user[i], expert[i]);
    const weight = user[i].confidence * JOINT_IMPORTANCE[user[i].name];
    
    totalError += (posError * 0.6 + angleError * 0.4) * weight;
    totalWeight += weight;
  }
  
  const rawScore = 100 - (totalError / totalWeight) * K_FACTOR;
  return Math.max(0, Math.min(100, rawScore));
}
```

### EMA Smoothing
```typescript
class EMASmoothing {
  private alpha: number;
  private value: number | null = null;
  
  constructor(alpha = 0.3) {
    this.alpha = alpha;
  }
  
  update(newValue: number): number {
    if (this.value === null) {
      this.value = newValue;
    } else {
      this.value = this.alpha * newValue + (1 - this.alpha) * this.value;
    }
    return this.value;
  }
}
```

### Deterministic Cue Mapping
```typescript
const CUE_RULES: CueRule[] = [
  {
    condition: (errors) => errors.fingerSpread < 0.7,
    cue: "Open your fingers wider",
    priority: 1
  },
  {
    condition: (errors) => Math.abs(errors.wristRotation) > 20,
    cue: errors.wristRotation > 0 ? "Rotate wrist right" : "Rotate wrist left",
    priority: 2
  },
  {
    condition: (errors) => errors.elbowAngle < 160,
    cue: "Lock your elbows straight",
    priority: 1
  },
  {
    condition: (errors) => errors.verticalOffset > 0.1,
    cue: errors.verticalOffset > 0 ? "Lower your hand" : "Raise your hand",
    priority: 3
  },
  {
    condition: (errors) => errors.timingLag > 0.5,
    cue: errors.timingLag > 0 ? "Speed up slightly" : "Slow down slightly",
    priority: 2
  }
];

function getDeterministicCue(errors: ErrorVector): string | null {
  const applicableRules = CUE_RULES
    .filter(rule => rule.condition(errors))
    .sort((a, b) => a.priority - b.priority);
  
  return applicableRules[0]?.cue ?? null;
}
```

---

## Demo Flow Script

### 0-5 seconds
> "This is SecondHand. It teaches physical skills by overlaying an expert's motion onto your body."

### 5-15 seconds
- Judge steps up to webcam
- Camera activates, ghost appears
- Alignment begins instantly

### 15-35 seconds
- Judge attempts gesture
- System highlights drift on wrist
- Voice (ElevenLabs): "Open fingers slightly"
- Judge corrects, score jumps from 65 → 82

### 35-55 seconds
- Activate loop mode on 3-second segment
- Show improvement trend: Attempt 1 (68) → Attempt 3 (89)
- Voice: "Great improvement!"

### Close
> "This scales into packs: sign language, CPR, piano, sports, rehab — anything where form matters."

---

