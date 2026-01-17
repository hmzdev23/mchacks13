"""
Preprocessing API Endpoints

Endpoints for extracting keypoints from uploaded expert videos.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from services.keypoint_extractor import KeypointExtractor
from services.spaces_storage import SpacesStorage

router = APIRouter()
storage = SpacesStorage()


class PreprocessResponse(BaseModel):
    """Response payload for preprocessing endpoint."""

    frames: int
    uploaded_url: Optional[str] = None
    keypoints: list


@router.post("/extract", response_model=PreprocessResponse)
async def extract_keypoints(
    video: UploadFile = File(...),
    detect_hands: bool = True,
    detect_pose: bool = False,
    min_confidence: float = 0.7,
    upload_to_spaces: bool = False,
    pack_id: str = "sign-language",
    lesson_id: str = "lesson",
):
    """
    Extract keypoints from an uploaded video.

    Optionally uploads the resulting JSON to DigitalOcean Spaces.
    """
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_video = Path(tmpdir) / (video.filename or "input.mp4")
            tmp_video.write_bytes(await video.read())

            extractor = KeypointExtractor(
                detect_hands=detect_hands,
                detect_pose=detect_pose,
                min_detection_confidence=min_confidence,
                min_tracking_confidence=min_confidence,
            )
            frames = extractor.extract_from_video(str(tmp_video))

            output_path = Path(tmpdir) / "keypoints.json"
            extractor.save_to_json(frames, str(output_path))
            keypoints_data = json.loads(output_path.read_text())

            uploaded_url = None
            if upload_to_spaces:
                key = f"packs/{pack_id}/lessons/{lesson_id}/keypoints.json"
                uploaded_url = storage.upload_file(str(output_path), key, content_type="application/json", public=True)

            return PreprocessResponse(frames=len(frames), uploaded_url=uploaded_url, keypoints=keypoints_data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
