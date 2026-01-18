#!/usr/bin/env python3
"""
Generate a synthetic ASL pack with letters and word gestures.
Outputs JSON into frontend/public/packs/asl/.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple


Point = Tuple[float, float]


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


@dataclass
class FingerSpec:
    base: Point
    lengths: Tuple[float, float, float]
    base_angle: float
    spread: float


def build_finger(spec: FingerSpec, curl: float) -> List[Point]:
    """Build a finger chain (MCP, PIP, DIP, TIP) in 2D."""
    curl = max(0.0, min(1.0, curl))
    angles = [
        spec.base_angle - curl * 1.1 + spec.spread,
        spec.base_angle - curl * 1.35 + spec.spread,
        spec.base_angle - curl * 1.55 + spec.spread,
    ]
    points = [spec.base]
    x, y = spec.base
    for length, angle in zip(spec.lengths, angles):
        x += length * math.cos(angle)
        y += length * math.sin(angle)
        points.append((x, y))
    return points


def build_thumb(base: Point, lengths: Tuple[float, float, float], curl: float) -> List[Point]:
    curl = max(0.0, min(1.0, curl))
    base_angle = -0.3 + curl * 0.9
    angles = [
        base_angle,
        base_angle + 0.15 + curl * 0.6,
        base_angle + 0.25 + curl * 0.8,
    ]
    points = [base]
    x, y = base
    for length, angle in zip(lengths, angles):
        x += length * math.cos(angle)
        y += length * math.sin(angle)
        points.append((x, y))
    return points


def rotate(points: List[Point], origin: Point, angle: float) -> List[Point]:
    ox, oy = origin
    c = math.cos(angle)
    s = math.sin(angle)
    rotated = []
    for x, y in points:
        dx, dy = x - ox, y - oy
        rx = dx * c - dy * s + ox
        ry = dx * s + dy * c + oy
        rotated.append((rx, ry))
    return rotated


def build_hand_pose(curls: Dict[str, float], rotation: float = 0.0) -> List[Point]:
    wrist = (0.5, 0.78)
    index = FingerSpec(base=(0.46, 0.62), lengths=(0.18, 0.12, 0.1), base_angle=-1.55, spread=-0.05)
    middle = FingerSpec(base=(0.5, 0.6), lengths=(0.19, 0.13, 0.11), base_angle=-1.57, spread=0.0)
    ring = FingerSpec(base=(0.54, 0.62), lengths=(0.17, 0.12, 0.1), base_angle=-1.6, spread=0.04)
    pinky = FingerSpec(base=(0.58, 0.64), lengths=(0.15, 0.1, 0.08), base_angle=-1.7, spread=0.08)

    thumb_base = (0.42, 0.7)

    thumb_points = build_thumb(thumb_base, (0.12, 0.09, 0.07), curls["thumb"])
    index_points = build_finger(index, curls["index"])
    middle_points = build_finger(middle, curls["middle"])
    ring_points = build_finger(ring, curls["ring"])
    pinky_points = build_finger(pinky, curls["pinky"])

    # Assemble MediaPipe order
    points = [wrist]
    points.extend(thumb_points)  # CMC, MCP, IP, TIP
    points.extend(index_points)  # MCP, PIP, DIP, TIP
    points.extend(middle_points)
    points.extend(ring_points)
    points.extend(pinky_points)

    if rotation != 0.0:
        points = rotate(points, wrist, rotation)

    # Clamp into view bounds
    points = [(clamp(x), clamp(y)) for x, y in points]
    return points


def mirror_points(points: List[Point]) -> List[Point]:
    return [(1.0 - x, y) for x, y in points]


def frame_from_points(points: List[Point], frame_index: int, fps: int = 30) -> Dict:
    left_points = mirror_points(points)
    return {
        "frame_index": frame_index,
        "timestamp_ms": (frame_index / fps) * 1000.0,
        "left_hand": [[x, y, 1.0] for x, y in left_points],
        "right_hand": [[x, y, 1.0] for x, y in points],
        "pose": None,
        "left_hand_confidence": 1.0,
        "right_hand_confidence": 1.0,
        "pose_confidence": 0.0,
    }


def write_lesson(path: Path, frames: List[Dict], segments: List[Dict]):
    path.mkdir(parents=True, exist_ok=True)
    (path / "keypoints.json").write_text(json.dumps(frames, indent=2))
    (path / "segments.json").write_text(json.dumps({"segments": segments}, indent=2))


def main():
    output_dir = Path("frontend/public/packs/asl")
    lessons_dir = output_dir / "lessons"
    output_dir.mkdir(parents=True, exist_ok=True)

    fps = 30

    letters = {
        "letter-a": {"thumb": 0.2, "index": 1.0, "middle": 1.0, "ring": 1.0, "pinky": 1.0},
        "letter-b": {"thumb": 1.0, "index": 0.0, "middle": 0.0, "ring": 0.0, "pinky": 0.0},
        "letter-c": {"thumb": 0.4, "index": 0.4, "middle": 0.4, "ring": 0.4, "pinky": 0.4},
        "letter-d": {"thumb": 0.6, "index": 0.0, "middle": 1.0, "ring": 1.0, "pinky": 1.0},
        "letter-e": {"thumb": 0.7, "index": 0.8, "middle": 0.8, "ring": 0.8, "pinky": 0.8},
        "letter-f": {"thumb": 0.2, "index": 0.2, "middle": 0.0, "ring": 0.0, "pinky": 0.0},
        "letter-g": {"thumb": 0.3, "index": 0.2, "middle": 1.0, "ring": 1.0, "pinky": 1.0},
        "letter-h": {"thumb": 0.4, "index": 0.0, "middle": 0.0, "ring": 1.0, "pinky": 1.0},
        "letter-i": {"thumb": 0.7, "index": 1.0, "middle": 1.0, "ring": 1.0, "pinky": 0.0},
        "letter-j": {"thumb": 0.7, "index": 1.0, "middle": 1.0, "ring": 1.0, "pinky": 0.0},
        "letter-k": {"thumb": 0.2, "index": 0.0, "middle": 0.1, "ring": 1.0, "pinky": 1.0},
        "letter-l": {"thumb": 0.0, "index": 0.0, "middle": 1.0, "ring": 1.0, "pinky": 1.0},
        "letter-m": {"thumb": 0.9, "index": 0.9, "middle": 0.9, "ring": 1.0, "pinky": 1.0},
        "letter-n": {"thumb": 0.9, "index": 0.9, "middle": 1.0, "ring": 1.0, "pinky": 1.0},
        "letter-o": {"thumb": 0.6, "index": 0.6, "middle": 0.6, "ring": 0.6, "pinky": 0.6},
        "letter-p": {"thumb": 0.2, "index": 0.2, "middle": 0.0, "ring": 1.0, "pinky": 1.0},
        "letter-q": {"thumb": 0.3, "index": 0.3, "middle": 1.0, "ring": 1.0, "pinky": 1.0},
        "letter-r": {"thumb": 0.5, "index": 0.0, "middle": 0.0, "ring": 1.0, "pinky": 1.0},
        "letter-s": {"thumb": 0.9, "index": 1.0, "middle": 1.0, "ring": 1.0, "pinky": 1.0},
        "letter-t": {"thumb": 0.85, "index": 0.95, "middle": 1.0, "ring": 1.0, "pinky": 1.0},
        "letter-u": {"thumb": 0.4, "index": 0.0, "middle": 0.0, "ring": 1.0, "pinky": 1.0},
        "letter-v": {"thumb": 0.3, "index": 0.0, "middle": 0.0, "ring": 1.0, "pinky": 1.0},
        "letter-w": {"thumb": 0.3, "index": 0.0, "middle": 0.0, "ring": 0.0, "pinky": 1.0},
        "letter-x": {"thumb": 0.6, "index": 0.7, "middle": 1.0, "ring": 1.0, "pinky": 1.0},
        "letter-y": {"thumb": 0.0, "index": 1.0, "middle": 1.0, "ring": 1.0, "pinky": 0.0},
        "letter-z": {"thumb": 0.6, "index": 0.0, "middle": 1.0, "ring": 1.0, "pinky": 1.0},
    }

    word_specs = {
        "word-hello": {"base": "letter-b", "rot": 0.35},
        "word-thank-you": {"base": "letter-b", "rot": 0.2},
        "word-please": {"base": "letter-b", "rot": 0.25},
        "word-sorry": {"base": "letter-a", "rot": 0.3},
        "word-yes": {"base": "letter-a", "rot": 0.2},
        "word-no": {"base": "letter-h", "rot": 0.25},
        "word-love": {"base": "letter-y", "rot": 0.2},
        "word-help": {"base": "letter-b", "rot": 0.15},
        "word-good": {"base": "letter-b", "rot": 0.12},
        "word-morning": {"base": "letter-c", "rot": 0.2},
        "word-night": {"base": "letter-c", "rot": 0.18},
        "word-name": {"base": "letter-h", "rot": 0.15},
        "word-my": {"base": "letter-b", "rot": 0.1},
        "word-is": {"base": "letter-i", "rot": 0.1},
        "word-you": {"base": "letter-y", "rot": 0.12},
        "word-me": {"base": "letter-m", "rot": 0.1},
        "word-we": {"base": "letter-w", "rot": 0.1},
        "word-friend": {"base": "letter-r", "rot": 0.15},
        "word-learn": {"base": "letter-l", "rot": 0.2},
        "word-work": {"base": "letter-f", "rot": 0.12},
        "word-school": {"base": "letter-c", "rot": 0.22},
        "word-nice": {"base": "letter-n", "rot": 0.16},
        "word-meet": {"base": "letter-m", "rot": 0.16},
        "word-to": {"base": "letter-t", "rot": 0.08},
    }

    lessons = []

    # Generate letter lessons
    for lesson_id, curls in letters.items():
        motion = lesson_id in ("letter-j", "letter-z")
        frames: List[Dict] = []
        for idx in range(30):
            t = idx / 29.0
            rot = 0.0
            if motion:
                rot = math.sin(t * math.pi * 2) * 0.25
            pose = build_hand_pose(curls, rotation=rot)
            frames.append(frame_from_points(pose, idx, fps=fps))
        segments = [
            {
                "id": "loop",
                "name": "Loop",
                "start_frame": 0,
                "end_frame": len(frames) - 1,
                "difficulty": "easy",
                "focus_joints": [4, 8, 12, 16, 20],
            }
        ]
        write_lesson(lessons_dir / lesson_id, frames, segments)
        lessons.append(
            {
                "id": lesson_id,
                "name": lesson_id.replace("-", " ").title(),
                "description": f"ASL {lesson_id.replace('-', ' ').title()}",
                "difficulty": "easy",
                "type": "letter",
                "keypoints_url": f"/packs/asl/lessons/{lesson_id}/keypoints.json",
                "segments_url": f"/packs/asl/lessons/{lesson_id}/segments.json",
            }
        )

    # Generate word lessons with motion
    for lesson_id, spec in word_specs.items():
        base_curls = letters[spec["base"]]
        frames = []
        for idx in range(45):
            t = idx / 44.0
            rotation = math.sin(t * math.pi * 2) * spec["rot"]
            pose = build_hand_pose(base_curls, rotation=rotation)
            frames.append(frame_from_points(pose, idx, fps=fps))
        segments = [
            {
                "id": "loop",
                "name": "Loop",
                "start_frame": 8,
                "end_frame": 36,
                "difficulty": "medium",
                "focus_joints": [0, 4, 8, 12],
            }
        ]
        write_lesson(lessons_dir / lesson_id, frames, segments)
        lessons.append(
            {
                "id": lesson_id,
                "name": lesson_id.replace("-", " ").title(),
                "description": f"ASL {lesson_id.replace('-', ' ').title()}",
                "difficulty": "medium",
                "type": "word",
                "keypoints_url": f"/packs/asl/lessons/{lesson_id}/keypoints.json",
                "segments_url": f"/packs/asl/lessons/{lesson_id}/segments.json",
            }
        )

    metadata = {
        "id": "asl",
        "name": "ASL Essentials",
        "description": "Letters, words, and phrases for foundational ASL practice.",
        "fps": fps,
        "lessons": lessons,
    }
    (output_dir / "metadata.json").write_text(json.dumps(metadata, indent=2))

    phrases = {
        "phrases": [
            {"id": "hello", "text": "Hello", "sequence": ["word-hello"]},
            {"id": "thank-you", "text": "Thank you", "sequence": ["word-thank-you"]},
            {"id": "please", "text": "Please", "sequence": ["word-please"]},
            {"id": "sorry", "text": "Sorry", "sequence": ["word-sorry"]},
            {"id": "yes-no", "text": "Yes or no", "sequence": ["word-yes", "word-no"]},
            {"id": "i-love-you", "text": "I love you", "sequence": ["word-love"]},
            {"id": "help-me", "text": "Help me", "sequence": ["word-help"]},
            {"id": "good-morning", "text": "Good morning", "sequence": ["word-good", "word-morning"]},
            {"id": "good-night", "text": "Good night", "sequence": ["word-good", "word-night"]},
            {"id": "my-name-is", "text": "My name is", "sequence": ["word-my", "word-name", "word-is"]},
            {"id": "nice-to-meet-you", "text": "Nice to meet you", "sequence": ["word-nice", "word-to", "word-meet", "word-you"]},
            {"id": "we-learn", "text": "We learn", "sequence": ["word-we", "word-learn"]},
            {"id": "friend", "text": "Friend", "sequence": ["word-friend"]},
        ]
    }
    (output_dir / "phrases.json").write_text(json.dumps(phrases, indent=2))


if __name__ == "__main__":
    main()
