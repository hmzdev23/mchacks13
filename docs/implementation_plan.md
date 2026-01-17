# SecondHand - McHacks 13 Master Implementation Plan

## Executive Summary

**SecondHand** is an AR-based physical skill learning platform that overlays expert "ghost" movements onto users in real-time, providing instant visual feedback and voice coaching. This document provides a complete implementation strategy with team delegation for 3 developers.

---

## Core Technologies & API Integration

### Provided APIs
| Technology | API Key | Purpose |
|-----------|---------|---------|
| **Eleven Labs** | `sk_3afeb9ee67a61c3b28703ac6e98e244056d0664d631ffdac` | High-quality AI voice synthesis for coaching feedback |
| **Gemini** | `AIzaSyBTKxpu2pkqKRYzmDjPnWddVP9JITOFzd0` | NLP processing for intelligent cue generation & conversational coaching |

### Digital Ocean Integration Strategy

> [!IMPORTANT]
> **Digital Ocean Usage Plan**

1. **App Platform** - Deploy the FastAPI backend
2. **Spaces (S3-compatible)** - Store expert keypoint JSON files and preprocessed video clips
3. **Managed Database (PostgreSQL)** - User sessions, analytics, lesson metadata
4. **Functions (Serverless)** - Video preprocessing pipeline (extract keypoints on upload)

**Setup Instructions for Digital Ocean:**
1. Create a Digital Ocean account at https://cloud.digitalocean.com
2. Create a new **Space** (Object Storage):
   - Name: `secondhand-content`
   - Region: NYC3 (or closest to hackathon)
   - CDN: Enable for fast asset delivery
3. Create **App Platform** app:
   - Connect your GitHub repo
   - Set environment variables for all API keys
   - Auto-deploy on push to `main`
4. Create a **Managed PostgreSQL** database (optional for MVP, but good for analytics)

---

## System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        A[Camera Capture] --> B[MediaPipe Detection]
        B --> C[Alignment Engine]
        C --> D[Ghost Renderer]
        C --> E[Scoring System]
        E --> F[Cue Generator]
        F --> G[Voice Coach]
    end
    
    subgraph "Backend (FastAPI)"
        H[Lesson API]
        I[Upload Pipeline]
        J[Analytics]
    end
    
    subgraph "External Services"
        K[Eleven Labs TTS]
        L[Gemini LLM]
        M[Digital Ocean Spaces]
    end
    
    G --> K
    F --> L
    H --> M
    I --> M
```

---

## Team Delegation Overview

| Person | Role | Focus Areas |
|--------|------|-------------|
| **Person 1** | Backend Lead | FastAPI, Digital Ocean, Preprocessing Pipeline, Gemini Integration |
| **Person 2** | CV/Algorithm Lead | MediaPipe, Alignment Engine, Scoring, Cue Mapping |
| **Person 3** | Frontend Lead | Next.js, UI/UX, Canvas Rendering, Eleven Labs Voice |

---

## Detailed Task Breakdown

### Person 1: Backend & AI Integration

**Primary Responsibilities:**
- FastAPI server setup and deployment
- Digital Ocean infrastructure configuration
- Gemini API integration for NLP coaching
- Lesson/pack data management
- Video preprocessing pipeline

**Files to Create:**
```
backend/
├── main.py                 # FastAPI entry point
├── routers/
│   ├── lessons.py         # CRUD for lessons
│   ├── coaching.py        # Gemini NLP endpoints
│   └── analytics.py       # Session tracking
├── services/
│   ├── gemini_service.py  # Gemini API wrapper
│   ├── spaces_service.py  # Digital Ocean Spaces
│   └── preprocessing.py   # Keypoint extraction
├── models/
│   ├── lesson.py          # Pydantic models
│   └── session.py
└── utils/
    └── keypoint_extractor.py
