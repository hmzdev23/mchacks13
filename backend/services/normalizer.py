"""
Keypoint Normalization Service

Normalizes keypoints to a canonical space for accurate comparison
between expert and user poses, regardless of their position/scale in frame.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional, Tuple

import numpy as np


class NormalizationMode(Enum):
    HAND = "hand"  # Normalize using wrist→middle_tip distance
    BODY = "body"  # Normalize using shoulder width
    HYBRID = "hybrid"  # Use both depending on what's detected


class Normalizer:
    """
    Normalizes keypoints to canonical coordinate space.

    The goal is to remove:
    - Translation (where they are in the frame)
    - Scale (how close they are to camera)
    - Optionally rotation (orientation)

    After normalization, expert and user keypoints can be directly compared.
    """

    # Reference point indices for hands
    HAND_WRIST = 0
    HAND_MIDDLE_TIP = 12
    HAND_MCP_INDICES = [5, 9, 13, 17]  # Knuckles for plane estimation

    # Reference point indices for pose
    POSE_LEFT_SHOULDER = 11
    POSE_RIGHT_SHOULDER = 12
    POSE_LEFT_HIP = 23
    POSE_RIGHT_HIP = 24

    def normalize_hand(self, keypoints: np.ndarray, target_scale: float = 1.0) -> Tuple[np.ndarray, dict]:
        """
        Normalize hand keypoints.

        Normalization steps:
        1. Translate wrist to origin (0, 0)
        2. Scale so wrist→middle_tip distance = target_scale
        3. Rotate to canonical orientation (wrist→middle MCP aligns with +x axis)

        Args:
            keypoints: Shape (21, 2) or (21, 3) - x, y, [confidence]
            target_scale: Target distance for wrist→middle_tip

        Returns:
            Tuple of (normalized_keypoints, transform_params)
            transform_params contains: translation, scale, rotation (for inverse)
        """
        pts = keypoints[:, :2].astype(np.float32)

        wrist = pts[self.HAND_WRIST]
        middle_tip = pts[self.HAND_MIDDLE_TIP]

        translation = -wrist
        translated = pts + translation

        ref_len = self.compute_reference_length_hand(pts)
        scale = target_scale / ref_len if ref_len > 1e-6 else 1.0
        scaled = translated * scale

        # Rotation: align wrist→middle MCP vector with +x axis
        middle_mcp = pts[self.HAND_MCP_INDICES[1]]
        vec = (middle_mcp + translation) * scale
        rotation = -np.arctan2(vec[1], vec[0]) if np.linalg.norm(vec) > 1e-6 else 0.0

        c, s = np.cos(rotation), np.sin(rotation)
        rot_matrix = np.array([[c, -s], [s, c]], dtype=np.float32)
        normalized = scaled @ rot_matrix.T

        params = {
            "translation": translation,
            "scale": scale,
            "rotation": rotation,
        }
        return normalized, params

    def normalize_pose(self, keypoints: np.ndarray, target_scale: float = 1.0) -> Tuple[np.ndarray, dict]:
        """
        Normalize pose keypoints.

        Normalization steps:
        1. Translate hip center to origin
        2. Scale so shoulder width = target_scale
        3. Rotate to face camera (shoulders horizontal)

        Args:
            keypoints: Shape (33, 3) or (33, 4) - x, y, z, [visibility]
            target_scale: Target shoulder width

        Returns:
            Tuple of (normalized_keypoints, transform_params)
        """
        pts = keypoints[:, :2].astype(np.float32)

        left_hip = pts[self.POSE_LEFT_HIP]
        right_hip = pts[self.POSE_RIGHT_HIP]
        hip_center = (left_hip + right_hip) / 2.0

        translation = -hip_center
        translated = pts + translation

        ref_len = self.compute_reference_length_pose(pts)
        scale = target_scale / ref_len if ref_len > 1e-6 else 1.0
        scaled = translated * scale

        # Rotate so shoulders are horizontal
        left_shoulder = scaled[self.POSE_LEFT_SHOULDER]
        right_shoulder = scaled[self.POSE_RIGHT_SHOULDER]
        vec = right_shoulder - left_shoulder
        rotation = -np.arctan2(vec[1], vec[0]) if np.linalg.norm(vec) > 1e-6 else 0.0
        c, s = np.cos(rotation), np.sin(rotation)
        rot_matrix = np.array([[c, -s], [s, c]], dtype=np.float32)
        normalized = scaled @ rot_matrix.T

        params = {
            "translation": translation,
            "scale": scale,
            "rotation": rotation,
        }
        return normalized, params

    def compute_reference_length_hand(self, keypoints: np.ndarray) -> float:
        """Compute wrist to middle fingertip distance."""
        wrist = keypoints[self.HAND_WRIST, :2]
        middle_tip = keypoints[self.HAND_MIDDLE_TIP, :2]
        return float(np.linalg.norm(middle_tip - wrist))

    def compute_reference_length_pose(self, keypoints: np.ndarray) -> float:
        """Compute shoulder width."""
        left_shoulder = keypoints[self.POSE_LEFT_SHOULDER, :2]
        right_shoulder = keypoints[self.POSE_RIGHT_SHOULDER, :2]
        return float(np.linalg.norm(right_shoulder - left_shoulder))

    def apply_transform(self, keypoints: np.ndarray, transform_params: dict) -> np.ndarray:
        """Apply saved transform parameters to new keypoints."""
        pts = keypoints[:, :2].astype(np.float32)
        scale = transform_params.get("scale", 1.0)
        translation = transform_params.get("translation", np.zeros(2, dtype=np.float32))
        rotation = transform_params.get("rotation", 0.0)

        c, s = np.cos(rotation), np.sin(rotation)
        rot_matrix = np.array([[c, -s], [s, c]], dtype=np.float32)

        transformed = pts * scale
        transformed = transformed @ rot_matrix.T
        transformed = transformed - translation  # invert earlier translation
        return transformed

    def invert_transform(self, keypoints: np.ndarray, transform_params: dict) -> np.ndarray:
        """Invert transformation to go back to screen coordinates."""
        pts = keypoints[:, :2].astype(np.float32)
        scale = transform_params.get("scale", 1.0)
        translation = transform_params.get("translation", np.zeros(2, dtype=np.float32))
        rotation = transform_params.get("rotation", 0.0)

        c, s = np.cos(rotation), np.sin(rotation)
        rot_matrix = np.array([[c, s], [-s, c]], dtype=np.float32)  # inverse rotation

        inverted = pts @ rot_matrix.T
        inverted = inverted / (scale + 1e-8)
        inverted = inverted - translation
        return inverted
