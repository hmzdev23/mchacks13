"""
Pydantic models for keypoint data structures.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class PackType(str, Enum):
    SIGN_LANGUAGE = "sign_language"
    CPR = "cpr"
    PIANO = "piano"
    SPORTS = "sports"
    REHAB = "rehab"


class HandKeypoints(BaseModel):
    """21 keypoints for a single hand."""

    points: List[List[float]]  # 21 x 3 (x, y, confidence)
    handedness: str  # "Left" or "Right"


class PoseKeypoints(BaseModel):
    """33 keypoints for full body pose."""

    points: List[List[float]]  # 33 x 4 (x, y, z, visibility)


class KeypointFrame(BaseModel):
    """Single frame of extracted keypoints."""

    frame_index: int
    timestamp_ms: float
    left_hand: Optional[HandKeypoints] = None
    right_hand: Optional[HandKeypoints] = None
    pose: Optional[PoseKeypoints] = None


class LessonSegment(BaseModel):
    """A loopable segment within a lesson."""

    id: str
    name: str
    start_frame: int
    end_frame: int
    difficulty: str  # "easy", "medium", "hard"
    focus_joints: List[int]


class Lesson(BaseModel):
    """A single lesson (one skill/sign/move)."""

    id: str
    name: str
    description: str
    pack_type: PackType
    keypoints: List[KeypointFrame]
    segments: List[LessonSegment]
    total_frames: int
    fps: float
    duration_ms: float


class Pack(BaseModel):
    """A collection of lessons."""

    id: str
    name: str
    description: str
    pack_type: PackType
    lessons: List[Lesson]
    thumbnail_url: Optional[str] = None
