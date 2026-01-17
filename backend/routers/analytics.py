import logging
from typing import List

from fastapi import APIRouter

from models.session import AnalyticsSession

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)

# In-memory store for demo visibility
_sessions: List[AnalyticsSession] = []


@router.post("/session")
async def log_session(payload: AnalyticsSession):
    _sessions.append(payload)
    logger.info(
        "Analytics session logged: session_id=%s lesson=%s avg=%s max=%s events=%s",
        payload.session_id,
        payload.lesson_id,
        payload.average_score,
        payload.max_score,
        len(payload.events),
    )
    return {"status": "ok"}


@router.get("/session")
async def list_sessions() -> List[AnalyticsSession]:
    return _sessions
