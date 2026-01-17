# PERSON 1: Backend + AI Agent Prompt

## MISSION
You are building the **backend infrastructure** for SecondHand, a real-time motion learning app. Your job is to create the FastAPI server that powers AI coaching (Gemini) and voice synthesis (ElevenLabs).

---

## API KEYS (USE THESE EXACTLY)
```
GEMINI_API_KEY=AIzaSyBTKxpu2pkqKRYzmDjPnWddVP9JITOFzd0
ELEVENLABS_API_KEY=sk_3afeb9ee67a61c3b28703ac6e98e244056d0664d631ffdac
```

---

## DIRECTORY STRUCTURE TO CREATE
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI entry point
│   ├── config.py               # Environment config
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── coach.py            # Gemini coaching endpoints
│   │   ├── voice.py            # ElevenLabs TTS endpoints
│   │   ├── preprocess.py       # Video processing endpoints
│   │   └── health.py           # Health check
│   ├── services/
│   │   ├── __init__.py
│   │   ├── gemini_service.py   # Gemini API wrapper
│   │   ├── elevenlabs_service.py # ElevenLabs wrapper
│   │   └── cache_service.py    # Redis/in-memory cache
│   ├── models/
│   │   ├── __init__.py
│   │   ├── requests.py         # Pydantic request models
│   │   └── responses.py        # Pydantic response models
│   └── utils/
│       ├── __init__.py
│       └── prompts.py          # Gemini prompt templates
├── preprocessing/
│   ├── extract_keypoints.py
│   ├── normalize_data.py
│   └── generate_segments.py
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

---

## FILE: requirements.txt
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-dotenv==1.0.0
pydantic==2.5.3
httpx==0.26.0
google-generativeai==0.3.2
aiohttp==3.9.1
python-multipart==0.0.6
redis==5.0.1
mediapipe==0.10.9
opencv-python-headless==4.9.0.80
numpy==1.26.3
```

---

## FILE: app/config.py
```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    gemini_api_key: str
    elevenlabs_api_key: str
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel voice
    redis_url: str = "redis://localhost:6379"
    cors_origins: list[str] = ["http://localhost:3000", "https://*.vercel.app"]
    
    class Config:
        env_file = ".env"

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

---

## FILE: app/main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import coach, voice, preprocess, health
from app.config import get_settings

