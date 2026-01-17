"""
ElevenLabs Voice Synthesis Service

Converts coaching text to natural-sounding speech.
"""

from __future__ import annotations

import base64
from typing import Optional

import httpx

from config import get_settings

settings = get_settings()


class VoiceSettings:
    """Voice configuration options."""

    STABILITY = 0.5  # 0-1, higher = more consistent
    SIMILARITY_BOOST = 0.75  # 0-1, how much to sound like original voice
    STYLE = 0.0  # 0-1, style exaggeration
    SPEAKER_BOOST = True  # Enhance speaker clarity


class ElevenLabsVoice:
    """
    ElevenLabs text-to-speech service.
    """

    BASE_URL = "https://api.elevenlabs.io/v1"

    VOICES = {
        "rachel": "21m00Tcm4TlvDq8ikWAM",
        "josh": "TxGEqnHWrfWFTfGW9XjX",
        "bella": "EXAVITQu4vr4xnSDxMaL",
        "adam": "pNInz6obpgDQGcFmaJgB",
    }

    def __init__(self, voice_name: str = "rachel"):
        """
        Initialize voice service.
        """
        self.voice_id = self.VOICES.get(voice_name, settings.elevenlabs_voice_id)
        self.api_key = settings.eleven_labs_api_key

    async def synthesize(self, text: str, output_format: str = "mp3_44100_128") -> bytes:
        """
        Synthesize text to speech.
        """
        url = f"{self.BASE_URL}/text-to-speech/{self.voice_id}"
        headers = {"Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": self.api_key}
        payload = {
            "text": text,
            "model_id": settings.elevenlabs_model_id,
            "voice_settings": {
                "stability": VoiceSettings.STABILITY,
                "similarity_boost": VoiceSettings.SIMILARITY_BOOST,
                "style": VoiceSettings.STYLE,
                "use_speaker_boost": VoiceSettings.SPEAKER_BOOST,
            },
            "output_format": output_format,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=10.0)
            response.raise_for_status()
            return response.content

    async def synthesize_streaming(self, text: str):
        """
        Stream audio as it's generated.
        """
        url = f"{self.BASE_URL}/text-to-speech/{self.voice_id}/stream"
        headers = {"Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": self.api_key}
        payload = {
            "text": text,
            "model_id": settings.elevenlabs_model_id,
            "voice_settings": {
                "stability": VoiceSettings.STABILITY,
                "similarity_boost": VoiceSettings.SIMILARITY_BOOST,
            },
        }

        async with httpx.AsyncClient() as client:
            async with client.stream("POST", url, json=payload, headers=headers, timeout=30.0) as response:
                response.raise_for_status()
                async for chunk in response.aiter_bytes():
                    yield chunk

    async def synthesize_base64(self, text: str) -> str:
        """
        Synthesize and return as base64 for easy embedding.
        """
        audio_bytes = await self.synthesize(text)
        return base64.b64encode(audio_bytes).decode("utf-8")

    async def get_available_voices(self) -> list:
        """Get list of available voices from API."""
        url = f"{self.BASE_URL}/voices"
        headers = {"xi-api-key": self.api_key}
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10.0)
            response.raise_for_status()
            return response.json().get("voices", [])

    def estimate_duration_ms(self, text: str) -> int:
        """
        Estimate audio duration from text length.
        """
        words = len(text) / 5.0
        minutes = words / 150.0
        return int(minutes * 60_000)
