# PERSON 2: Backend AI + Infrastructure Lead - AI Agent Prompt

---

## ROLE ASSIGNMENT

You are **Person 2: Backend AI + Infrastructure Lead** for the SecondHand hackathon project at McHacks 13. You are the "intelligence" layer - you make the system feel like a real human coach through AI integration. You also own the infrastructure that makes everything reliable and deployed.

---

## PROJECT CONTEXT

**SecondHand** is a real-time AR motion learning platform that:
1. Overlays an expert's "ghost" skeleton onto the user's body
2. Scores how well the user aligns with the expert in real-time
3. Highlights which joints need correction
4. **Provides intelligent voice coaching feedback** ← YOUR SPECIALTY

**Your Mission**: Build the AI coaching layer (Gemini + ElevenLabs), storage infrastructure (DigitalOcean Spaces), and deploy the backend (DigitalOcean App Platform).

---

## API KEYS (ALREADY CONFIGURED)

```
ELEVEN_LABS_API_KEY=sk_3afeb9ee67a61c3b28703ac6e98e244056d0664d631ffdac
GEMINI_API_KEY=AIzaSyBTKxpu2pkqKRYzmDjPnWddVP9JITOFzd0
```

---

## YOUR DELIVERABLES

### Files You Must Create

```
backend/
├── main.py                         # FastAPI app entrypoint
├── config.py                       # Environment configuration
├── routers/
│   ├── coaching.py                 # NLP coaching endpoints
│   ├── voice.py                    # ElevenLabs voice endpoints
│   ├── packs.py                    # Pack management endpoints
│   └── preprocessing.py            # Video preprocessing endpoints
├── services/
│   ├── gemini_coach.py             # Gemini API integration
│   ├── elevenlabs_voice.py         # ElevenLabs TTS integration
│   └── spaces_storage.py           # DigitalOcean Spaces integration
├── middleware/
│   └── cors.py                     # CORS configuration
└── requirements.txt                # Python dependencies
```

---

## DETAILED TECHNICAL SPECIFICATIONS

### 1. Configuration (`config.py`)

```python
"""
Application Configuration

Loads environment variables and provides typed configuration.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    """Application settings loaded from environment."""
    
    # API Keys
    gemini_api_key: str
    eleven_labs_api_key: str
    
    # DigitalOcean Spaces
    do_spaces_key: str
    do_spaces_secret: str
    do_spaces_bucket: str = "secondhand-assets"
    do_spaces_region: str = "nyc3"
    do_spaces_endpoint: str = "https://nyc3.digitaloceanspaces.com"
    
    # App settings
    app_name: str = "SecondHand API"
    debug: bool = False
    cors_origins: str = "*"
    
    # ElevenLabs settings
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel voice (default)
    elevenlabs_model_id: str = "eleven_turbo_v2_5"
    
    # Gemini settings
    gemini_model: str = "gemini-2.0-flash"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

---

### 2. FastAPI Main App (`main.py`)

```python
"""
SecondHand API - Main Application

FastAPI backend for:
- AI coaching (Gemini NLP)
- Voice synthesis (ElevenLabs)
- Storage (DigitalOcean Spaces)
- Pack management
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import get_settings
from routers import coaching, voice, packs, preprocessing

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"🚀 Starting {settings.app_name}")
    yield
    # Shutdown
    print("👋 Shutting down...")

app = FastAPI(
    title=settings.app_name,
    description="Backend API for SecondHand motion learning platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(coaching.router, prefix="/api/coaching", tags=["Coaching"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice"])
app.include_router(packs.router, prefix="/api/packs", tags=["Packs"])
app.include_router(preprocessing.router, prefix="/api/preprocessing", tags=["Preprocessing"])

@app.get("/")
async def root():
    return {"message": "SecondHand API", "status": "healthy"}

@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.app_name}
```

---

### 3. Gemini Coach Service (`services/gemini_coach.py`)

This is the CORE of your work - making the coaching feel human.

```python
"""
Gemini Coach Service

Transforms geometric error data into natural, human coaching cues.
This is what makes SecondHand feel like a real teacher, not a robot.

