"""
Pack Management API Endpoints

Endpoints for managing skill packs (lessons, keypoints, metadata).
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from services.spaces_storage import SpacesStorage

router = APIRouter()
storage = SpacesStorage()


class LessonMetadata(BaseModel):
    """Metadata for a single lesson."""

    id: str
    name: str
    description: str
    duration_ms: float
    difficulty: str
    keypoints_url: str
    segments_url: Optional[str] = None


class PackMetadata(BaseModel):
    """Metadata for a skill pack."""

    id: str
    name: str
    description: str
    thumbnail_url: Optional[str] = None
    lessons: List[LessonMetadata]


@router.get("/list")
async def list_packs():
    """List all available skill packs."""
    try:
        packs = []
        pack_dirs = storage.list_files("packs/")
        pack_names = {key.split("/")[1] for key in pack_dirs if len(key.split("/")) >= 2}

        for pack_name in pack_names:
            try:
                metadata = storage.download_json(f"packs/{pack_name}/metadata.json")
                packs.append(metadata)
            except Exception:
                # Skip packs without metadata
                continue

        return {"packs": packs}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{pack_id}")
async def get_pack(pack_id: str):
    """Get a specific pack's metadata and lessons."""
    try:
        metadata = storage.download_json(f"packs/{pack_id}/metadata.json")
        return metadata
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Pack not found: {pack_id}. ({exc})")


@router.get("/{pack_id}/lessons/{lesson_id}/keypoints")
async def get_lesson_keypoints(pack_id: str, lesson_id: str):
    """Get keypoints for a specific lesson."""
    try:
        keypoints = storage.download_json(f"packs/{pack_id}/lessons/{lesson_id}/keypoints.json")
        return keypoints
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Lesson not found: {exc}")


@router.get("/{pack_id}/lessons/{lesson_id}/segments")
async def get_lesson_segments(pack_id: str, lesson_id: str):
    """Get loop segments for a specific lesson."""
    try:
        segments = storage.download_json(f"packs/{pack_id}/lessons/{lesson_id}/segments.json")
        return segments
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Segments not found: {exc}")


@router.post("/{pack_id}/lessons/{lesson_id}/upload", status_code=201)
async def upload_lesson_assets(pack_id: str, lesson_id: str, file: UploadFile = File(...)):
    """
    Upload a lesson asset (e.g., keypoints.json, segments.json, video).
    """
    try:
        extension = Path(file.filename or "").suffix
        key = f"packs/{pack_id}/lessons/{lesson_id}/{file.filename}"
        data = await file.read()
        content_type = file.content_type or "application/octet-stream"
        url = storage.upload_bytes(data, key, content_type=content_type, public=True)
        return {"url": url, "key": key, "extension": extension}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
