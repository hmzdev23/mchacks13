"""
CLI script to extract keypoints from expert video.

Usage:
    python extract_keypoints.py --input video.mp4 --output keypoints.json --hands --pose
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from services.keypoint_extractor import KeypointExtractor  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract keypoints from video")
    parser.add_argument("--input", "-i", required=True, help="Input video path")
    parser.add_argument("--output", "-o", required=True, help="Output JSON path")
    parser.add_argument("--hands", action="store_true", help="Detect hands")
    parser.add_argument("--pose", action="store_true", help="Detect pose")
    parser.add_argument("--confidence", type=float, default=0.7, help="Min detection confidence")
    return parser.parse_args()


def main():
    args = parse_args()

    extractor = KeypointExtractor(
        detect_hands=args.hands,
        detect_pose=args.pose,
        min_detection_confidence=args.confidence,
    )

    frames = extractor.extract_from_video(args.input)
    extractor.save_to_json(frames, args.output)

    print(f"Extracted {len(frames)} frames to {args.output}")


if __name__ == "__main__":
    main()
