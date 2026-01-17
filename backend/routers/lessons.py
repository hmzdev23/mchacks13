from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from models.lesson import LessonKeypoints, LessonMetadata
from services.lesson_repository import LessonRepository
from services.spaces_service import SpacesService

router = APIRouter(prefix="/api/lessons", tags=["lessons"])


def get_repo() -> LessonRepository:
    spaces = SpacesService()
    return LessonRepository(spaces)


@router.get("", response_model=List[LessonMetadata])
async def list_lessons(repo: LessonRepository = Depends(get_repo)) -> List[LessonMetadata]:
    return repo.list_lessons()


@router.get("/{lesson_id}", response_model=LessonMetadata)
async def get_lesson(lesson_id: str, repo: LessonRepository = Depends(get_repo)) -> LessonMetadata:
    lesson = repo.get_lesson(lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.get("/{lesson_id}/keypoints", response_model=Optional[LessonKeypoints])
async def get_lesson_keypoints(
    lesson_id: str, repo: LessonRepository = Depends(get_repo)
) -> Optional[LessonKeypoints]:
    keypoints = repo.get_keypoints(lesson_id)
    if keypoints is None:
        raise HTTPException(status_code=404, detail="Keypoints not found")
    return keypoints
