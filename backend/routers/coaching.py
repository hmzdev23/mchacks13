"""
Coaching API Endpoints

Endpoints for AI-powered coaching feedback.
"""

from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

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
    pack_context: str = Field(default="sign_language", pattern="^(sign_language|cpr|piano|sports|rehab)$")
    user_question: Optional[str] = None
    session_duration_seconds: float = 0.0


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
    """
    try:
        per_joint_errors = {int(k): v for k, v in payload.per_joint_errors.items()}
        request = CoachingRequest(
            deterministic_cues=payload.deterministic_cues,
            per_joint_errors=per_joint_errors,
            top_error_joints=payload.top_error_joints,
            current_score=payload.current_score,
            improvement_trend=payload.improvement_trend,
            pack_context=PackContext(payload.pack_context),
            user_question=payload.user_question,
            session_duration_seconds=payload.session_duration_seconds,
        )
        response = await coach.generate_coaching(request)
        return CoachingResponsePayload(
            primary_cue=response.primary_cue,
            secondary_cue=response.secondary_cue,
            encouragement=response.encouragement,
            should_speak=response.should_speak,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


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
    """
    context = {"pack": payload.pack, "score": payload.score, "top_errors": payload.top_errors}
    answer = await coach.answer_question(payload.question, context)
    return {"answer": answer}
