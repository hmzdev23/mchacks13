from __future__ import annotations

import logging
from typing import Dict, List, Optional

from models.lesson import LessonKeypoints, LessonMetadata, PackType
from services.spaces_service import SpacesService

logger = logging.getLogger(__name__)


class LessonRepository:
    """
    Dual-source lesson repository.
    - Primary: DigitalOcean Spaces (if configured)
    - Fallback: in-repo sample metadata + keypoints placeholders
    """

    def __init__(self, spaces_service: SpacesService) -> None:
        self.spaces = spaces_service
        self._cache: Dict[str, LessonKeypoints] = {}
        self._metadata_cache: Dict[str, LessonMetadata] = {}

    def list_lessons(self) -> List[LessonMetadata]:
        # Try Spaces first
        if (raw_index := self.spaces.list_lessons()) is not None:
            lessons = [LessonMetadata(**item) for item in raw_index.get("lessons", [])]
            self._metadata_cache.update({l.id: l for l in lessons})
            return lessons

        # Fallback sample data
        sample = self._sample_lessons()
        self._metadata_cache.update({l.id: l for l in sample})
        return sample

    def get_lesson(self, lesson_id: str) -> Optional[LessonMetadata]:
        if lesson_id in self._metadata_cache:
            return self._metadata_cache[lesson_id]

        if (raw := self.spaces.get_lesson_metadata(lesson_id)) is not None:
            meta = LessonMetadata(**raw)
            self._metadata_cache[lesson_id] = meta
            return meta

        lessons = self.list_lessons()
        return next((l for l in lessons if l.id == lesson_id), None)

    def get_keypoints(self, lesson_id: str) -> Optional[LessonKeypoints]:
        if lesson_id in self._cache:
            return self._cache[lesson_id]

        if (raw := self.spaces.get_lesson_keypoints(lesson_id)) is not None:
            kp = LessonKeypoints(**raw)
            self._cache[lesson_id] = kp
            return kp

        # No local sample keypoints bundled, but return None gracefully
        logger.warning("Keypoints for %s not found; ensure preprocessing/upload is done", lesson_id)
        return None

    def _sample_lessons(self) -> List[LessonMetadata]:
        sample = LessonMetadata(
            id="sign_hello",
            name="Sign: Hello",
            pack=PackType.SIGN_LANGUAGE,
            description="Learn to sign 'Hello' with proper hand shape and timing.",
            duration_ms=3000,
            total_frames=90,
            fps=30.0,
            loop_segments=[
                {"id": "intro", "name": "Hello", "start_frame": 0, "end_frame": 30, "difficulty": "easy"},
                {"id": "wave", "name": "Wave", "start_frame": 31, "end_frame": 60, "difficulty": "medium"},
            ],
            cue_templates={
                "spread_low": "Spread your fingers wider",
                "wrist_rotation": "Rotate your wrist slightly {direction}",
            },
            keypoints_url=self.spaces.get_public_url("sign_hello", "keypoints.json"),
            thumbnail_url=self.spaces.get_public_url("sign_hello", "thumb.jpg"),
        )
        return [sample]
