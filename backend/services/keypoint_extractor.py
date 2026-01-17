"""
MediaPipe Keypoint Extraction Service

This module handles extraction of hand and pose keypoints from video files.
Used for preprocessing expert demonstration videos into JSON keypoint data.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import mediapipe as mp
import numpy as np


@dataclass
class KeypointFrame:
    """Single frame of keypoint data."""

    frame_index: int
    timestamp_ms: float
    left_hand: Optional[np.ndarray] = None  # Shape: (21, 3) - x, y, z
    right_hand: Optional[np.ndarray] = None  # Shape: (21, 3)
    pose: Optional[np.ndarray] = None  # Shape: (33, 4) - x, y, z, visibility
    left_hand_confidence: float = 0.0
    right_hand_confidence: float = 0.0
    pose_confidence: float = 0.0


class KeypointExtractor:
    """
    Extracts keypoints from video files using MediaPipe.

    Usage:
        extractor = KeypointExtractor(detect_hands=True, detect_pose=True)
        frames = extractor.extract_from_video("expert_video.mp4")
        extractor.save_to_json(frames, "output.json")
    """

    # MediaPipe hand landmark indices
    HAND_LANDMARKS = {
        "WRIST": 0,
        "THUMB_CMC": 1,
        "THUMB_MCP": 2,
        "THUMB_IP": 3,
        "THUMB_TIP": 4,
        "INDEX_MCP": 5,
        "INDEX_PIP": 6,
        "INDEX_DIP": 7,
        "INDEX_TIP": 8,
        "MIDDLE_MCP": 9,
        "MIDDLE_PIP": 10,
        "MIDDLE_DIP": 11,
        "MIDDLE_TIP": 12,
        "RING_MCP": 13,
        "RING_PIP": 14,
        "RING_DIP": 15,
        "RING_TIP": 16,
        "PINKY_MCP": 17,
        "PINKY_PIP": 18,
        "PINKY_DIP": 19,
        "PINKY_TIP": 20,
    }

    # MediaPipe pose landmark indices (key ones for CPR/sports)
    POSE_LANDMARKS = {
        "NOSE": 0,
        "LEFT_SHOULDER": 11,
        "RIGHT_SHOULDER": 12,
        "LEFT_ELBOW": 13,
        "RIGHT_ELBOW": 14,
        "LEFT_WRIST": 15,
        "RIGHT_WRIST": 16,
        "LEFT_HIP": 23,
        "RIGHT_HIP": 24,
        "LEFT_KNEE": 25,
        "RIGHT_KNEE": 26,
        "LEFT_ANKLE": 27,
        "RIGHT_ANKLE": 28,
    }

    def __init__(
        self,
        detect_hands: bool = True,
        detect_pose: bool = False,
        min_detection_confidence: float = 0.7,
        min_tracking_confidence: float = 0.5,
    ):
        """Initialize the extractor with detection options."""
        self.detect_hands = detect_hands
        self.detect_pose = detect_pose

        self.hands = None
        self.pose = None

        if detect_hands:
            self.hands = mp.solutions.hands.Hands(
                static_image_mode=False,
                max_num_hands=2,
                min_detection_confidence=min_detection_confidence,
                min_tracking_confidence=min_tracking_confidence,
            )

        if detect_pose:
            self.pose = mp.solutions.pose.Pose(
                static_image_mode=False,
                model_complexity=1,
                min_detection_confidence=min_detection_confidence,
                min_tracking_confidence=min_tracking_confidence,
            )

    def extract_from_video(self, video_path: str) -> List[KeypointFrame]:
        """
        Extract keypoints from every frame of a video.

        Args:
            video_path: Path to the video file

        Returns:
            List of KeypointFrame objects, one per frame
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise FileNotFoundError(f"Unable to open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frames: List[KeypointFrame] = []
        frame_index = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            timestamp_ms = (frame_index / fps) * 1000.0
            frame_index += 1

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            hand_results = self.hands.process(rgb_frame) if self.hands else None
            pose_results = self.pose.process(rgb_frame) if self.pose else None

            left_hand, right_hand, lh_conf, rh_conf = self.extract_hand_keypoints(hand_results)
            pose_keypoints, pose_conf = self.extract_pose_keypoints(pose_results)

            frames.append(
                KeypointFrame(
                    frame_index=frame_index - 1,
                    timestamp_ms=timestamp_ms,
                    left_hand=left_hand,
                    right_hand=right_hand,
                    pose=pose_keypoints,
                    left_hand_confidence=lh_conf,
                    right_hand_confidence=rh_conf,
                    pose_confidence=pose_conf,
                )
            )

        cap.release()
        return frames

    def extract_hand_keypoints(self, results) -> Tuple[Optional[np.ndarray], Optional[np.ndarray], float, float]:
        """Extract left and right hand keypoints from MediaPipe results."""
        if not results or not results.multi_hand_landmarks or not results.multi_handedness:
            return None, None, 0.0, 0.0

        left_hand = right_hand = None
        left_conf = right_conf = 0.0

        for handedness, landmarks in zip(results.multi_handedness, results.multi_hand_landmarks):
            label = handedness.classification[0].label  # "Left" or "Right"
            score = handedness.classification[0].score
            coords = np.array([[lm.x, lm.y, lm.z] for lm in landmarks.landmark], dtype=np.float32)
            if label.lower() == "left":
                left_hand = coords
                left_conf = float(score)
            else:
                right_hand = coords
                right_conf = float(score)

        return left_hand, right_hand, left_conf, right_conf

    def extract_pose_keypoints(self, results) -> Tuple[Optional[np.ndarray], float]:
        """Extract pose keypoints from MediaPipe results."""
        if not results or not results.pose_landmarks:
            return None, 0.0

        coords = np.array(
            [[lm.x, lm.y, lm.z, lm.visibility if lm.visibility is not None else 0.0] for lm in results.pose_landmarks.landmark],
            dtype=np.float32,
        )
        visibility = coords[:, 3]
        confidence = float(np.mean(visibility)) if visibility.size else 0.0
        return coords, confidence

    def save_to_json(self, frames: List[KeypointFrame], output_path: str):
        """Save extracted keypoints to JSON file."""
        output = []
        for frame in frames:
            entry: Dict[str, Any] = {
                "frame_index": frame.frame_index,
                "timestamp_ms": frame.timestamp_ms,
                "left_hand": frame.left_hand.tolist() if frame.left_hand is not None else None,
                "right_hand": frame.right_hand.tolist() if frame.right_hand is not None else None,
                "pose": frame.pose.tolist() if frame.pose is not None else None,
                "left_hand_confidence": frame.left_hand_confidence,
                "right_hand_confidence": frame.right_hand_confidence,
                "pose_confidence": frame.pose_confidence,
            }
            output.append(entry)

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(output, indent=2))

    def load_from_json(self, json_path: str) -> List[KeypointFrame]:
        """Load keypoints from JSON file."""
        data = json.loads(Path(json_path).read_text())
        frames: List[KeypointFrame] = []
        for entry in data:
            frames.append(
                KeypointFrame(
                    frame_index=entry["frame_index"],
                    timestamp_ms=entry["timestamp_ms"],
                    left_hand=np.array(entry["left_hand"], dtype=np.float32) if entry.get("left_hand") is not None else None,
                    right_hand=np.array(entry["right_hand"], dtype=np.float32) if entry.get("right_hand") is not None else None,
                    pose=np.array(entry["pose"], dtype=np.float32) if entry.get("pose") is not None else None,
                    left_hand_confidence=entry.get("left_hand_confidence", 0.0),
                    right_hand_confidence=entry.get("right_hand_confidence", 0.0),
                    pose_confidence=entry.get("pose_confidence", 0.0),
                )
            )
        return frames
