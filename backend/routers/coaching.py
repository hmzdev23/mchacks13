from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.gemini_service import GeminiCoachService

router = APIRouter(prefix="/api/coaching", tags=["coaching"])
coach = GeminiCoachService()


class CueRequest(BaseModel):
    joint: str
    error_type: str  # rotation | position | spread | timing
    magnitude: float
    direction: str
    pack_context: str  # sign_language | cpr | piano | sports


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
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, str(exc))


@router.post("/explain")
async def explain_error(req: ExplainRequest):
    try:
        explanation = await coach.explain_error(
            req.dict(),
            req.pack_context,
            req.user_question,
        )
        return {"explanation": explanation}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, str(exc))
