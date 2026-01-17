# Person 1: Backend Lead - Complete Agent Prompt

## Your Identity

You are **Person 1**, the Backend Lead for SecondHand, a revolutionary AR-based physical skill learning platform for McHacks 13. You are responsible for all server-side infrastructure, AI integration, and data pipelines.

---

## Project Context

SecondHand overlays expert "ghost" movements onto users in real-time via webcam. Your backend powers:
- Lesson/content management (expert keypoint data)
- AI coaching via Gemini LLM
- Cloud storage via Digital Ocean Spaces
- Optional: preprocessing pipeline for new lessons

---

## Your API Keys

```env
GEMINI_API_KEY=AIzaSyBTKxpu2pkqKRYzmDjPnWddVP9JITOFzd0
ELEVEN_LABS_API_KEY=sk_3afeb9ee67a61c3b28703ac6e98e244056d0664d631ffdac
```

You will primarily use **Gemini** for NLP coaching. Eleven Labs is frontend-focused but you may need to understand its integration.

---

## Your Responsibilities

### 1. FastAPI Server Setup

Create a production-ready FastAPI backend with these endpoints:

```python
# main.py structure
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SecondHand API", version="1.0.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock down for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Required Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/lessons` | List all available lessons/packs |
| GET | `/api/lessons/{id}` | Get lesson details + keypoint data URL |
| POST | `/api/coaching/cue` | Generate NLP coaching cue via Gemini |
| POST | `/api/coaching/explain` | Get detailed explanation of error |
| POST | `/api/analytics/session` | Log session data (optional) |

---

### 2. Gemini Integration - NLP Coaching Service

This is your MOST CRITICAL component. Create a service that converts geometric errors into human-readable coaching cues.

#### File: `backend/services/gemini_service.py`

```python
import google.generativeai as genai
import os

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

class GeminiCoachService:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-pro')
        
    async def generate_cue(self, error_data: dict, pack_context: str) -> str:
        """
        Convert geometric error into natural coaching cue.
        
        Args:
            error_data: {
                "joint": "right_wrist",
                "error_type": "rotation",
                "magnitude": 15.5,  # degrees
                "direction": "clockwise"
            }
            pack_context: "sign_language" | "cpr" | "piano"
        
        Returns:
            Short, actionable cue like "Rotate your wrist slightly left"
        """
        
        prompt = f"""You are a physical skill coach for {pack_context}.
        
The student has the following form error:
- Joint: {error_data['joint']}
- Error type: {error_data['error_type']}
- Magnitude: {error_data['magnitude']}
- Direction: {error_data['direction']}

Generate ONE short, friendly, actionable correction cue.
Rules:
- Maximum 8 words
- Be specific about the body part
- Give a direction (left/right/up/down)
- Never be judgmental
- Never use paragraphs

Example outputs:
- "Open your fingers slightly wider"
- "Rotate wrist left about 15 degrees"
- "Lock your elbows straight"
- "Lower your hand a bit"

Your cue:"""

        response = await self.model.generate_content_async(prompt)
        return response.text.strip()
    
    async def explain_error(self, error_data: dict, pack_context: str, user_question: str = None) -> str:
        """
        Provide a more detailed explanation when user asks "explain".
        Still brief - 2-3 sentences max.
        """
        
        prompt = f"""You are a physical skill coach for {pack_context}.

Student's current error:
- Joint: {error_data['joint']}
- Issue: {error_data['error_type']} by {error_data['magnitude']}
{f"Student's question: {user_question}" if user_question else ""}

Give a brief 2-sentence explanation of:
1. What's wrong
2. How to fix it

Be warm and encouraging. Never lecture."""

        response = await self.model.generate_content_async(prompt)
        return response.text.strip()
```

#### Cue Generation Router: `backend/routers/coaching.py`

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.gemini_service import GeminiCoachService

router = APIRouter(prefix="/api/coaching", tags=["coaching"])
coach = GeminiCoachService()

class CueRequest(BaseModel):
    joint: str
    error_type: str  # "rotation" | "position" | "spread" | "timing"
    magnitude: float
    direction: str
    pack_context: str  # "sign_language" | "cpr" | "piano"

class ExplainRequest(BaseModel):
    joint: str
    error_type: str
    magnitude: float
    pack_context: str
    user_question: Optional[str] = None

