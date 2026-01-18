"""
Feedback API Endpoints

Endpoints to align, score, and generate cues for user vs expert keypoints.
"""

from __future__ import annotations

from enum import Enum
from typing import Dict, List, Optional

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.alignment_engine import AlignmentEngine
from services.cue_mapper import CueMapper
from services.normalizer import Normalizer
from services.scoring_engine import ScoringEngine, ScoringMode

router = APIRouter()
alignment_engine = AlignmentEngine(mode="anchor")
scoring_engines: Dict[str, ScoringEngine] = {}
normalizer = Normalizer()


class KeypointType(str, Enum):
    HAND = "hand"
    POSE = "pose"


class FeedbackRequest(BaseModel):
    """Request payload for alignment + scoring + cues."""

    user_keypoints: List[List[float]]
    expert_keypoints: List[List[float]]
    keypoint_type: KeypointType = KeypointType.HAND
    normalize: bool = True
    confidence_threshold: float = 0.5
    timing_offset: float = 0.0
    max_cues: int = 2
    pack_type: str = Field(default="sign_language", pattern="^(sign_language|cpr|piano|sports|rehab)$")
    return_aligned_expert: bool = True
    session_id: Optional[str] = None
    reset_ema: bool = False


class AlignmentPayload(BaseModel):
    """Alignment details."""

    scale: float
    translation: List[float]
    rotation: float
    quality: float


class ScorePayload(BaseModel):
    """Score details."""

    overall_score: float
    raw_score: float
    positional_score: float
    angular_score: float
    timing_penalty: float
    per_joint_errors: Dict[int, float]
    top_error_joints: List[int]


class CuePayload(BaseModel):
    """Cue payload."""

    text: str
    category: str
    priority: float
    affected_joints: List[int]
    direction: Optional[str] = None


class FeedbackResponse(BaseModel):
    """Response payload."""

    alignment: AlignmentPayload
    score: ScorePayload
    cues: List[CuePayload]
    aligned_expert: Optional[List[List[float]]] = None


def _to_array(points: List[List[float]]) -> np.ndarray:
    arr = np.array(points, dtype=np.float32)
    if arr.ndim != 2 or arr.shape[1] < 2:
        raise ValueError("Keypoints must be a 2D array with at least 2 columns.")
    return arr


def _confidence_mask(points: np.ndarray, threshold: float) -> Optional[np.ndarray]:
    if points.shape[1] >= 4:
        conf = points[:, 3]
    elif points.shape[1] >= 3:
        conf = points[:, 2]
    else:
        return None
    return conf >= threshold


def _get_scoring_engine(keypoint_type: KeypointType, session_id: Optional[str], reset: bool) -> ScoringEngine:
    if session_id:
        if session_id not in scoring_engines:
            mode = ScoringMode.COMBINED if keypoint_type == KeypointType.HAND else ScoringMode.POSITIONAL
            scoring_engines[session_id] = ScoringEngine(mode=mode)
        engine = scoring_engines[session_id]
        if reset:
            engine.reset()
        return engine
    mode = ScoringMode.COMBINED if keypoint_type == KeypointType.HAND else ScoringMode.POSITIONAL
    return ScoringEngine(mode=mode)


@router.post("/analyze", response_model=FeedbackResponse)
async def analyze_feedback(payload: FeedbackRequest):
    """
    Align expert to user, score similarity, and generate cues.
    """
    try:
        user_raw = _to_array(payload.user_keypoints)
        expert_raw = _to_array(payload.expert_keypoints)
        if user_raw.shape[0] != expert_raw.shape[0]:
            raise ValueError("User and expert keypoints must have the same number of points.")

        user_coords = user_raw[:, :2]
        expert_coords = expert_raw[:, :2]

        if payload.keypoint_type == KeypointType.HAND:
            alignment = alignment_engine.align_hands(expert_raw, user_raw, confidence_threshold=payload.confidence_threshold)
        else:
            alignment = alignment_engine.align_pose(expert_raw, user_raw, confidence_threshold=payload.confidence_threshold)

        mask = _confidence_mask(user_raw, payload.confidence_threshold)

        if payload.normalize:
            if payload.keypoint_type == KeypointType.HAND:
                user_norm, _ = normalizer.normalize_hand(user_coords)
                expert_norm, _ = normalizer.normalize_hand(expert_coords)
            else:
                user_norm, _ = normalizer.normalize_pose(user_coords)
                expert_norm, _ = normalizer.normalize_pose(expert_coords)
            score_input_user = user_norm
            score_input_expert = expert_norm
        else:
            score_input_user = user_coords
            score_input_expert = alignment.aligned_expert

        scoring_engine = _get_scoring_engine(payload.keypoint_type, payload.session_id, payload.reset_ema)
        score = scoring_engine.score_frame(score_input_user, score_input_expert, confidence_mask=mask)
        cue_mapper = CueMapper(pack_type=payload.pack_type)
        cues = cue_mapper.generate_cues(
            score_input_user,
            score_input_expert,
            score.per_joint_errors,
            score.top_error_joints,
            timing_offset=payload.timing_offset,
            max_cues=payload.max_cues,
        )

        return FeedbackResponse(
            alignment=AlignmentPayload(
                scale=alignment.scale_factor,
                translation=alignment.translation.tolist(),
                rotation=alignment.rotation_angle,
                quality=alignment.alignment_quality,
            ),
            score=ScorePayload(
                overall_score=score.overall_score,
                raw_score=score.raw_score,
                positional_score=score.positional_score,
                angular_score=score.angular_score,
                timing_penalty=score.timing_penalty,
                per_joint_errors={int(k): float(v) for k, v in score.per_joint_errors.items()},
                top_error_joints=score.top_error_joints,
            ),
            cues=[
                CuePayload(
                    text=cue.text,
                    category=cue.category.value,
                    priority=cue.priority,
                    affected_joints=cue.affected_joints,
                    direction=cue.direction,
                )
                for cue in cues
            ],
            aligned_expert=alignment.aligned_expert.tolist() if payload.return_aligned_expert else None,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