The goal is NOT to be chatty - it's to be:
- Concise (1-2 sentences max)
- Actionable (tells user what to DO)
- Encouraging (never critical or negative)
- Context-aware (knows the pack/skill being learned)
"""

import google.generativeai as genai
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import json
import asyncio

from config import get_settings

settings = get_settings()

# Configure Gemini
genai.configure(api_key=settings.gemini_api_key)

class PackContext(Enum):
    SIGN_LANGUAGE = "sign_language"
    CPR = "cpr"
    PIANO = "piano"
    SPORTS = "sports"
    REHAB = "rehab"

@dataclass
class CoachingRequest:
    """Request for AI coaching feedback."""
    deterministic_cues: List[str]        # Raw cues from cue mapper
    per_joint_errors: Dict[int, float]   # Error per joint
    top_error_joints: List[int]          # Worst performing joints
    current_score: float                 # 0-100 current score
    improvement_trend: float             # Positive = improving
    pack_context: PackContext            # What skill they're learning
    user_question: Optional[str] = None  # Optional user question
    session_duration_seconds: float = 0  # How long they've been practicing

@dataclass
class CoachingResponse:
    """AI coaching response."""
    primary_cue: str          # Main coaching message
    secondary_cue: Optional[str] = None  # Optional follow-up
    encouragement: Optional[str] = None  # Positive reinforcement
    should_speak: bool = True  # Whether to speak this via TTS

class GeminiCoach:
    """
    AI-powered coaching assistant using Gemini.
    
    Design philosophy:
    - Tier 1: Deterministic cues from cue mapper (always available)
    - Tier 2: Gemini polishes into natural language (when API works)
    - Fallback: If API fails, use deterministic cues directly
    
    This ensures coaching ALWAYS works, even if Gemini is slow/down.
    """
    
    # System prompt that defines the coach's personality
    SYSTEM_PROMPT = """You are a friendly, encouraging movement coach helping someone learn a physical skill through practice.

Your job is to take technical error data and convert it into natural, human coaching cues.

RULES (CRITICAL - FOLLOW EXACTLY):
1. MAXIMUM 1-2 short sentences
2. Never use technical jargon
3. Always tell them what TO DO, not what they did wrong
4. Be warm but not cheesy
5. If they're doing well (score > 85), prioritize encouragement
6. If they're improving (positive trend), acknowledge it briefly
7. Never lecture or give long explanations
8. Sound like a patient friend, not a robot

EXAMPLES OF GOOD RESPONSES:
- "Try opening your fingers a bit wider."
- "Nice! Just lift your wrist slightly."
- "You're getting it! Small adjustment – curl those fingers a touch more."
- "Almost there! Rotate your hand just a bit to the left."

EXAMPLES OF BAD RESPONSES (NEVER DO THIS):
- "The angle of your metacarpophalangeal joint is..." (too technical)
- "You need to work on multiple areas..." (too vague, not actionable)
- "Your hand position is incorrect because..." (negative framing)
- Multiple paragraph explanations (too long)

PACK-SPECIFIC CONTEXT:
- sign_language: Focus on hand shape, finger positions, orientation
- cpr: Focus on arm position, elbow lock, compression rhythm
- piano: Focus on finger curl, wrist relaxation, posture
- sports: Focus on form checkpoints, body alignment
- rehab: Focus on controlled movements, not overextending"""

    def __init__(self):
        """Initialize the Gemini coach."""
        self.model = genai.GenerativeModel(
            model_name=settings.gemini_model,
            system_instruction=self.SYSTEM_PROMPT
        )
    
    async def generate_coaching(
        self,
        request: CoachingRequest,
        timeout_seconds: float = 2.0
    ) -> CoachingResponse:
        """
        Generate coaching feedback from error data.
        
        Uses a timeout to ensure we never block the UI waiting for AI.
        Falls back to deterministic cues if Gemini is slow/fails.
        
        Args:
            request: CoachingRequest with error data and context
            timeout_seconds: Max time to wait for Gemini response
            
        Returns:
            CoachingResponse with polished coaching cues
        """
        try:
            # Build the prompt
            prompt = self._build_prompt(request)
            
            # Generate with timeout
            response = await asyncio.wait_for(
                self._generate_async(prompt),
                timeout=timeout_seconds
            )
            
            # Parse the response
            return self._parse_response(response, request)
            
        except asyncio.TimeoutError:
            # Fallback to deterministic cues
            return self._fallback_response(request)
        except Exception as e:
            print(f"Gemini error: {e}")
            return self._fallback_response(request)
    
    async def _generate_async(self, prompt: str) -> str:
        """Async wrapper for Gemini generation."""
        response = await asyncio.to_thread(
            lambda: self.model.generate_content(prompt)
        )
        return response.text
    
    def _build_prompt(self, request: CoachingRequest) -> str:
        """Build the prompt for Gemini."""
        prompt = f"""CONTEXT:
