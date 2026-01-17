# SecondHand - McHacks 13 Master Implementation Plan

> **"Learn physical skills from invisible teachers"** - Real-time AR motion learning platform

---

## Executive Summary

SecondHand is a revolutionary real-time motion learning platform that overlays expert "ghost" movements onto users' bodies using computer vision. The system provides instant alignment scoring, drift highlighting, voice coaching, and loop-based micro-drills to teach physical skills like sign language, CPR, piano technique, and sports form.

### API Keys Available
- **ElevenLabs**: `sk_3afeb9ee67a61c3b28703ac6e98e244056d0664d631ffdac` - For premium voice synthesis (coaching feedback)
- **Gemini**: `AIzaSyBTKxpu2pkqKRYzmDjPnWddVP9JITOFzd0` - For NLP coaching and intelligent cue generation

### DigitalOcean Integration Strategy
We will use **DigitalOcean App Platform + Spaces** for:
1. **App Platform**: Host the FastAPI backend for video preprocessing, lesson generation, and analytics
2. **Spaces (S3-compatible)**: Store expert video clips, preprocessed keypoint JSON files, and user-generated content
3. **Managed Database** (optional): PostgreSQL for user progress tracking and lesson metadata

---

## Technology Stack (Enhanced)

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework with App Router |
| TailwindCSS | Utility-first styling |
| Zustand | Lightweight state management |
| Canvas2D/Three.js | Ghost overlay rendering |
| MediaPipe (JS) | In-browser hand/pose detection |
| Web Audio API | Audio capture and playback |

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI (Python) | API server for preprocessing and AI coaching |
| MediaPipe (Python) | Expert video keypoint extraction |
| OpenCV | Video processing and frame extraction |
| **Gemini API** | NLP coaching - converts geometric errors to human cues |
| **ElevenLabs API** | Text-to-speech for voice coaching feedback |
| DigitalOcean Spaces | CDN for expert keypoints and videos |
| DigitalOcean App Platform | Backend deployment |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Vercel | Frontend deployment |
| DigitalOcean App Platform | Backend deployment |
| DigitalOcean Spaces | Object storage (S3-compatible) |
| GitHub Actions | CI/CD pipeline |

---

## System Architecture

```mermaid
graph TB
    subgraph "Frontend (Vercel)"
        A[Next.js App] --> B[Camera Capture Layer]
        A --> C[MediaPipe JS - Perception]
        A --> D[Alignment Engine]
        A --> E[Ghost Renderer - Canvas2D]
        A --> F[Voice Commands - SpeechRecognition]
    end
    
    subgraph "Backend (DigitalOcean App Platform)"
        G[FastAPI Server] --> H[Video Preprocessing Pipeline]
        G --> I[Gemini NLP Coach]
        G --> J[ElevenLabs Voice Synthesis]
        H --> K[MediaPipe Python - Keypoint Extraction]
    end
    
    subgraph "Storage (DigitalOcean Spaces)"
        L[Expert Keypoints JSON]
        M[Expert Video Clips]
        N[Pack Metadata]
    end
    
    A <--> G
    G <--> L
    G <--> M
    G <--> N
    A --> L
```

---

## 8 System Layers (Detailed)

### Layer 1: Experience Layer (UI/UX)
- Landing page with pack selection
- Calibration screen ("hold hands up" / "stand in frame")
- Session view with ghost overlay, score meter, cues
- Recap screen with improvement stats

### Layer 2: Capture Layer
- `getUserMedia()` for camera access
- 30 FPS lock with mirrored view toggle
- Web Audio API for voice commands
- Lighting quality warnings

### Layer 3: Perception Layer
- MediaPipe Hands (21 keypoints/hand)
- MediaPipe Pose (33 keypoints for body - CPR/sports)
- Confidence gating and temporal smoothing
- Occlusion-aware prompts

### Layer 4: Alignment Layer (THE MAGIC)
- Spatial alignment: normalize + scale + anchor mapping
- Temporal alignment: frame-by-frame similarity with phase lock
- Reference lengths: wrist→middle_tip (hands), shoulder width (body)

### Layer 5: Feedback Layer
- Ghost skeleton rendering (lines/joints)
- Per-frame similarity score (0-100) with EMA smoothing
- Joint glow intensity proportional to error
- Directional arrows for correction

### Layer 6: Coach Layer
- Voice commands: "start", "loop", "slow", "explain"
- Deterministic cue mapping (error→text)
- Gemini API for natural phrasing polish
- ElevenLabs for voice synthesis

### Layer 7: Content Layer (Packs)
- Expert keypoints per frame (JSON)
- Segment markers (loop zones)
- Cue mapping templates
- Difficulty tags