```

---

### Person 2: Computer Vision & Algorithms

**Primary Responsibilities:**
- MediaPipe Hands + Pose integration
- Real-time keypoint extraction
- Spatial alignment algorithm (anchor + scale normalization)
- Temporal alignment (frame matching)
- Similarity scoring with EMA smoothing
- Deterministic cue mapping (geometry → language)

**Files to Create:**
```
src/lib/cv/
├── mediapipe.ts           # MediaPipe wrapper
├── keypoint-types.ts      # TypeScript interfaces
├── alignment.ts           # Spatial alignment
├── temporal.ts            # Temporal sync
├── scoring.ts             # Similarity metrics
├── smoothing.ts           # EMA + confidence gating
└── cue-mapper.ts          # Error → cue translation
```

---

### Person 3: Frontend & Voice

**Primary Responsibilities:**
- Next.js application setup
- Camera capture with getUserMedia
- Canvas-based ghost overlay rendering
- UI components (score display, loop controls, cue display)
- Eleven Labs voice integration
- Voice command recognition (SpeechRecognition API)

**Files to Create:**
```
src/
├── app/
│   ├── page.tsx           # Landing/pack selection
│   ├── session/
│   │   └── page.tsx       # Main practice session
│   └── layout.tsx
├── components/
│   ├── Camera.tsx
│   ├── GhostOverlay.tsx
│   ├── ScoreDisplay.tsx
│   ├── LoopControls.tsx
│   ├── CueDisplay.tsx
│   └── VoiceCoach.tsx
├── hooks/
│   ├── useCamera.ts
│   ├── useMediaPipe.ts
│   └── useVoice.ts
└── services/
    └── elevenlabs.ts
```

---

## MVP Feature Scope (MUST HAVE)

1. ✅ Camera capture with stable 30fps
2. ✅ MediaPipe hand/pose detection
3. ✅ Ghost skeleton overlay rendering
4. ✅ Spatial alignment (anchor + scale)
5. ✅ Real-time similarity score (0-100)
6. ✅ Drift highlighting (top 3 joints)
7. ✅ Loop mode for micro-drills
8. ✅ Deterministic cue mapping (5 cues)
9. ✅ ONE pack fully working (Sign Language OR CPR)

## Stretch Features

- Voice commands via SpeechRecognition
- Eleven Labs voice coaching
- Gemini-powered natural language cues
- Upload-to-lesson pipeline
- Multiple packs

---

## Demo Script (55 seconds)

| Time | Action |
|------|--------|
| 0-5s | "This is SecondHand. It teaches physical skills by overlaying an expert's motion onto your body." |
| 5-15s | Judge approaches. Camera opens. Ghost appears. |
| 15-35s | Judge attempts. System highlights mistake. Voice: "Open fingers slightly." Judge fixes. Score jumps. |
| 35-55s | Loop a 3-second segment. Show improvement trend. |
| Close | "This scales into packs: sign language, CPR, piano, sports, rehab." |

---

## File Structure

```
mchacks13/
├── .env                    # API keys
├── backend/               # FastAPI (Person 1)
├── src/                   # Next.js frontend
│   ├── app/              # Pages (Person 3)
│   ├── components/       # UI (Person 3)
│   ├── lib/
│   │   └── cv/           # CV algorithms (Person 2)
│   ├── hooks/            # React hooks (Person 3)
│   └── services/         # API clients (All)
├── public/
│   └── packs/            # Expert keypoint JSONs
├── scripts/              # Preprocessing (Person 1)
└── README.md
```

---

## Next Steps

1. Review this plan
2. See individual detailed prompts:
   - [Person 1 Prompt](file:///Users/adityaranjan/.gemini/antigravity/brain/f1493f63-29d7-4d51-9521-668a303ef73c/person1_backend_prompt.md)
   - [Person 2 Prompt](file:///Users/adityaranjan/.gemini/antigravity/brain/f1493f63-29d7-4d51-9521-668a303ef73c/person2_cv_prompt.md)
   - [Person 3 Prompt](file:///Users/adityaranjan/.gemini/antigravity/brain/f1493f63-29d7-4d51-9521-668a303ef73c/person3_frontend_prompt.md)
