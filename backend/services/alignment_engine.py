"""
Alignment Engine

The "magic" that makes the ghost overlay work. Aligns expert skeleton
to user skeleton in screen space so they can be directly compared.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy.spatial import procrustes

from utils.math_helpers import affine_transform


@dataclass
class AlignmentResult:
    """Result of aligning expert to user."""

    aligned_expert: np.ndarray  # Expert keypoints in user's coordinate space
    transform_matrix: np.ndarray  # 3x3 affine transform matrix
    scale_factor: float  # Scale applied
    translation: np.ndarray  # Translation applied [tx, ty]
    rotation_angle: float  # Rotation applied (radians)
    alignment_quality: float  # 0-1 confidence in alignment


class AlignmentEngine:
    """
    Aligns expert skeleton to user skeleton.

    The goal is to position the expert "ghost" so that:
    1. It overlays on the user's body in screen space
    2. Scale matches (ghost hand same size as user hand)
    3. Position matches (ghost wrist on user's wrist)
    4. User can directly "step into" the ghost

    Two alignment modes:
    - ANCHOR: Simple anchor-point matching (fast, stable)
    - PROCRUSTES: Full Procrustes alignment (better fit, more complex)
    """

    def __init__(self, mode: str = "anchor"):
        """
        Initialize alignment engine.

        Args:
            mode: "anchor" for anchor-point matching, "procrustes" for full alignment
        """
        self.mode = mode

    def align_hands(
        self,
        expert_hand: np.ndarray,
        user_hand: np.ndarray,
        anchor_indices: List[int] = [0, 5, 9],  # Wrist + index/middle MCP
        confidence_threshold: float = 0.5,
    ) -> AlignmentResult:
        """
        Align expert hand to user hand.

        Algorithm (anchor mode):
        1. Compute user's reference length (wrist→middle_tip)
        2. Compute expert's reference length
        3. Scale expert by ratio
        4. Translate expert's wrist to user's wrist
        5. Optionally rotate to match orientation
        """
        user_coords, user_conf = self._split_coords_conf(user_hand)
        expert_coords, _ = self._split_coords_conf(expert_hand)

        valid_mask = self._confidence_mask(user_conf, anchor_indices, confidence_threshold)
        if valid_mask.sum() < 2:
            # Not enough data; return identity alignment
            identity = np.eye(3, dtype=np.float32)
            return AlignmentResult(expert_coords, identity, 1.0, np.zeros(2), 0.0, 0.0)

        scale, translation, rotation = self.compute_anchor_transform(
            expert_coords[anchor_indices],
            user_coords[anchor_indices],
            valid_mask,
        )
        aligned = self.apply_similarity_transform(expert_coords, scale, translation, rotation)
        transform_matrix = self._build_matrix(scale, translation, rotation)
        quality = float(valid_mask.mean())

        return AlignmentResult(
            aligned_expert=aligned,
            transform_matrix=transform_matrix,
            scale_factor=scale,
            translation=translation,
            rotation_angle=rotation,
            alignment_quality=quality,
        )

    def align_pose(
        self,
        expert_pose: np.ndarray,
        user_pose: np.ndarray,
        anchor_indices: List[int] = [11, 12, 23, 24],  # Shoulders + hips
        confidence_threshold: float = 0.5,
    ) -> AlignmentResult:
        """
        Align expert pose to user pose for full-body tracking.
        """
        user_coords, user_conf = self._split_coords_conf(user_pose)
        expert_coords, _ = self._split_coords_conf(expert_pose)

        valid_mask = self._confidence_mask(user_conf, anchor_indices, confidence_threshold)
        if valid_mask.sum() < 2:
            identity = np.eye(3, dtype=np.float32)
            return AlignmentResult(expert_coords, identity, 1.0, np.zeros(2), 0.0, 0.0)

        scale, translation, rotation = self.compute_anchor_transform(
            expert_coords[anchor_indices],
            user_coords[anchor_indices],
            valid_mask,
        )
        aligned = self.apply_similarity_transform(expert_coords, scale, translation, rotation)
        transform_matrix = self._build_matrix(scale, translation, rotation)
        quality = float(valid_mask.mean())

        return AlignmentResult(
            aligned_expert=aligned,
            transform_matrix=transform_matrix,
            scale_factor=scale,
            translation=translation,
            rotation_angle=rotation,
            alignment_quality=quality,
        )

    def procrustes_align(self, expert_points: np.ndarray, user_points: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        Full Procrustes alignment for best-fit mapping.
        """
        _, aligned, disparity = procrustes(user_points, expert_points)
        return aligned, float(disparity)

    def compute_anchor_transform(
        self, expert_anchors: np.ndarray, user_anchors: np.ndarray, valid_mask: np.ndarray
    ) -> Tuple[float, np.ndarray, float]:
        """
        Compute scale, translation, and rotation from anchor points.
        """
        exp = expert_anchors.copy()
        usr = user_anchors.copy()

        exp_valid = exp[valid_mask]
        usr_valid = usr[valid_mask]

        exp_center = np.mean(exp_valid, axis=0)
        usr_center = np.mean(usr_valid, axis=0)

        # Scale by RMS distance to centroid
        exp_dists = np.linalg.norm(exp_valid - exp_center, axis=1)
        usr_dists = np.linalg.norm(usr_valid - usr_center, axis=1)
        exp_scale = np.mean(exp_dists) if exp_dists.size else 1.0
        usr_scale = np.mean(usr_dists) if usr_dists.size else 1.0
        scale = usr_scale / exp_scale if exp_scale > 1e-6 else 1.0

        # Rotation: align first two valid anchors if possible
        rotation = 0.0
        if exp_valid.shape[0] >= 2:
            v_exp = exp_valid[1] - exp_valid[0]
            v_usr = usr_valid[1] - usr_valid[0]
            if np.linalg.norm(v_exp) > 1e-6 and np.linalg.norm(v_usr) > 1e-6:
                ang_exp = np.arctan2(v_exp[1], v_exp[0])
                ang_usr = np.arctan2(v_usr[1], v_usr[0])
                rotation = ang_usr - ang_exp

        # Translation: move expert centroid (after scale+rotation) onto user centroid
        c, s = np.cos(rotation), np.sin(rotation)
        rot_matrix = np.array([[c, -s], [s, c]], dtype=np.float32)
        exp_center_tx = (exp_center * scale) @ rot_matrix.T
        translation = usr_center - exp_center_tx

        return float(scale), translation.astype(np.float32), float(rotation)

    def apply_similarity_transform(
        self, points: np.ndarray, scale: float, translation: np.ndarray, rotation: float
    ) -> np.ndarray:
        """Apply scale, rotation, and translation to points."""
        matrix = self._build_matrix(scale, translation, rotation)
        return affine_transform(points, matrix)

    def _build_matrix(self, scale: float, translation: np.ndarray, rotation: float) -> np.ndarray:
        c, s = np.cos(rotation), np.sin(rotation)
        matrix = np.array(
            [
                [scale * c, -scale * s, translation[0]],
                [scale * s, scale * c, translation[1]],
                [0.0, 0.0, 1.0],
            ],
            dtype=np.float32,
        )
        return matrix

    def _split_coords_conf(self, keypoints: np.ndarray) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """Separate coordinates and optional confidence/visibility column."""
        coords = keypoints[:, :2].astype(np.float32)
        conf = None
        if keypoints.shape[1] >= 4:
            conf = keypoints[:, 3]
        elif keypoints.shape[1] >= 3:
            conf = keypoints[:, 2]
        return coords, conf

    def _confidence_mask(self, conf: Optional[np.ndarray], anchor_indices: List[int], threshold: float) -> np.ndarray:
        if conf is None:
            return np.ones(len(anchor_indices), dtype=bool)
        anchor_conf = conf[anchor_indices]
        return anchor_conf >= threshold
