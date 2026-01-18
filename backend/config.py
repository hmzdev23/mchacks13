"""
Application Configuration

Loads environment variables and provides typed configuration.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


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

    # Google Custom Search (image lookup)
    google_cse_api_key: str = ""
    google_cse_cx: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