app = FastAPI(
    title="SecondHand API",
    description="AI coaching backend for motion learning",
    version="1.0.0"
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(coach.router, prefix="/api/coach", tags=["coach"])
app.include_router(voice.router, prefix="/api/voice", tags=["voice"])
app.include_router(preprocess.router, prefix="/api/preprocess", tags=["preprocess"])

@app.get("/")
async def root():
    return {"status": "SecondHand API running", "version": "1.0.0"}
```

---

## FILE: app/models/requests.py
```python
from pydantic import BaseModel
from typing import Optional

class JointError(BaseModel):
    name: str
    delta_x: float
    delta_y: float
    angle_diff: float
    confidence: float

class CoachingRequest(BaseModel):
    error_vectors: list[JointError]
    max_error_joint: str
    overall_score: float
    pack_context: str = "sign_language"
    current_gesture: str = "hello"
    user_question: Optional[str] = None

class VoiceSynthRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    stability: float = 0.75
    similarity_boost: float = 0.85
```

---

## FILE: app/services/gemini_service.py
```python
import google.generativeai as genai
from app.config import get_settings
from app.models.requests import CoachingRequest

settings = get_settings()
genai.configure(api_key=settings.gemini_api_key)

COACHING_PROMPT = """You are SecondHand's motion coach. Generate 1-2 SHORT, actionable cues.

Context: Teaching {pack_context} - gesture: {current_gesture}
User's alignment score: {score}/100
Biggest issue: {max_joint} joint is off

Error details:
{error_details}

RULES (CRITICAL):
- Maximum 8 words per cue
- Never lecture or moralize
- Be encouraging but direct
- Focus on the single most important fix
- Use simple body terms: "wrist", "fingers", "elbow"

Generate ONE coaching cue:"""

class GeminiService:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-pro')
    
    async def generate_cue(self, request: CoachingRequest) -> str:
        error_details = "\n".join([
            f"- {e.name}: position delta ({e.delta_x:.2f}, {e.delta_y:.2f}), angle diff: {e.angle_diff:.1f}°"
            for e in sorted(request.error_vectors, key=lambda x: abs(x.angle_diff), reverse=True)[:3]
        ])
        
        prompt = COACHING_PROMPT.format(
            pack_context=request.pack_context,
            current_gesture=request.current_gesture,
            score=request.overall_score,
            max_joint=request.max_error_joint,
            error_details=error_details
        )
        
        response = await self.model.generate_content_async(prompt)
        return response.text.strip().strip('"')

gemini_service = GeminiService()
```

---

## FILE: app/services/elevenlabs_service.py
```python
import httpx
from app.config import get_settings

settings = get_settings()

ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech"

class ElevenLabsService:
    def __init__(self):
        self.api_key = settings.elevenlabs_api_key
        self.default_voice = settings.elevenlabs_voice_id
    
    async def synthesize(
        self,
        text: str,
        voice_id: str | None = None,
        stability: float = 0.75,
        similarity_boost: float = 0.85
    ) -> bytes:
        voice = voice_id or self.default_voice
        url = f"{ELEVENLABS_URL}/{voice}"
        
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
        }
        
        payload = {
            "text": text,
            "model_id": "eleven_turbo_v2",
            "voice_settings": {
                "stability": stability,
                "similarity_boost": similarity_boost,
                "style": 0.3,
                "use_speaker_boost": True
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return response.content

elevenlabs_service = ElevenLabsService()
```

---

## FILE: app/routers/coach.py
```python
from fastapi import APIRouter, HTTPException
from app.models.requests import CoachingRequest
from app.services.gemini_service import gemini_service

router = APIRouter()

@router.post("/cue")
async def generate_coaching_cue(request: CoachingRequest):
    """Generate an AI coaching cue from error vectors"""
    try:
        cue = await gemini_service.generate_cue(request)
        return {
            "cue": cue,
            "joint_focus": request.max_error_joint,
            "score": request.overall_score
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/explain")
async def explain_error(request: CoachingRequest):
    """Generate detailed explanation for user question"""
    if not request.user_question:
        request.user_question = "What am I doing wrong?"
    cue = await gemini_service.generate_cue(request)
    return {"explanation": cue}
```

---

## FILE: app/routers/voice.py
```python
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.models.requests import VoiceSynthRequest
from app.services.elevenlabs_service import elevenlabs_service

router = APIRouter()

# Cache for common cues
CUE_CACHE: dict[str, bytes] = {}

@router.post("/synthesize")
async def synthesize_voice(request: VoiceSynthRequest):
    """Convert text to speech using ElevenLabs"""
    cache_key = request.text.lower().strip()
    
    # Check cache first
    if cache_key in CUE_CACHE:
        return Response(
            content=CUE_CACHE[cache_key],
            media_type="audio/mpeg"
        )
    
    try:
        audio = await elevenlabs_service.synthesize(
            text=request.text,
            voice_id=request.voice_id,
            stability=request.stability,
            similarity_boost=request.similarity_boost
        )
        
        # Cache if it's a short cue
        if len(request.text) < 50:
            CUE_CACHE[cache_key] = audio
        
        return Response(content=audio, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/voices")
async def list_voices():
    """List available ElevenLabs voices"""
    return {
        "default": "21m00Tcm4TlvDq8ikWAM",
        "voices": [
            {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel", "style": "warm"},
            {"id": "AZnzlk1XvdvUeBnXmlld", "name": "Domi", "style": "energetic"},
            {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Bella", "style": "soft"}
        ]
    }
```

---

## FILE: preprocessing/extract_keypoints.py
```python
#!/usr/bin/env python3
"""Extract keypoints from expert video and save as JSON"""
import cv2
import mediapipe as mp
import json
import sys
from pathlib import Path

mp_hands = mp.solutions.hands
mp_pose = mp.solutions.pose

def extract_hand_keypoints(video_path: str, output_path: str):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frames = []
    
    with mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.7
    ) as hands:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb)
            
            frame_data = {"timestamp": len(frames) / fps, "hands": []}
            
            if results.multi_hand_landmarks:
                for hand in results.multi_hand_landmarks:
                    keypoints = [
                        {"x": lm.x, "y": lm.y, "z": lm.z}
                        for lm in hand.landmark
                    ]
                    frame_data["hands"].append(keypoints)
            
            frames.append(frame_data)
    
    cap.release()
    
    with open(output_path, 'w') as f:
        json.dump({"fps": fps, "frames": frames}, f, indent=2)
    
    print(f"Extracted {len(frames)} frames to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python extract_keypoints.py <video.mp4> <output.json>")
        sys.exit(1)
    extract_hand_keypoints(sys.argv[1], sys.argv[2])
```

---

## INTEGRATION API CONTRACT

### Endpoint: POST /api/coach/cue
**Frontend calls this when:** Score drops or user says "explain"

Request:
```json
{
  "error_vectors": [
    {"name": "wrist", "delta_x": 0.05, "delta_y": -0.02, "angle_diff": 15.2, "confidence": 0.95}
  ],
  "max_error_joint": "wrist",
  "overall_score": 72,
  "pack_context": "sign_language",
  "current_gesture": "hello"
}
```

Response:
```json
{
  "cue": "Rotate wrist slightly left",
  "joint_focus": "wrist",
  "score": 72
}
```

### Endpoint: POST /api/voice/synthesize
**Frontend calls this when:** New cue generated

Request:
```json
{"text": "Rotate wrist slightly left"}
```

Response: `audio/mpeg` binary

---

## STARTUP COMMANDS
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with API keys
uvicorn app.main:app --reload --port 8000
```

## DOCKER
```bash
docker build -t secondhand-backend .
docker run -p 8000:8000 --env-file .env secondhand-backend
```