- Pack: {request.pack_context.value}
- Current score: {request.current_score:.0f}/100
- Trend: {"improving" if request.improvement_trend > 0 else "needs work"}
- Session time: {request.session_duration_seconds:.0f} seconds

RAW ERROR CUES FROM SYSTEM:
{chr(10).join(f"- {cue}" for cue in request.deterministic_cues[:3])}

{"USER QUESTION: " + request.user_question if request.user_question else ""}

Convert the above into 1-2 natural coaching sentences. Remember: short, actionable, encouraging."""
        
        return prompt
    
    def _parse_response(
        self,
        response_text: str,
        request: CoachingRequest
    ) -> CoachingResponse:
        """Parse Gemini response into structured output."""
        # Clean up the response
        text = response_text.strip()
        
        # Split into sentences if multiple
        sentences = [s.strip() for s in text.split('.') if s.strip()]
        
        primary = sentences[0] + '.' if sentences else request.deterministic_cues[0]
        secondary = sentences[1] + '.' if len(sentences) > 1 else None
        
        # Add encouragement if score is high
        encouragement = None
        if request.current_score >= 90:
            encouragement = "Perfect!"
        elif request.current_score >= 80 and request.improvement_trend > 0:
            encouragement = "You're getting it!"
        
        return CoachingResponse(
            primary_cue=primary,
            secondary_cue=secondary,
            encouragement=encouragement,
            should_speak=True
        )
    
    def _fallback_response(self, request: CoachingRequest) -> CoachingResponse:
        """Fallback when Gemini fails - use deterministic cues."""
        primary = request.deterministic_cues[0] if request.deterministic_cues else "Keep practicing!"
        secondary = request.deterministic_cues[1] if len(request.deterministic_cues) > 1 else None
        
        return CoachingResponse(
            primary_cue=primary,
            secondary_cue=secondary,
            encouragement=None,
            should_speak=True
        )
    
    async def answer_question(
        self,
        question: str,
        context: Dict[str, Any]
    ) -> str:
        """
        Answer a specific user question about their performance.
        
        Used for "What am I doing wrong?" voice commands.
        
        Args:
            question: User's question
            context: Current session context (score, errors, etc.)
            
        Returns:
            Short, actionable answer
        """
        prompt = f"""User is learning {context.get('pack', 'a skill')} and asks: "{question}"

Their current score is {context.get('score', 50)}/100.
Main issues: {', '.join(context.get('top_errors', ['general form']))}

Give a 1-2 sentence answer that's helpful and actionable. Don't repeat the question."""

        try:
            response = await asyncio.wait_for(
                self._generate_async(prompt),
                timeout=3.0
            )
            return response.strip()
        except:
            return "Focus on matching the ghost overlay as closely as you can."
```

---

### 4. ElevenLabs Voice Service (`services/elevenlabs_voice.py`)

```python
"""
ElevenLabs Voice Synthesis Service