### Layer 8: Infrastructure Layer
- Vercel for frontend
- DigitalOcean App Platform for backend
- DigitalOcean Spaces for storage
- Simple analytics (session starts, completion, score improvement)

---

## MVP Scope for McHacks

### Core Features (MUST HAVE)
1. ✅ Live ghost overlay with stable alignment
2. ✅ Alignment score + improvement trend
3. ✅ Drift highlighting (top joints)
4. ✅ Loop mode micro-drills
5. ✅ Voice commands (loop, explain)
6. ✅ ONE pack fully polished (Sign Language)

### Stretch Features
- Adaptive phase-lock ghost
- Multi-angle camera support
- Ghost fade-out training
- Replay mode (side-by-side)
- Upload-to-lesson pipeline
- Live remote coach (WebRTC)

---

## DigitalOcean Setup Instructions

### Step 1: Create DigitalOcean Account
1. Go to https://www.digitalocean.com/
2. Create account or login
3. Add payment method (you get $200 free credits for 60 days)

### Step 2: Create a Space (Object Storage)
1. Go to **Spaces** in the left menu
2. Click **Create a Space**
3. Choose region: **NYC3** or **SFO3** (closest to you)
4. Name: `secondhand-assets`
5. Enable CDN (for faster delivery)
6. Generate **Spaces Access Keys**:
   - Go to **API** → **Spaces Keys**
   - Generate new key
   - Save the **Access Key** and **Secret Key**

### Step 3: Create App Platform App
1. Go to **App Platform**
2. Click **Create App**
3. Connect your GitHub repo
4. Configure:
   - Source: `mchacks13` repo
   - Build command: `pip install -r requirements.txt`
   - Run command: `uvicorn main:app --host 0.0.0.0 --port 8080`
5. Add environment variables:
   ```
   ELEVEN_LABS_API_KEY=sk_3afeb9ee67a61c3b28703ac6e98e244056d0664d631ffdac
   GEMINI_API_KEY=AIzaSyBTKxpu2pkqKRYzmDjPnWddVP9JITOFzd0
   DO_SPACES_KEY=<your-access-key>
   DO_SPACES_SECRET=<your-secret-key>
   DO_SPACES_BUCKET=secondhand-assets
   DO_SPACES_REGION=nyc3
   ```

### Step 4: Configure CORS for Spaces
In Space settings, add CORS rule:
```json
{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}
```

---

## Project Structure

```
mchacks13/
├── frontend/                    # Next.js application
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── calibrate/
│   │   ├── session/
│   │   └── recap/
│   ├── components/
│   │   ├── Camera.tsx          # Camera capture
│   │   ├── GhostOverlay.tsx    # Ghost skeleton renderer
│   │   ├── ScoreMeter.tsx      # Alignment score display
│   │   ├── CueDisplay.tsx      # Correction cues
│   │   ├── LoopBar.tsx         # Loop segment control
│   │   └── VoiceControl.tsx    # Voice commands
│   ├── lib/
│   │   ├── mediapipe.ts        # MediaPipe integration
│   │   ├── alignment.ts        # Alignment algorithms
│   │   ├── scoring.ts          # Similarity scoring
│   │   └── cueMapping.ts       # Error→cue mapping
│   ├── hooks/
│   │   ├── useCamera.ts
│   │   ├── useMediaPipe.ts
│   │   ├── useAlignment.ts
│   │   └── useVoiceCommands.ts
│   └── store/
│       └── sessionStore.ts     # Zustand store
│
├── backend/                     # FastAPI application
│   ├── main.py                 # FastAPI app entrypoint
│   ├── routers/
│   │   ├── preprocessing.py    # Video preprocessing endpoints
│   │   ├── coaching.py         # NLP coaching endpoints
│   │   └── packs.py            # Pack management endpoints
│   ├── services/
│   │   ├── keypoint_extractor.py   # MediaPipe extraction
│   │   ├── gemini_coach.py         # Gemini NLP integration
│   │   ├── elevenlabs_voice.py     # ElevenLabs TTS
│   │   └── spaces_storage.py       # DigitalOcean Spaces
│   ├── models/
│   │   ├── keypoints.py        # Pydantic models
│   │   └── packs.py
│   └── utils/
│       ├── normalization.py    # Keypoint normalization
│       └── smoothing.py        # Temporal smoothing
│
├── packs/                       # Pre-processed pack data
│   └── sign-language/
│       ├── metadata.json
│       ├── lessons/
│       │   ├── hello/
│       │   │   ├── expert.json     # Keypoints
│       │   │   ├── segments.json   # Loop zones
│       │   │   └── cues.json       # Cue templates
│       │   └── thank-you/
│       └── expert-videos/
│
├── scripts/                     # Preprocessing scripts
│   ├── extract_keypoints.py
│   └── generate_pack.py
│
├── .env
├── requirements.txt
└── package.json
```

