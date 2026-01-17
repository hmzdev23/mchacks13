"""
Cue Mapper

Converts geometric errors into human-readable coaching cues.
This is what makes the system feel like an intelligent teacher.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Tuple

import numpy as np

from backend.services.scoring_engine import ScoringEngine
from backend.utils.math_helpers import compute_angle_at_joint, euclidean_distance


class CueCategory(Enum):
    POSITION = "position"  # "Move hand higher"
    ROTATION = "rotation"  # "Rotate wrist left"
    SPREAD = "spread"  # "Open fingers wider"
    CURL = "curl"  # "Curl fingers more"
    TIMING = "timing"  # "Slow down"
    GLOBAL = "global"  # "Good job!"


@dataclass
class Cue:
    """A single coaching cue."""

    text: str  # Human-readable text
    category: CueCategory  # Type of correction
    priority: float  # 0-1, higher = more important
    affected_joints: List[int]  # Joints this cue addresses
    icon: Optional[str] = None  # Optional icon hint
    direction: Optional[str] = None  # "up", "down", "left", "right", etc.


class CueMapper:
    """
    Maps geometric errors to human-readable coaching cues.

    Two-tier system:
    - Tier 1: Deterministic rule-based mapping (fast, reliable)
    - Tier 2: Optional LLM polish (natural phrasing, contextual)
    """

    # Error thresholds for triggering cues
    POSITION_THRESHOLD = 0.08  # Normalized units
    ANGLE_THRESHOLD = 15  # Degrees
    SPREAD_THRESHOLD = 0.1  # Ratio difference

    # Cue templates by error type
    CUE_TEMPLATES = {
        "hand_too_high": "Lower your hand slightly",
        "hand_too_low": "Raise your hand",
        "hand_too_left": "Move hand to the right",
        "hand_too_right": "Move hand to the left",
        "wrist_rotate_cw": "Rotate wrist clockwise",
        "wrist_rotate_ccw": "Rotate wrist counter-clockwise",
        "fingers_too_closed": "Open your fingers wider",
        "fingers_too_open": "Close your fingers slightly",
        "thumb_position": "Adjust your thumb position",
        "index_curl": "Curl your index finger more",
        "index_extend": "Extend your index finger",
        "middle_curl": "Curl your middle finger",
        "middle_extend": "Extend your middle finger",
        "ring_curl": "Curl your ring finger",
        "ring_extend": "Extend your ring finger",
        "pinky_curl": "Curl your pinky",
        "pinky_extend": "Extend your pinky",
        "going_too_fast": "Slow down a bit",
        "going_too_slow": "Try to keep up with the pace",
        "almost_there": "Almost there! Small adjustment needed",
        "perfect": "Perfect! Keep it up!",
    }

    FINGER_CHAINS = [
        [0, 1, 2, 3, 4],  # Thumb
        [0, 5, 6, 7, 8],  # Index
        [0, 9, 10, 11, 12],  # Middle
        [0, 13, 14, 15, 16],  # Ring
        [0, 17, 18, 19, 20],  # Pinky
    ]

    def __init__(self, pack_type: str = "sign_language"):
        """
        Initialize with pack-specific settings.
        """
        self.pack_type = pack_type
        self.cue_history: List[Cue] = []
        self._scoring = ScoringEngine()

    def generate_cues(
        self,
        user_keypoints: np.ndarray,
        expert_keypoints: np.ndarray,
        per_joint_errors: Dict[int, float],
        top_error_joints: List[int],
        timing_offset: float = 0.0,
        max_cues: int = 2,
    ) -> List[Cue]:
        """
        Generate coaching cues from error analysis.
        """
        cues: List[Cue] = []

        pos_error = self.detect_position_error(user_keypoints, expert_keypoints)
        if pos_error:
            key, direction = pos_error
            cues.append(self.template_to_cue(key, priority=0.9, affected_joints=list(range(user_keypoints.shape[0]))))

        rot_error = self.detect_rotation_error(user_keypoints, expert_keypoints)
        if rot_error:
            key, direction = rot_error
            cues.append(self.template_to_cue(key, priority=0.8, affected_joints=[0], direction=direction))

        spread_error = self.detect_spread_error(user_keypoints, expert_keypoints)
        if spread_error:
            cues.append(self.template_to_cue(spread_error, priority=0.7, affected_joints=[4, 8, 12, 16, 20]))

        cues.extend(self._curl_cues(user_keypoints, expert_keypoints, top_error_joints))

        if timing_offset > 0.2:
            cues.append(self.template_to_cue("going_too_fast", priority=0.6, affected_joints=[]))
        elif timing_offset < -0.2:
            cues.append(self.template_to_cue("going_too_slow", priority=0.6, affected_joints=[]))

        # Positive reinforcement if errors are small
        avg_error = np.mean(list(per_joint_errors.values())) if per_joint_errors else 0.0
        approx_score = self._scoring.error_to_score(avg_error)
        positive = self.get_positive_cue(approx_score)
        if positive:
            cues.append(positive)

        cues = self.deduplicate_cues(cues)
        cues = sorted(cues, key=lambda c: c.priority, reverse=True)
        return cues[:max_cues]

    def detect_position_error(self, user: np.ndarray, expert: np.ndarray) -> Optional[Tuple[str, str]]:
        """
        Detect if hand/body position is off.
        """
        user_center = np.mean(user, axis=0)
        expert_center = np.mean(expert, axis=0)
        diff = user_center - expert_center

        axis = np.argmax(np.abs(diff))
        direction = diff[axis]
        if np.abs(direction) < self.POSITION_THRESHOLD:
            return None

        if axis == 1:  # y-axis (vertical)
            return ("hand_too_low" if direction < 0 else "hand_too_high", "up" if direction < 0 else "down")
        else:  # x-axis (horizontal)
            return ("hand_too_right" if direction < 0 else "hand_too_left", "left" if direction < 0 else "right")

    def detect_rotation_error(self, user: np.ndarray, expert: np.ndarray) -> Optional[Tuple[str, str]]:
        """
        Detect if wrist/hand rotation is off.
        Uses vector from wrist to middle MCP to estimate orientation.
        """
        wrist_u = user[0]
        wrist_e = expert[0]
        middle_u = user[9]
        middle_e = expert[9]

        vec_u = middle_u - wrist_u
        vec_e = middle_e - wrist_e

        angle_u = np.degrees(np.arctan2(vec_u[1], vec_u[0]))
        angle_e = np.degrees(np.arctan2(vec_e[1], vec_e[0]))
        delta = angle_u - angle_e

        if np.abs(delta) < self.ANGLE_THRESHOLD:
            return None

        if delta > 0:
            return "wrist_rotate_ccw", "ccw"
        return "wrist_rotate_cw", "cw"

    def detect_spread_error(self, user: np.ndarray, expert: np.ndarray) -> Optional[str]:
        """
        Detect if finger spread (open/closed) is wrong.
        """
        fingertips = [4, 8, 12, 16, 20]
        if any(max(idx, 0) >= user.shape[0] for idx in fingertips):
            return None

        def avg_spread(points: np.ndarray) -> float:
            pairs = [(4, 8), (8, 12), (12, 16), (16, 20)]
            dists = [euclidean_distance(points[a], points[b]) for a, b in pairs]
            return float(np.mean(dists))

        spread_user = avg_spread(user)
        spread_expert = avg_spread(expert)
        if spread_expert < 1e-6:
            return None

        ratio = spread_user / spread_expert
        if ratio < 1.0 - self.SPREAD_THRESHOLD:
            return "fingers_too_closed"
        if ratio > 1.0 + self.SPREAD_THRESHOLD:
            return "fingers_too_open"
        return None

    def _curl_cues(self, user: np.ndarray, expert: np.ndarray, top_error_joints: List[int]) -> List[Cue]:
        cues: List[Cue] = []
        finger_names = ["thumb", "index", "middle", "ring", "pinky"]

        for finger_idx, chain in enumerate(self.FINGER_CHAINS):
            # Only consider if this finger has a top error joint
            if not any(j in top_error_joints for j in chain):
                continue

            # Use angle at the proximal joint to judge curl
            if len(chain) < 3:
                continue
            p1, p2, p3 = chain[1], chain[2], chain[3]
            angle_user = compute_angle_at_joint(user[p1], user[p2], user[p3])
            angle_expert = compute_angle_at_joint(expert[p1], expert[p2], expert[p3])
            delta = np.degrees(angle_user - angle_expert)

            if np.abs(delta) < self.ANGLE_THRESHOLD:
                continue

            template_key = f"{finger_names[finger_idx]}_curl" if delta < 0 else f"{finger_names[finger_idx]}_extend"
            cues.append(self.template_to_cue(template_key, priority=0.65, affected_joints=chain))

        return cues

    def template_to_cue(self, template_key: str, priority: float, affected_joints: List[int], direction: Optional[str] = None) -> Cue:
        """Convert a template key to a Cue object."""
        text = self.CUE_TEMPLATES.get(template_key, template_key.replace("_", " ").capitalize())
        category = (
            CueCategory.POSITION
            if "hand_too" in template_key
            else CueCategory.ROTATION
            if "rotate" in template_key
            else CueCategory.SPREAD
            if "fingers" in template_key
            else CueCategory.CURL
            if "curl" in template_key or "extend" in template_key
            else CueCategory.TIMING
            if "slow" in template_key or "fast" in template_key
            else CueCategory.GLOBAL
        )
        return Cue(text=text, category=category, priority=priority, affected_joints=affected_joints, direction=direction)

    def deduplicate_cues(self, cues: List[Cue]) -> List[Cue]:
        """Remove redundant or conflicting cues."""
        seen = set()
        deduped: List[Cue] = []
        for cue in cues:
            if cue.text in seen:
                continue
            seen.add(cue.text)
            deduped.append(cue)
        return deduped

    def get_positive_cue(self, score: float) -> Optional[Cue]:
        """Generate positive feedback when user is doing well."""
        if score >= 95:
            return Cue(text="Perfect! Keep it up!", category=CueCategory.GLOBAL, priority=0.5, affected_joints=[])
        if score >= 85:
            return Cue(text="Great job! Almost perfect!", category=CueCategory.GLOBAL, priority=0.3, affected_joints=[])
        if score >= 75:
            return Cue(text="Almost there! Small adjustment needed", category=CueCategory.GLOBAL, priority=0.2, affected_joints=[])
        return None
