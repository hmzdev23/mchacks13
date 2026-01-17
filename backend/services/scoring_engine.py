"""
Scoring Engine

Computes real-time similarity scores between user and expert poses.
The score drives the feedback loop that makes learning feel immediate.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Tuple

import numpy as np

from utils.math_helpers import compute_angle_at_joint, euclidean_distance


class ScoringMode(Enum):
    POSITIONAL = "positional"  # Only position differences
    ANGULAR = "angular"  # Joint angles comparison
    COMBINED = "combined"  # Weighted combination


@dataclass
class ScoringResult:
    """Result of scoring a single frame."""

    overall_score: float  # 0-100 final score
    raw_score: float  # Unsmoothed score
    per_joint_errors: Dict[int, float]  # Error per joint index
    top_error_joints: List[int]  # Indices of worst joints
    positional_score: float  # Score from position only
    angular_score: float  # Score from angles only
    timing_penalty: float  # Penalty for being ahead/behind


class ScoringEngine:
    """
    Computes similarity between user and expert poses.

    The scoring system is designed to:
    1. Feel responsive (immediate feedback)
    2. Feel fair (normalized, not arbitrary)
    3. Be stable (smoothed, not jittery)
    4. Be actionable (identify specific joints to fix)
    """

    # Joint weights - some joints matter more for the score
    HAND_JOINT_WEIGHTS = {
        0: 1.0,  # Wrist - anchor, always weighted
        4: 1.5,  # Thumb tip - important for signs
        8: 1.5,  # Index tip
        12: 1.5,  # Middle tip
        16: 1.2,  # Ring tip
        20: 1.2,  # Pinky tip
    }

    # Fingers for angle calculations
    FINGER_CHAINS = [
        [0, 1, 2, 3, 4],  # Thumb
        [0, 5, 6, 7, 8],  # Index
        [0, 9, 10, 11, 12],  # Middle
        [0, 13, 14, 15, 16],  # Ring
        [0, 17, 18, 19, 20],  # Pinky
    ]

    def __init__(
        self,
        mode: ScoringMode = ScoringMode.COMBINED,
        position_weight: float = 0.6,
        angle_weight: float = 0.4,
        ema_alpha: float = 0.3,
        k_scaling: float = 500,
    ):
        """
        Initialize scoring engine.
        """
        self.mode = mode
        self.position_weight = position_weight
        self.angle_weight = angle_weight
        self.ema_alpha = ema_alpha
        self.k_scaling = k_scaling
        self.ema_score: Optional[float] = None

    def score_frame(
        self,
        user_keypoints: np.ndarray,
        expert_keypoints: np.ndarray,
        confidence_mask: Optional[np.ndarray] = None,
    ) -> ScoringResult:
        """
        Score a single frame.
        """
        if user_keypoints.shape != expert_keypoints.shape:
            raise ValueError("User and expert keypoints must have the same shape.")

        positional_error, per_joint_errors = self.compute_positional_error(
            user_keypoints, expert_keypoints, self.HAND_JOINT_WEIGHTS if user_keypoints.shape[0] == 21 else None, confidence_mask
        )
        positional_score = self.error_to_score(positional_error)

        angular_error, _ = self.compute_angular_error(user_keypoints, expert_keypoints, self.FINGER_CHAINS)
        # Normalize angular error to 0-1 range by dividing by 180 degrees
        angular_score = self.error_to_score(angular_error)

        if self.mode == ScoringMode.POSITIONAL:
            raw_score = positional_score
        elif self.mode == ScoringMode.ANGULAR:
            raw_score = angular_score
        else:
            raw_score = self.position_weight * positional_score + self.angle_weight * angular_score

        smoothed = self.smooth_score(raw_score)
        top_error_joints = self.get_top_error_joints(per_joint_errors, n=3)

        return ScoringResult(
            overall_score=smoothed,
            raw_score=raw_score,
            per_joint_errors=per_joint_errors,
            top_error_joints=top_error_joints,
            positional_score=positional_score,
            angular_score=angular_score,
            timing_penalty=0.0,
        )

    def compute_positional_error(
        self, user: np.ndarray, expert: np.ndarray, weights: Optional[Dict[int, float]] = None, mask: Optional[np.ndarray] = None
    ) -> Tuple[float, Dict[int, float]]:
        """
        Compute weighted positional error.
        """
        per_joint_errors: Dict[int, float] = {}
        total_weight = 0.0
        weighted_error = 0.0

        for idx in range(user.shape[0]):
            if mask is not None and not mask[idx]:
                continue
            weight = weights.get(idx, 1.0) if weights else 1.0
            dist = euclidean_distance(user[idx], expert[idx])
            per_joint_errors[idx] = dist
            weighted_error += weight * dist
            total_weight += weight

        if total_weight == 0.0:
            return 0.0, per_joint_errors

        total_error = weighted_error / total_weight
        return total_error, per_joint_errors

    def compute_angular_error(self, user: np.ndarray, expert: np.ndarray, joint_chains: List[List[int]]) -> Tuple[float, Dict[str, float]]:
        """
        Compute angular error between corresponding joint angles.
        """
        chain_errors: Dict[str, float] = {}
        all_errors: List[float] = []

        for chain in joint_chains:
            chain_name = "-".join(map(str, chain))
            angles_user: List[float] = []
            angles_expert: List[float] = []

            for i in range(1, len(chain) - 1):
                a, b, c = chain[i - 1], chain[i], chain[i + 1]
                angle_user = compute_angle_at_joint(user[a], user[b], user[c])
                angle_expert = compute_angle_at_joint(expert[a], expert[b], expert[c])
                angles_user.append(angle_user)
                angles_expert.append(angle_expert)

            if not angles_user:
                continue

            angles_user = np.array(angles_user)
            angles_expert = np.array(angles_expert)
            chain_err = np.mean(np.abs(angles_user - angles_expert))
            chain_errors[chain_name] = float(chain_err)
            all_errors.append(chain_err)

        if not all_errors:
            return 0.0, chain_errors

        # Normalize degrees to a 0-1 range by dividing by 180
        total_error = float(np.mean(all_errors) / 180.0)
        return total_error, chain_errors

    def compute_angle(self, p1: np.ndarray, p2: np.ndarray, p3: np.ndarray) -> float:
        """Compute angle at p2 between vectors p2→p1 and p2→p3."""
        v1 = p1 - p2
        v2 = p3 - p2
        cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-8)
        return float(np.arccos(np.clip(cos_angle, -1, 1)))

    def error_to_score(self, error: float) -> float:
        """
        Convert raw error to 0-100 score.

        Formula: score = clamp(100 - k * error, 0, 100)
        """
        return max(0.0, min(100.0, 100.0 - self.k_scaling * error))

    def smooth_score(self, raw_score: float) -> float:
        """
        Apply EMA smoothing to prevent jittery scores.
        """
        if self.ema_score is None:
            self.ema_score = raw_score
        else:
            self.ema_score = self.ema_alpha * raw_score + (1.0 - self.ema_alpha) * self.ema_score
        return float(self.ema_score)

    def get_top_error_joints(self, per_joint_errors: Dict[int, float], n: int = 3) -> List[int]:
        """Get indices of joints with highest error for highlighting."""
        sorted_joints = sorted(per_joint_errors.items(), key=lambda x: x[1], reverse=True)
        return [idx for idx, _ in sorted_joints[:n]]

    def reset(self):
        """Reset EMA state for new session."""
        self.ema_score = None