---

# TEAM DELEGATION

## Overview

The team of 4 will be split as follows:
- **Person 1 (Backend Lead)**: Core CV pipeline, alignment algorithms, preprocessing
- **Person 2 (Backend + AI)**: Gemini NLP coaching, ElevenLabs voice, DigitalOcean infra
- **Person 3 (Frontend Lead)**: Full Next.js app, UI/UX, MediaPipe JS integration
- **Person 4 (You - Coordinator)**: Integration, testing, demo preparation, Git management

---

# PERSON 1: Backend Core Engine Lead

## Responsibilities
- MediaPipe Python integration for keypoint extraction
- Video preprocessing pipeline
- Alignment algorithms (spatial + temporal)
- Similarity scoring engine
- Pack data structure and preprocessing scripts

---

# PERSON 2: Backend AI + Infrastructure Lead

## Responsibilities
- Gemini API integration for NLP coaching
- ElevenLabs API integration for voice synthesis
- DigitalOcean Spaces integration
- FastAPI server setup and deployment
- Real-time coaching endpoint

---

# PERSON 3: Frontend Lead

## Responsibilities
- Complete Next.js 14 application
- MediaPipe JS integration (in-browser)
- Ghost overlay rendering (Canvas2D)
- Voice commands (SpeechRecognition)
- All UI components and styling
- Real-time alignment visualization

---

## Hackathon Timeline

### Pre-Hack (If Allowed)
- [ ] Choose pack: Sign Language
- [ ] Record 1-2 expert clips in excellent lighting
- [ ] Preprocess keypoints → JSON
- [ ] Define 2-3 loop segments

### Day 1
- [ ] **Hour 1-2**: Project setup, repo structure, environment
- [ ] **Hour 3-4**: Camera + MediaPipe keypoints stable
- [ ] **Hour 5-6**: Draw user skeleton overlay
- [ ] **Hour 7-8**: Load expert keypoints and render ghost

### Day 2 (Morning)
- [ ] **Hour 1-2**: Implement spatial alignment
- [ ] **Hour 3-4**: Per-frame similarity score + EMA smoothing
- [ ] **Hour 5-6**: Drift highlighting (top joints)

### Day 2 (Afternoon)
- [ ] **Hour 1-2**: Loop mode (micro-drills) + improvement trend
- [ ] **Hour 3-4**: Deterministic cue mapping
- [ ] **Hour 5-6**: Voice commands integration
- [ ] **Hour 7-8**: Gemini + ElevenLabs integration

### Final 4 Hours
- [ ] Polish visuals (ghost aesthetic)
- [ ] Deploy to Vercel + DigitalOcean
- [ ] Rehearse demo 20+ times
- [ ] Prepare lighting for stage

---

## Demo Script (60 seconds)

**0-5 seconds**
> "This is SecondHand. It teaches physical skills without words — by overlaying an expert's motion onto your body."

**5-15 seconds**
> Judge steps up. Camera opens. Ghost appears.

**15-35 seconds**
> Judge attempts. System highlights one mistake.
> Voice coach: "Open fingers slightly."
> Judge fixes. Score jumps.

**35-55 seconds**
> Loop a 3-second segment. Show improvement trend.

**Close**
> "This scales into packs: sign language, CPR, piano technique, sports form, rehab — anything where form matters."

---

## Verification Plan

### Automated Tests
1. **Unit tests** for alignment algorithms
2. **Unit tests** for similarity scoring
3. **Integration tests** for API endpoints

### Manual Verification
1. Test camera capture across browsers (Chrome, Firefox, Safari)
2. Test MediaPipe detection with various lighting conditions
3. Test ghost overlay alignment accuracy
4. Test voice commands recognition
5. Full user flow test with demo script
6. Stage lighting test with ring light

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Jitter/occlusion breaks illusion | Smoothing + confidence gating, controlled lighting |
| "Just overlaying a video" critique | Make scoring + drift highlights unmistakable |
| Multi-pack scope creep | Demo ONE pack perfectly |
| Voice layer becomes gimmick | Deterministic cues first, LLM phrasing optional |
| Network failures during demo | Bundle expert keypoints in repo, fallback to local |

---

## Why SecondHand Wins McHacks

✅ **Technical difficulty**: Real-time CV + alignment + feedback
✅ **Design**: Beautiful and legible interface
✅ **Utility**: Learning/training/accessibility
✅ **Stage impact**: Judge tries it instantly
✅ **Expandability**: Packs + upload-to-lesson + remote coach

> **It is not a "tool." It's a new interface for learning movement.**
