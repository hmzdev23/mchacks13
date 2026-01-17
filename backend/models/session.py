from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class SessionEvent(BaseModel):
    timestamp_ms: int
    event: str
    payload: Dict[str, str] = Field(default_factory=dict)


class AnalyticsSession(BaseModel):
    session_id: str
    user_id: Optional[str] = None
    lesson_id: str
    pack: str
    average_score: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    max_score: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    device: Optional[str] = None
    events: List[SessionEvent] = Field(default_factory=list)