Converts coaching text to natural-sounding speech.
This makes the coaching feel alive and real.
"""

import httpx
from typing import Optional
import asyncio
import base64
from io import BytesIO

from config import get_settings

settings = get_settings()

class VoiceSettings:
    """Voice configuration options."""
    STABILITY = 0.5           # 0-1, higher = more consistent
    SIMILARITY_BOOST = 0.75   # 0-1, how much to sound like original voice
    STYLE = 0.0               # 0-1, style exaggeration
    SPEAKER_BOOST = True      # Enhance speaker clarity

class ElevenLabsVoice:
    """
    ElevenLabs text-to-speech service.
    
    Design decisions:
    - Use streaming for real-time feel (optional)
    - Cache common phrases (stretch goal)
    - Fallback to browser TTS if API fails
    """
    
    BASE_URL = "https://api.elevenlabs.io/v1"
    
    # Available voices (you can change these)
    VOICES = {
        "rachel": "21m00Tcm4TlvDq8ikWAM",    # Calm, American female
        "josh": "TxGEqnHWrfWFTfGW9XjX",       # Deep, American male
        "bella": "EXAVITQu4vr4xnSDxMaL",      # Warm, British female
        "adam": "pNInz6obpgDQGcFmaJgB",       # Deep, American male
    }
    
    def __init__(self, voice_name: str = "rachel"):
        """
        Initialize voice service.
        
        Args:
            voice_name: Name of voice to use (see VOICES dict)
        """
        self.voice_id = self.VOICES.get(voice_name, settings.elevenlabs_voice_id)
        self.api_key = settings.eleven_labs_api_key
    
    async def synthesize(
        self,
        text: str,
        output_format: str = "mp3_44100_128"
    ) -> bytes:
        """
        Synthesize text to speech.
        
        Args:
            text: Text to speak
            output_format: Audio format (mp3_44100_128, pcm_16000, etc.)
            
        Returns:
            Audio bytes in requested format
        """
        url = f"{self.BASE_URL}/text-to-speech/{self.voice_id}"
        
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key
        }
        
        payload = {
            "text": text,
            "model_id": settings.elevenlabs_model_id,
            "voice_settings": {
                "stability": VoiceSettings.STABILITY,
                "similarity_boost": VoiceSettings.SIMILARITY_BOOST,
                "style": VoiceSettings.STYLE,
                "use_speaker_boost": VoiceSettings.SPEAKER_BOOST
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=payload,
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            return response.content
    
    async def synthesize_streaming(
        self,
        text: str
    ):
        """
        Stream audio as it's generated.
        
        Use this for real-time feel - audio starts playing
        before entire synthesis is complete.
        
        Yields:
            Audio chunk bytes
        """
        url = f"{self.BASE_URL}/text-to-speech/{self.voice_id}/stream"
        
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key
        }
        
        payload = {
            "text": text,
            "model_id": settings.elevenlabs_model_id,
            "voice_settings": {
                "stability": VoiceSettings.STABILITY,
                "similarity_boost": VoiceSettings.SIMILARITY_BOOST,
            }
        }
        
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                url,
                json=payload,
                headers=headers,
                timeout=30.0
            ) as response:
                response.raise_for_status()
                async for chunk in response.aiter_bytes():
                    yield chunk
    
    async def synthesize_base64(self, text: str) -> str:
        """
        Synthesize and return as base64 for easy embedding.
        
        Args:
            text: Text to speak
            
        Returns:
            Base64-encoded MP3 audio
        """
        audio_bytes = await self.synthesize(text)
        return base64.b64encode(audio_bytes).decode('utf-8')
    
    async def get_available_voices(self) -> list:
        """Get list of available voices from API."""
        url = f"{self.BASE_URL}/voices"
        
        headers = {"xi-api-key": self.api_key}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json().get("voices", [])
    
    def estimate_duration_ms(self, text: str) -> int:
        """
        Estimate audio duration from text length.
        
        Useful for UI timing (when to show next cue, etc.)
        
        Returns:
            Estimated duration in milliseconds
        """
        # Average speaking rate: ~150 words per minute
        # Average word length: ~5 characters
        words = len(text) / 5
        minutes = words / 150
        return int(minutes * 60 * 1000)
```

---

### 5. DigitalOcean Spaces Service (`services/spaces_storage.py`)

```python
"""
DigitalOcean Spaces Storage Service

