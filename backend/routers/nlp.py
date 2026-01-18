"""
NLP endpoints for phrase parsing.
"""

from __future__ import annotations

from typing import Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.phrase_nlp import PhraseNLP

router = APIRouter()
nlp = PhraseNLP()


class PhraseParseRequest(BaseModel):
    phrase: str
    max_words: int = Field(default=20, ge=1, le=20)
    vocabulary: List[str]
    vocab_map: Dict[str, str]
    letters: List[str]


class PhraseParseResponse(BaseModel):
    normalized: str
    words: List[str]
    unknown_words: List[str]
    sequence: List[str]
    gloss: str
    lesson_hints: Dict[str, str]
    dynamic_lessons: Dict[str, Dict[str, str]] = {}


@router.post("/phrase", response_model=PhraseParseResponse)
async def parse_phrase(payload: PhraseParseRequest):
    try:
        result = nlp.parse_phrase(
            phrase=payload.phrase,
            vocabulary=payload.vocabulary,
            vocab_map=payload.vocab_map,
            letters=payload.letters,
            max_words=payload.max_words,
        )
        return PhraseParseResponse(
            normalized=result.normalized,
            words=result.words,
            unknown_words=result.unknown_words,
            sequence=result.sequence,
            gloss=result.gloss,
            lesson_hints=result.lesson_hints,
            dynamic_lessons=result.dynamic_lessons,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