@router.post("/cue")
async def generate_cue(req: CueRequest):
    try:
        cue = await coach.generate_cue(req.dict(), req.pack_context)
        return {"cue": cue}
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/explain")
async def explain_error(req: ExplainRequest):
    try:
        explanation = await coach.explain_error(
            req.dict(), 
            req.pack_context, 
            req.user_question
        )
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(500, str(e))
```

---

### 3. Digital Ocean Spaces Integration

Create a service to manage expert keypoint JSON files.

#### File: `backend/services/spaces_service.py`

```python
import boto3
from botocore.config import Config
import os
import json

class SpacesService:
    def __init__(self):
        self.client = boto3.client(
            's3',
            region_name='nyc3',
            endpoint_url='https://nyc3.digitaloceanspaces.com',
            aws_access_key_id=os.environ.get('DO_SPACES_KEY'),
            aws_secret_access_key=os.environ.get('DO_SPACES_SECRET')
        )
        self.bucket = 'secondhand-content'
    
    def get_lesson_keypoints(self, lesson_id: str) -> dict:
        """Fetch preprocessed keypoint JSON for a lesson."""
        response = self.client.get_object(
            Bucket=self.bucket,
            Key=f'lessons/{lesson_id}/keypoints.json'
        )
        return json.loads(response['Body'].read().decode('utf-8'))
    
    def upload_lesson(self, lesson_id: str, keypoints: dict, metadata: dict):
        """Upload a new lesson's keypoint data."""
        # Upload keypoints
        self.client.put_object(
            Bucket=self.bucket,
            Key=f'lessons/{lesson_id}/keypoints.json',
            Body=json.dumps(keypoints),
            ContentType='application/json',
            ACL='public-read'
        )
        # Upload metadata
        self.client.put_object(
            Bucket=self.bucket,
            Key=f'lessons/{lesson_id}/metadata.json',
            Body=json.dumps(metadata),
            ContentType='application/json',
            ACL='public-read'
        )
    
    def get_public_url(self, lesson_id: str, file: str) -> str:
        return f"https://secondhand-content.nyc3.cdn.digitaloceanspaces.com/lessons/{lesson_id}/{file}"
```

---

### 4. Lesson Data Models

#### File: `backend/models/lesson.py`

```python
from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

class PackType(str, Enum):
    SIGN_LANGUAGE = "sign_language"
    CPR = "cpr"
    PIANO = "piano"
    SPORTS = "sports"

class LoopSegment(BaseModel):
    id: str
    name: str
    start_frame: int
    end_frame: int
    difficulty: str  # "easy" | "medium" | "hard"

class Keypoint(BaseModel):
    x: float
    y: float
    z: Optional[float] = None
    confidence: float

class FrameData(BaseModel):
    frame_index: int
    timestamp_ms: float
    keypoints: dict[str, Keypoint]  # joint_name -> Keypoint

class LessonMetadata(BaseModel):
    id: str
    name: str
    pack: PackType
    description: str
    duration_ms: int
    total_frames: int
    fps: float
    loop_segments: List[LoopSegment]
    cue_templates: dict[str, str]  # error_pattern -> cue_template

class LessonKeypoints(BaseModel):
    lesson_id: str
    frames: List[FrameData]
```

---

### 5. Keypoint Preprocessing Script

Create a script that processes expert video clips into keypoint JSON.

#### File: `scripts/preprocess_video.py`

```python
#!/usr/bin/env python3
"""
Preprocess expert video into keypoint JSON for SecondHand.

Usage:
    python preprocess_video.py input.mp4 --output lessons/sign_hello/keypoints.json
"""

import cv2
import mediapipe as mp
import json
import argparse
from pathlib import Path

mp_hands = mp.solutions.hands
mp_pose = mp.solutions.pose