S3-compatible object storage for:
- Expert keypoint JSON files
- Expert video clips
- Pack metadata
- User uploads (stretch)
"""

import boto3
from botocore.config import Config
from typing import Optional, List, BinaryIO
import json
from pathlib import Path

from config import get_settings

settings = get_settings()

class SpacesStorage:
    """
    DigitalOcean Spaces storage service.
    
    Uses boto3 with S3-compatible API.
    
    Directory structure in Spaces:
    secondhand-assets/
    ├── packs/
    │   └── sign-language/
    │       ├── metadata.json
    │       └── lessons/
    │           ├── hello/
    │           │   ├── keypoints.json
    │           │   └── segments.json
    │           └── thank-you/
    │               └── ...
    ├── videos/
    │   └── expert/
    │       ├── hello.mp4
    │       └── thank-you.mp4
    └── cache/
        └── audio/        # Cached TTS audio (optional)
    """
    
    def __init__(self):
        """Initialize Spaces client."""
        self.client = boto3.client(
            's3',
            region_name=settings.do_spaces_region,
            endpoint_url=settings.do_spaces_endpoint,
            aws_access_key_id=settings.do_spaces_key,
            aws_secret_access_key=settings.do_spaces_secret,
            config=Config(signature_version='s3v4')
        )
        self.bucket = settings.do_spaces_bucket
    
    def upload_file(
        self,
        file_path: str,
        key: str,
        content_type: Optional[str] = None,
        public: bool = False
    ) -> str:
        """
        Upload a file to Spaces.
        
        Args:
            file_path: Local file path
            key: Remote key (path in bucket)
            content_type: MIME type
            public: Whether to make publicly readable
            
        Returns:
            Public URL of uploaded file
        """
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
        if public:
            extra_args['ACL'] = 'public-read'
        
        self.client.upload_file(
            file_path,
            self.bucket,
            key,
            ExtraArgs=extra_args
        )
        
        return self.get_public_url(key)
    
    def upload_bytes(
        self,
        data: bytes,
        key: str,
        content_type: str = "application/octet-stream",
        public: bool = False
    ) -> str:
        """
        Upload bytes directly to Spaces.
        
        Args:
            data: Raw bytes to upload
            key: Remote key
            content_type: MIME type
            public: Whether to make publicly readable
            
        Returns:
            Public URL
        """
        from io import BytesIO
        
        extra_args = {'ContentType': content_type}
        if public:
            extra_args['ACL'] = 'public-read'
        
        self.client.upload_fileobj(
            BytesIO(data),
            self.bucket,
            key,
            ExtraArgs=extra_args
        )
        
        return self.get_public_url(key)
    
    def upload_json(
        self,
        data: dict,
        key: str,
        public: bool = True
    ) -> str:
        """
        Upload JSON data to Spaces.
        
        Args:
            data: Dictionary to serialize as JSON
            key: Remote key
            public: Whether to make publicly readable
            
        Returns:
            Public URL
        """
        json_bytes = json.dumps(data, indent=2).encode('utf-8')
        return self.upload_bytes(
            json_bytes,
            key,
            content_type='application/json',
            public=public
        )
    
    def download_file(self, key: str, local_path: str):
        """Download a file from Spaces."""
        self.client.download_file(self.bucket, key, local_path)
    
    def download_bytes(self, key: str) -> bytes:
        """Download file as bytes."""
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        return response['Body'].read()
    
    def download_json(self, key: str) -> dict:
        """Download and parse JSON file."""
        data = self.download_bytes(key)
        return json.loads(data.decode('utf-8'))
    
    def list_files(self, prefix: str = "") -> List[str]:
        """List files with given prefix."""
        response = self.client.list_objects_v2(
            Bucket=self.bucket,
            Prefix=prefix
        )
        return [obj['Key'] for obj in response.get('Contents', [])]
    
    def delete_file(self, key: str):
        """Delete a file from Spaces."""
        self.client.delete_object(Bucket=self.bucket, Key=key)
    
    def file_exists(self, key: str) -> bool:
        """Check if file exists in Spaces."""
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except:
            return False
    
    def get_public_url(self, key: str) -> str:
        """Get public URL for a file."""
        # DigitalOcean Spaces CDN URL format
        return f"https://{self.bucket}.{settings.do_spaces_region}.cdn.digitaloceanspaces.com/{key}"
    
    def generate_presigned_url(
        self,
        key: str,
        expires_in: int = 3600
    ) -> str:
        """
        Generate a presigned URL for temporary access.
        
        Args:
            key: File key
            expires_in: Seconds until URL expires
            
        Returns:
            Presigned URL
        """
        return self.client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket, 'Key': key},
            ExpiresIn=expires_in
        )
```

---

### 6. Coaching Router (`routers/coaching.py`)

```python
"""
Coaching API Endpoints

Endpoints for AI-powered coaching feedback.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional

from services.gemini_coach import GeminiCoach, CoachingRequest, PackContext

router = APIRouter()
coach = GeminiCoach()

class CoachingRequestPayload(BaseModel):
    """API request payload for coaching."""
    deterministic_cues: List[str]
    per_joint_errors: Dict[str, float]  # JSON doesn't support int keys
    top_error_joints: List[int]
    current_score: float
    improvement_trend: float = 0.0
    pack_context: str = "sign_language"
    user_question: Optional[str] = None
    session_duration_seconds: float = 0

class CoachingResponsePayload(BaseModel):
    """API response payload for coaching."""
    primary_cue: str
    secondary_cue: Optional[str] = None
    encouragement: Optional[str] = None
    should_speak: bool = True

