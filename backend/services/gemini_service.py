import logging
import os
from typing import Any, Dict, Optional

import google.generativeai as genai

logger = logging.getLogger(__name__)


class GeminiCoachService:
    def __init__(self) -> None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            logger.warning("GEMINI_API_KEY is not set; NLP cues will be disabled")
        else:
            genai.configure(api_key=api_key)
        self.model_name = os.environ.get("GEMINI_MODEL", "gemini-pro")

    async def generate_cue(self, error_data: Dict[str, Any], pack_context: str) -> str:
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
"""

        return await self._generate_text(prompt, fallback="Adjust your form slightly")

    async def explain_error(
        self,
        error_data: Dict[str, Any],
        pack_context: str,
        user_question: Optional[str] = None,
    ) -> str:
        prompt = f"""You are a physical skill coach for {pack_context}.

Student's current error:
- Joint: {error_data['joint']}
- Issue: {error_data['error_type']} by {error_data['magnitude']}
{f"Student question: {user_question}" if user_question else ""}

Give a brief 2-sentence explanation of:
1. What's wrong
2. How to fix it

Be warm and encouraging. Never lecture."""

        return await self._generate_text(
            prompt,
            fallback="Keep the joint steady and align with the ghost.",
        )

    async def _generate_text(self, prompt: str, fallback: str) -> str:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return fallback

        try:
            model = genai.GenerativeModel(self.model_name)
            response = await model.generate_content_async(prompt)
            if hasattr(response, "text") and response.text:
                return response.text.strip()
            return fallback
        except Exception as exc:  # noqa: BLE001
            logger.error("Gemini generation failed: %s", exc)
            return fallback