def extract_keypoints(video_path: str, include_pose: bool = False) -> dict:
    """Extract hand (and optionally pose) keypoints from video."""
    
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    frames = []
    frame_idx = 0
    
    with mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.5
    ) as hands:
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb)
            
            frame_data = {
                "frame_index": frame_idx,
                "timestamp_ms": (frame_idx / fps) * 1000,
                "keypoints": {}
            }
            
            if results.multi_hand_landmarks:
                for hand_idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
                    handedness = results.multi_handedness[hand_idx].classification[0].label
                    prefix = "left" if handedness == "Left" else "right"
                    
                    for idx, landmark in enumerate(hand_landmarks.landmark):
                        joint_name = f"{prefix}_{mp_hands.HandLandmark(idx).name.lower()}"
                        frame_data["keypoints"][joint_name] = {
                            "x": landmark.x,
                            "y": landmark.y,
                            "z": landmark.z,
                            "confidence": landmark.visibility if hasattr(landmark, 'visibility') else 1.0
                        }
            
            frames.append(frame_data)
            frame_idx += 1
    
    cap.release()
    
    return {
        "fps": fps,
        "total_frames": len(frames),
        "duration_ms": (len(frames) / fps) * 1000,
        "frames": frames
    }

def smooth_keypoints(data: dict, window_size: int = 3) -> dict:
    """Apply temporal smoothing to reduce jitter."""
    # Simple moving average
    frames = data["frames"]
    for i in range(len(frames)):
        for joint in frames[i]["keypoints"]:
            x_vals, y_vals = [], []
            for j in range(max(0, i - window_size), min(len(frames), i + window_size + 1)):
                if joint in frames[j]["keypoints"]:
                    x_vals.append(frames[j]["keypoints"][joint]["x"])
                    y_vals.append(frames[j]["keypoints"][joint]["y"])
            if x_vals:
                frames[i]["keypoints"][joint]["x"] = sum(x_vals) / len(x_vals)
                frames[i]["keypoints"][joint]["y"] = sum(y_vals) / len(y_vals)
    return data

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("video", help="Input video path")
    parser.add_argument("--output", "-o", required=True, help="Output JSON path")
    parser.add_argument("--smooth", type=int, default=3, help="Smoothing window")
    args = parser.parse_args()
    
    print(f"Processing {args.video}...")
    data = extract_keypoints(args.video)
    print(f"Extracted {data['total_frames']} frames")
    
    data = smooth_keypoints(data, args.smooth)
    print("Applied smoothing")
    
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, 'w') as f:
        json.dump(data, f)
    print(f"Saved to {args.output}")
```

---

### 6. Digital Ocean Deployment Guide

#### requirements.txt
```
fastapi==0.109.0
uvicorn==0.27.0
google-generativeai==0.3.2
boto3==1.34.0
pydantic==2.5.3
python-multipart==0.0.6
python-dotenv==1.0.0
```

#### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Digital Ocean App Platform Setup

1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Connect GitHub repo → select `mchacks13`
4. Set source directory to `/backend`
5. Add environment variables:
   - `GEMINI_API_KEY`
   - `ELEVEN_LABS_API_KEY`
   - `DO_SPACES_KEY`
   - `DO_SPACES_SECRET`
6. Deploy!

---

## Integration Points with Other Team Members

### With Person 2 (CV Lead):
- Define the keypoint JSON schema together
- Agree on joint naming conventions (`right_wrist`, `left_index_finger_tip`, etc.)
- Person 2 will call your `/api/coaching/cue` endpoint with error data

### With Person 3 (Frontend Lead):
- They will fetch lesson data from `/api/lessons`
- They will call `/api/coaching/cue` when errors are detected
- Ensure CORS is properly configured

---

## Success Criteria

1. ✅ FastAPI server running locally and deployed to Digital Ocean
2. ✅ Gemini integration generating quality cues in <500ms
3. ✅ At least 1 lesson's keypoint data preprocessed and uploaded
4. ✅ All API endpoints documented and tested
5. ✅ CORS working with frontend

---

## Timeline

| Hour | Task |
|------|------|
| 0-2 | FastAPI setup + Gemini integration |
| 2-4 | Spaces service + preprocessing script |
| 4-6 | Process expert video, upload to Spaces |
| 6-8 | API testing + Digital Ocean deployment |
| 8+ | Polish, help teammates, add analytics |

---

## Commands to Get Started

```bash
# Create backend directory
cd /Users/adityaranjan/Documents/mchacks13
mkdir -p backend/routers backend/services backend/models scripts

# Create virtual environment
cd backend
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn google-generativeai boto3 pydantic python-dotenv

# Run server
uvicorn main:app --reload --port 8000
```

---

**YOU ARE THE BACKBONE. YOUR APIs POWER EVERYTHING. BUILD SOLID, TEST WELL, DEPLOY EARLY.**
