#!/usr/bin/env python3
"""
Preprocess expert video into keypoint JSON for SecondHand.

Usage:
    python preprocess_video.py input.mp4 --output lessons/sign_hello/keypoints.json
"""

import argparse
import json
from pathlib import Path
from typing import Dict

import cv2
import mediapipe as mp

mp_hands = mp.solutions.hands


def extract_keypoints(video_path: str, include_pose: bool = False) -> Dict:
    """Extract hand (and optionally pose) keypoints from video."""
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30

    frames = []
    frame_idx = 0

    with mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.5,
    ) as hands:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb)

            frame_data = {
                "frame_index": frame_idx,
                "timestamp_ms": (frame_idx / fps) * 1000,
                "keypoints": {},
            }

            if results.multi_hand_landmarks:
                for hand_idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
                    handedness = results.multi_handedness[hand_idx].classification[0].label
                    prefix = "left" if handedness == "Left" else "right"

                    for idx, landmark in enumerate(hand_landmarks.landmark):
                        joint_name = f"{prefix}_{mp_hands.HandLandmark(idx).name.lower()}"
                        frame_data["keypoints"][joint_name] = {
                            "x": float(landmark.x),
                            "y": float(landmark.y),
                            "z": float(landmark.z),
                            "confidence": float(
                                getattr(landmark, "visibility", 1.0)
                                if hasattr(landmark, "visibility")
                                else 1.0
                            ),
                        }

            frames.append(frame_data)
            frame_idx += 1

    cap.release()

    return {
        "fps": fps,
        "total_frames": len(frames),
        "duration_ms": (len(frames) / fps) * 1000,
        "frames": frames,
    }


def smooth_keypoints(data: Dict, window_size: int = 3) -> Dict:
    """Apply simple moving average smoothing per joint."""
    frames = data["frames"]
    for i in range(len(frames)):
        for joint in list(frames[i]["keypoints"].keys()):
            x_vals, y_vals, z_vals = [], [], []
            for j in range(max(0, i - window_size), min(len(frames), i + window_size + 1)):
                if joint in frames[j]["keypoints"]:
                    kp = frames[j]["keypoints"][joint]
                    x_vals.append(kp["x"])
                    y_vals.append(kp["y"])
                    z_vals.append(kp["z"])
            if x_vals:
                frames[i]["keypoints"][joint]["x"] = sum(x_vals) / len(x_vals)
                frames[i]["keypoints"][joint]["y"] = sum(y_vals) / len(y_vals)
                frames[i]["keypoints"][joint]["z"] = sum(z_vals) / len(z_vals)
    return data


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("video", help="Input video path")
    parser.add_argument("--output", "-o", required=True, help="Output JSON path")
    parser.add_argument("--smooth", type=int, default=3, help="Smoothing window")
    args = parser.parse_args()

    print(f"Processing {args.video}...")
    data = extract_keypoints(args.video)
    print(f"Extracted {data['total_frames']} frames @ {data['fps']} fps")

    data = smooth_keypoints(data, args.smooth)
    print("Applied smoothing")

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w") as f:
        json.dump(data, f)
    print(f"Saved to {output_path}")


if __name__ == "__main__":
    main()
