"""
Gemini Coach Service

Transforms geometric error data into natural, human coaching cues.
This is what makes SecondHand feel like a real teacher, not a robot.
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional

import google.generativeai as genai

from config import get_settings

settings = get_settings()

# Configure Gemini
genai.configure(api_key=settings.gemini_api_key)


class PackContext(str, Enum):
    SIGN_LANGUAGE = "sign_language"
    CPR = "cpr"
    PIANO = "piano"
    SPORTS = "sports"
    REHAB = "rehab"


@dataclass
class CoachingRequest:
    """Request for AI coaching feedback."""

    deterministic_cues: List[str]
    per_joint_errors: Dict[int, float]
    top_error_joints: List[int]
    current_score: float
    improvement_trend: float
    pack_context: PackContext
    user_question: Optional[str] = None
    session_duration_seconds: float = 0.0


@dataclass
class CoachingResponse:
    """AI coaching response."""

    primary_cue: str
    secondary_cue: Optional[str] = None
    encouragement: Optional[str] = None
    should_speak: bool = True


class GeminiCoach:
    """
    AI-powered coaching assistant using Gemini.

    Design philosophy:
    - Tier 1: Deterministic cues from cue mapper (always available)
    - Tier 2: Gemini polishes into natural language (when API works)
    - Fallback: If API fails, use deterministic cues directly
    """

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

PACK-SPECIFIC CONTEXT:
- sign_language: Focus on hand shape, finger positions, orientation
- cpr: Focus on arm position, elbow lock, compression rhythm
- piano: Focus on finger curl, wrist relaxation, posture
- sports: Focus on form checkpoints, body alignment
- rehab: Focus on controlled movements, not overextending"""

    def __init__(self):
        """Initialize the Gemini coach."""
        self.model = genai.GenerativeModel(model_name=settings.gemini_model, system_instruction=self.SYSTEM_PROMPT)

    async def generate_coaching(self, request: CoachingRequest, timeout_seconds: float = 2.0) -> CoachingResponse:
        """
        Generate coaching feedback from error data.

        Uses a timeout to ensure we never block the UI waiting for AI.
        Falls back to deterministic cues if Gemini is slow/fails.
        """
        try:
            prompt = self._build_prompt(request)
            response_text = await asyncio.wait_for(self._generate_async(prompt), timeout=timeout_seconds)
            return self._parse_response(response_text, request)
        except asyncio.TimeoutError:
            return self._fallback_response(request)
        except Exception as exc:  # pragma: no cover - defensive
            print(f"Gemini error: {exc}")
            return self._fallback_response(request)

    async def _generate_async(self, prompt: str) -> str:
        """Async wrapper for Gemini generation."""
        response = await asyncio.to_thread(lambda: self.model.generate_content(prompt))
        return response.text

    def _build_prompt(self, request: CoachingRequest) -> str:
        """Build the prompt for Gemini."""
        raw_cues = "\n".join(f"- {cue}" for cue in request.deterministic_cues[:3])
        trend = "improving" if request.improvement_trend > 0 else "needs work"
        question = f"\nUSER QUESTION: {request.user_question}" if request.user_question else ""
        prompt = f"""CONTEXT:
- Pack: {request.pack_context.value}
- Current score: {request.current_score:.0f}/100
- Trend: {trend}
- Session time: {request.session_duration_seconds:.0f} seconds

RAW ERROR CUES FROM SYSTEM:
{raw_cues}{question}

Convert the above into 1-2 natural coaching sentences. Remember: short, actionable, encouraging."""
        return prompt

    def _parse_response(self, response_text: str, request: CoachingRequest) -> CoachingResponse:
        """Parse Gemini response into structured output."""
        text = response_text.strip()
        sentences = [s.strip() for s in text.split(".") if s.strip()]

        primary = f"{sentences[0]}." if sentences else (request.deterministic_cues[0] if request.deterministic_cues else "Keep practicing!")
        secondary = f"{sentences[1]}." if len(sentences) > 1 else None

        encouragement = None
        if request.current_score >= 90:
            encouragement = "Perfect!"
        elif request.current_score >= 80 and request.improvement_trend > 0:
            encouragement = "You're getting it!"

        return CoachingResponse(
            primary_cue=primary,
            secondary_cue=secondary,
            encouragement=encouragement,
            should_speak=True,
        )

    def _fallback_response(self, request: CoachingRequest) -> CoachingResponse:
        """Fallback when Gemini fails - use deterministic cues."""
        primary = request.deterministic_cues[0] if request.deterministic_cues else "Keep practicing!"
        secondary = request.deterministic_cues[1] if len(request.deterministic_cues) > 1 else None
        return CoachingResponse(primary_cue=primary, secondary_cue=secondary, encouragement=None, should_speak=True)

    async def answer_question(self, question: str, context: Dict[str, Any]) -> str:
        """
        Answer a specific user question about their performance.
        """
        prompt = f"""User is learning {context.get('pack', 'a skill')} and asks: "{question}"

Their current score is {context.get('score', 50)}/100.
Main issues: {', '.join(context.get('top_errors', ['general form']))}

Give a 1-2 sentence answer that's helpful and actionable. Don't repeat the question."""

        try:
            response = await asyncio.wait_for(self._generate_async(prompt), timeout=3.0)
            return response.strip()
        except Exception:
            return "Focus on matching the ghost overlay as closely as you can."
