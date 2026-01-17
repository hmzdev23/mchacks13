"""
Generate a complete pack from expert keypoint JSON files.

Usage:
    python generate_pack.py --pack-dir ./packs/sign-language --name "Sign Language Basics"
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from services.keypoint_extractor import KeypointFrame  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate pack metadata from lessons")
    parser.add_argument("--pack-dir", required=True, help="Path to pack directory")
    parser.add_argument("--name", required=True, help="Human-readable pack name")
    parser.add_argument("--id", required=False, help="Pack id (defaults to folder name)")
    parser.add_argument("--description", default="Auto-generated pack", help="Pack description")
    parser.add_argument("--pack-type", default="sign_language", help="Pack type identifier")
    return parser.parse_args()


def load_keypoints(path: Path) -> List[KeypointFrame]:
    data = json.loads(path.read_text())
    frames: List[KeypointFrame] = []
    for entry in data:
        frames.append(
            KeypointFrame(
                frame_index=entry["frame_index"],
                timestamp_ms=entry["timestamp_ms"],
                left_hand=None,
                right_hand=None,
                pose=None,
                left_hand_confidence=entry.get("left_hand_confidence", 0.0),
                right_hand_confidence=entry.get("right_hand_confidence", 0.0),
                pose_confidence=entry.get("pose_confidence", 0.0),
            )
        )
    return frames


def compute_fps(frames: List[KeypointFrame]) -> float:
    if len(frames) < 2:
        return 30.0
    durations = [frames[i + 1].timestamp_ms - frames[i].timestamp_ms for i in range(len(frames) - 1)]
    mean_dt = sum(durations) / len(durations)
    return 1000.0 / mean_dt if mean_dt > 0 else 30.0


def build_lesson_metadata(lesson_dir: Path) -> Dict:
    keypoints_path = lesson_dir / "keypoints.json"
    if not keypoints_path.exists():
        raise FileNotFoundError(f"Missing keypoints.json in {lesson_dir}")

    frames = load_keypoints(keypoints_path)
    fps = compute_fps(frames)
    duration_ms = frames[-1].timestamp_ms if frames else 0.0

    lesson_meta = {
        "id": lesson_dir.name,
        "name": lesson_dir.name.replace("-", " ").title(),
        "description": f"Lesson {lesson_dir.name}",
        "duration_ms": duration_ms,
        "difficulty": "medium",
        "keypoints_url": f"lessons/{lesson_dir.name}/keypoints.json",
    }

    segments_path = lesson_dir / "segments.json"
    if segments_path.exists():
        lesson_meta["segments_url"] = f"lessons/{lesson_dir.name}/segments.json"

    return lesson_meta


def main():
    args = parse_args()
    pack_dir = Path(args.pack_dir).resolve()
    pack_dir.mkdir(parents=True, exist_ok=True)

    lessons_dir = pack_dir / "lessons"
    if not lessons_dir.exists():
        raise FileNotFoundError(f"No lessons directory found at {lessons_dir}")

    lessons_meta: List[Dict] = []
    for lesson_path in lessons_dir.iterdir():
        if lesson_path.is_dir():
            lessons_meta.append(build_lesson_metadata(lesson_path))

    pack_id = args.id or pack_dir.name
    metadata = {
        "id": pack_id,
        "name": args.name,
        "description": args.description,
        "pack_type": args.pack_type,
        "lessons": lessons_meta,
    }

    metadata_path = pack_dir / "metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2))
    print(f"Wrote metadata for {len(lessons_meta)} lessons to {metadata_path}")


if __name__ == "__main__":
    main()
