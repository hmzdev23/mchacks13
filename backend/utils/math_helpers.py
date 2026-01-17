"""
Math Helper Utilities

Common mathematical operations for keypoint processing.
"""

from __future__ import annotations

import numpy as np
from typing import Tuple


def euclidean_distance(p1: np.ndarray, p2: np.ndarray) -> float:
    """Compute Euclidean distance between two points."""
    return float(np.linalg.norm(p1 - p2))


def angle_between_vectors(v1: np.ndarray, v2: np.ndarray) -> float:
    """Compute angle in degrees between two vectors."""
    denom = (np.linalg.norm(v1) * np.linalg.norm(v2)) + 1e-8
    cos_angle = np.dot(v1, v2) / denom
    return float(np.degrees(np.arccos(np.clip(cos_angle, -1.0, 1.0))))


def compute_angle_at_joint(p1: np.ndarray, p2: np.ndarray, p3: np.ndarray) -> float:
    """Compute angle at p2 (in degrees) formed by p1-p2-p3."""
    v1 = p1 - p2
    v2 = p3 - p2
    return angle_between_vectors(v1, v2)


def rotation_matrix_2d(angle_rad: float) -> np.ndarray:
    """Create 2D rotation matrix."""
    c, s = np.cos(angle_rad), np.sin(angle_rad)
    return np.array([[c, -s], [s, c]], dtype=np.float32)


def centroid(points: np.ndarray) -> np.ndarray:
    """Compute centroid of point set."""
    return np.mean(points, axis=0)


def scale_points(points: np.ndarray, scale: float, center: np.ndarray) -> np.ndarray:
    """Scale points around a center point."""
    return (points - center) * scale + center


def normalize_vector(v: np.ndarray) -> np.ndarray:
    """Return unit vector; safe for zero-length input."""
    norm = np.linalg.norm(v)
    if norm < 1e-8:
        return v
    return v / norm


def affine_transform(points: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    """
    Apply a 3x3 affine transform to 2D points.

    Args:
        points: (N, 2) array
        matrix: 3x3 affine matrix

    Returns:
        Transformed points (N, 2)
    """
    if points.size == 0:
        return points
    ones = np.ones((points.shape[0], 1), dtype=np.float32)
    homogenous = np.concatenate([points, ones], axis=1)
    transformed = homogenous @ matrix.T
    return transformed[:, :2]
