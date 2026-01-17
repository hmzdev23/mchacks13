from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, HttpUrl


class PackType(str, Enum):
    SIGN_LANGUAGE = "sign_language"
    CPR = "cpr"
    PIANO = "piano"
    SPORTS = "sports"


class LoopSegment(BaseModel):
    id: str
    name: str
    start_frame: int = Field(..., ge=0)
    end_frame: int = Field(..., ge=0)
    difficulty: str = Field(..., description='"easy" | "medium" | "hard"')


class Keypoint(BaseModel):
    x: float
    y: float
    z: Optional[float] = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class FrameData(BaseModel):
    frame_index: int = Field(..., ge=0)
    timestamp_ms: float = Field(..., ge=0)
    keypoints: Dict[str, Keypoint]


class LessonMetadata(BaseModel):
    id: str
    name: str
    pack: PackType
    description: str
    duration_ms: int
    total_frames: int
    fps: float
    loop_segments: List[LoopSegment]
    cue_templates: Dict[str, str] = Field(
        default_factory=dict,
        description="error_pattern -> cue template",
    )
    keypoints_url: Optional[HttpUrl] = None
    thumbnail_url: Optional[HttpUrl] = None


class LessonKeypoints(BaseModel):
    lesson_id: str
    frames: List[FrameData]
    fps: float
    total_frames: int
    duration_ms: float
