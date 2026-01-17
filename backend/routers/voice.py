"""
Voice Synthesis API Endpoints

Endpoints for text-to-speech using ElevenLabs.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from services.elevenlabs_voice import ElevenLabsVoice

router = APIRouter()
voice_service = ElevenLabsVoice()


class SynthesizeRequest(BaseModel):
    """Request payload for voice synthesis."""

    text: str
    voice: Optional[str] = "rachel"


@router.post("/synthesize")
async def synthesize_speech(request: SynthesizeRequest):
    """
    Synthesize text to speech and return base64-encoded MP3.
    """
    try:
        # Recreate service if a different voice is requested
        service = voice_service if request.voice == "rachel" else ElevenLabsVoice(voice_name=request.voice or "rachel")
        audio_base64 = await service.synthesize_base64(request.text)
        return {"audio": audio_base64, "format": "mp3", "estimated_duration_ms": service.estimate_duration_ms(request.text)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/synthesize/audio")
async def synthesize_audio(request: SynthesizeRequest):
    """
    Synthesize and return raw audio file.
    """
    try:
        service = voice_service if request.voice == "rachel" else ElevenLabsVoice(voice_name=request.voice or "rachel")
        audio_bytes = await service.synthesize(request.text)
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/synthesize/stream")
async def synthesize_stream(request: SynthesizeRequest):
    """
    Stream audio as it's generated.
    """

    async def stream_audio():
        service = voice_service if request.voice == "rachel" else ElevenLabsVoice(voice_name=request.voice or "rachel")
        async for chunk in service.synthesize_streaming(request.text):
            yield chunk

    return StreamingResponse(stream_audio(), media_type="audio/mpeg")


@router.get("/voices")
async def list_voices():
    """Get available voice options."""
    return {"available": list(voice_service.VOICES.keys()), "default": "rachel"}