@router.post("/generate", response_model=CoachingResponsePayload)
async def generate_coaching(payload: CoachingRequestPayload):
    """
    Generate AI coaching feedback from error data.
    
    This endpoint takes raw error data and returns polished,
    human-friendly coaching cues.
    """
    try:
        # Convert string keys to int for internal use
        per_joint_errors = {int(k): v for k, v in payload.per_joint_errors.items()}
        
        request = CoachingRequest(
            deterministic_cues=payload.deterministic_cues,
            per_joint_errors=per_joint_errors,
            top_error_joints=payload.top_error_joints,
            current_score=payload.current_score,
            improvement_trend=payload.improvement_trend,
            pack_context=PackContext(payload.pack_context),
            user_question=payload.user_question,
            session_duration_seconds=payload.session_duration_seconds
        )
        
        response = await coach.generate_coaching(request)
        
        return CoachingResponsePayload(
            primary_cue=response.primary_cue,
            secondary_cue=response.secondary_cue,
            encouragement=response.encouragement,
            should_speak=response.should_speak
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class QuestionPayload(BaseModel):
    """Payload for answering user questions."""
    question: str
    pack: str = "sign_language"
    score: float = 50.0
    top_errors: List[str] = []

@router.post("/ask")
async def ask_question(payload: QuestionPayload):
    """
    Answer a user question about their performance.
    
    Used for voice commands like "What am I doing wrong?"
    """
    context = {
        "pack": payload.pack,
        "score": payload.score,
        "top_errors": payload.top_errors
    }
    
    answer = await coach.answer_question(payload.question, context)
    return {"answer": answer}
```

---

### 7. Voice Router (`routers/voice.py`)

```python
"""
Voice Synthesis API Endpoints

Endpoints for text-to-speech using ElevenLabs.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from typing import Optional

from services.elevenlabs_voice import ElevenLabsVoice

router = APIRouter()
voice = ElevenLabsVoice()

class SynthesizeRequest(BaseModel):
    """Request payload for voice synthesis."""
    text: str
    voice: Optional[str] = "rachel"

@router.post("/synthesize")
async def synthesize_speech(request: SynthesizeRequest):
    """
    Synthesize text to speech.
    
    Returns base64-encoded MP3 audio for easy playback in browser.
    """
    try:
        audio_base64 = await voice.synthesize_base64(request.text)
        return {
            "audio": audio_base64,
            "format": "mp3",
            "estimated_duration_ms": voice.estimate_duration_ms(request.text)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/synthesize/audio")
async def synthesize_audio(request: SynthesizeRequest):
    """
    Synthesize and return raw audio file.
    
    Use this if you want to pipe directly to an audio player.
    """
    try:
        audio_bytes = await voice.synthesize(request.text)
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/synthesize/stream")
async def synthesize_stream(request: SynthesizeRequest):
    """
    Stream audio as it's generated.
    
    For real-time playback - audio starts before synthesis completes.
    """
    async def stream_audio():
        async for chunk in voice.synthesize_streaming(request.text):
            yield chunk
    
    return StreamingResponse(
        stream_audio(),
        media_type="audio/mpeg"
    )

@router.get("/voices")
async def list_voices():
    """Get available voice options."""
    return {
        "available": list(voice.VOICES.keys()),
        "default": "rachel"
    }
```

---

### 8. Packs Router (`routers/packs.py`)

```python
"""
Pack Management API Endpoints

Endpoints for managing skill packs (lessons, keypoints, metadata).
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional

from services.spaces_storage import SpacesStorage

router = APIRouter()
storage = SpacesStorage()

class LessonMetadata(BaseModel):
    """Metadata for a single lesson."""
    id: str
    name: str
    description: str
    duration_ms: float
    difficulty: str
    keypoints_url: str
    segments_url: Optional[str] = None

class PackMetadata(BaseModel):
    """Metadata for a skill pack."""
    id: str
    name: str
    description: str
    thumbnail_url: Optional[str] = None
    lessons: List[LessonMetadata]

@router.get("/list")
async def list_packs():
    """List all available skill packs."""
    try:
        # List pack directories
        packs = []
        pack_dirs = storage.list_files("packs/")
        
        # Get unique pack names
        pack_names = set()
        for key in pack_dirs:
            parts = key.split('/')
            if len(parts) >= 2:
                pack_names.add(parts[1])
        
        for pack_name in pack_names:
            try:
                metadata = storage.download_json(f"packs/{pack_name}/metadata.json")
                packs.append(metadata)
            except:
                pass
        
        return {"packs": packs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{pack_id}")
async def get_pack(pack_id: str):
    """Get a specific pack's metadata and lessons."""
    try:
        metadata = storage.download_json(f"packs/{pack_id}/metadata.json")
        return metadata
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Pack not found: {pack_id}")

@router.get("/{pack_id}/lessons/{lesson_id}/keypoints")
async def get_lesson_keypoints(pack_id: str, lesson_id: str):
    """Get keypoints for a specific lesson."""
    try:
        keypoints = storage.download_json(
            f"packs/{pack_id}/lessons/{lesson_id}/keypoints.json"
        )
        return keypoints
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Lesson not found")

@router.get("/{pack_id}/lessons/{lesson_id}/segments")
async def get_lesson_segments(pack_id: str, lesson_id: str):
    """Get loop segments for a specific lesson."""
    try:
        segments = storage.download_json(
            f"packs/{pack_id}/lessons/{lesson_id}/segments.json"
        )
        return segments
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Segments not found")
```

---

### 9. Requirements (`requirements.txt`)

```txt
# Core
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.5.0
pydantic-settings>=2.1.0

# AI Services
google-generativeai>=0.8.0
httpx>=0.27.0

# Storage
boto3>=1.34.0

# Utilities
python-dotenv>=1.0.0
python-multipart>=0.0.6
```

---

## DIGITALOCEAN DEPLOYMENT GUIDE

### Step 1: Prepare Repository

Create `Procfile` in backend root:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Step 2: Create App Platform App

1. Go to DigitalOcean Console → App Platform
2. Click "Create App"
3. Connect GitHub repo
4. Select the `backend/` directory as source
5. Configure build settings:
   - Build Command: `pip install -r requirements.txt`
   - Run Command: `uvicorn main:app --host 0.0.0.0 --port 8080`

### Step 3: Add Environment Variables

In App Platform settings, add:
```
GEMINI_API_KEY=AIzaSyBTKxpu2pkqKRYzmDjPnWddVP9JITOFzd0
ELEVEN_LABS_API_KEY=sk_3afeb9ee67a61c3b28703ac6e98e244056d0664d631ffdac
DO_SPACES_KEY=<your-key>
DO_SPACES_SECRET=<your-secret>
DO_SPACES_BUCKET=secondhand-assets
DO_SPACES_REGION=nyc3
```

### Step 4: Configure HTTPS

App Platform auto-provisions HTTPS. No action needed.

### Step 5: Test Deployment

```bash
curl https://your-app-name.ondigitalocean.app/health
```

---

## CRITICAL SUCCESS FACTORS

1. **Timeout protection**: ALWAYS timeout Gemini calls at 2s - never block UI
2. **Fallback to deterministic**: If AI fails, use raw cues from Person 1
3. **Voice is optional**: If ElevenLabs fails, return text only
4. **CDN for storage**: Always use CDN URL for public assets
5. **Short responses**: Train Gemini to be BRIEF - 1-2 sentences max

---

## TESTING CHECKLIST

- [ ] Gemini generates natural coaching cues
- [ ] Gemini respects timeout and falls back gracefully
- [ ] ElevenLabs synthesizes clear speech
- [ ] ElevenLabs streaming works
- [ ] Spaces upload/download works
- [ ] Pack listing returns correct data
- [ ] All endpoints return correct JSON
- [ ] CORS allows frontend origin
- [ ] Deployment to App Platform works

---

## HANDOFF POINTS

**You receive from Person 1**:
- Deterministic cues (raw error→text mappings)
- Scoring data (scores, per-joint errors)

**You provide to Person 3**:
- `/api/coaching/generate` endpoint for AI cues
- `/api/voice/synthesize` endpoint for TTS
- `/api/packs/*` endpoints for pack data
- CDN URLs for keypoint JSON files

---

## START HERE

1. Set up `backend/` directory structure
2. Create `config.py` and verify env vars load
3. Create `main.py` with basic FastAPI app
4. Implement `gemini_coach.py` and test with sample data
5. Implement `elevenlabs_voice.py` and test synthesis
6. Implement `spaces_storage.py` and test upload/download
7. Create all routers and wire them up
8. Deploy to DigitalOcean App Platform
9. Test all endpoints from deployed URL

---

**You are the intelligence. Without you, SecondHand is just a silent overlay.**
