"""
Dynamic ASL lesson generator.

Searches for an ASL sign image, extracts hand keypoints with MediaPipe,
and uploads the resulting keypoints + reference image to Spaces.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from typing import Dict, List, Optional

import cv2
import google.generativeai as genai
import httpx
import mediapipe as mp
import numpy as np

from config import get_settings
from services.spaces_storage import SpacesStorage

settings = get_settings()
genai.configure(api_key=settings.gemini_api_key)


@dataclass
class DynamicLesson:
    lesson_id: str
    word: str
    label: str
    keypoints_url: str
    image_url: str


class DynamicASLGenerator:
    def __init__(self) -> None:
        self.storage = SpacesStorage()
        self.http = httpx.Client(timeout=10.0)
        self.hands = mp.solutions.hands.Hands(
            static_image_mode=True,
            max_num_hands=1,
            min_detection_confidence=0.6,
            min_tracking_confidence=0.6,
        )
        self.ranker = genai.GenerativeModel(
            model_name=settings.gemini_model,
            system_instruction=(
                "You rank image search results for ASL signs. "
                "Prefer clear, close-up hand sign photos or diagrams for the given word. "
                "Avoid logos, text-only, or unrelated images. "
                "Return JSON only: {\"order\": [0,1,2]} with indices in best-first order."
            ),
        )

    def _slugify(self, word: str) -> str:
        cleaned = re.sub(r"[^a-z0-9]+", "-", word.lower()).strip("-")
        return cleaned or "word"

    def _lesson_id(self, word: str) -> str:
        digest = hashlib.sha1(word.encode("utf-8")).hexdigest()[:6]
        return f"word-dyn-{self._slugify(word)}-{digest}"

    def _search_images(self, word: str) -> List[Dict[str, str]]:
        if not settings.google_cse_api_key or not settings.google_cse_cx:
            return []
        query = f"ASL sign {word}"
        params = {
            "key": settings.google_cse_api_key,
            "cx": settings.google_cse_cx,
            "q": query,
            "searchType": "image",
            "num": 5,
            "safe": "active",
        }
        resp = self.http.get("https://www.googleapis.com/customsearch/v1", params=params)
        resp.raise_for_status()
        data = resp.json()
        results = []
        for item in data.get("items", []):
            link = item.get("link")
            if not link:
                continue
            results.append(
                {
                    "link": link,
                    "title": item.get("title", ""),
                    "snippet": item.get("snippet", ""),
                    "display": item.get("displayLink", ""),
                }
            )
        return results

    def _rank_candidates(self, word: str, candidates: List[Dict[str, str]]) -> List[Dict[str, str]]:
        if not candidates:
            return []
        try:
            payload = json.dumps(
                [
                    {
                        "index": idx,
                        "title": c.get("title", ""),
                        "snippet": c.get("snippet", ""),
                        "display": c.get("display", ""),
                        "link": c.get("link", ""),
                    }
                    for idx, c in enumerate(candidates)
                ]
            )
            prompt = f"Word: {word}\nCandidates: {payload}\nReturn JSON only."
            response = self.ranker.generate_content(prompt)
            text = response.text or ""
            start = text.find("{")
            end = text.rfind("}")
            data = json.loads(text[start : end + 1]) if start != -1 and end != -1 else {}
            order = data.get("order", [])
            ordered = [candidates[i] for i in order if isinstance(i, int) and 0 <= i < len(candidates)]
            return ordered if ordered else candidates
        except Exception:
            return candidates

    def _download_image(self, url: str) -> Optional[bytes]:
        try:
            resp = self.http.get(url, follow_redirects=True)
            resp.raise_for_status()
            content = resp.content
            if not content or len(content) > 4 * 1024 * 1024:
                return None
            return content
        except Exception:
            return None

    def _extract_hand_keypoints(self, image_bytes: bytes) -> Optional[Dict[str, object]]:
        data = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(data, cv2.IMREAD_COLOR)
        if image is None:
            return None
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb)
        if not results.multi_hand_landmarks or not results.multi_handedness:
            return None

        handedness = results.multi_handedness[0].classification[0]
        label = handedness.label
        score = float(handedness.score)
        landmarks = results.multi_hand_landmarks[0].landmark
        points = [[lm.x, lm.y, lm.z] for lm in landmarks]
        return {
            "label": label,
            "score": score,
            "points": points,
            "image": image,
        }

    def _encode_reference_png(self, image: np.ndarray) -> Optional[bytes]:
        success, buffer = cv2.imencode(".png", image)
        if not success:
            return None
        return buffer.tobytes()

    def _build_keypoints(self, hand: Dict[str, object]) -> List[Dict[str, object]]:
        label = hand["label"]
        points = hand["points"]
        left_hand = points if label.lower() == "left" else None
        right_hand = points if label.lower() != "left" else None
        return [
            {
                "frame_index": 0,
                "timestamp_ms": 0,
                "left_hand": left_hand,
                "right_hand": right_hand,
                "pose": None,
                "left_hand_confidence": hand["score"] if left_hand else 0.0,
                "right_hand_confidence": hand["score"] if right_hand else 0.0,
                "pose_confidence": 0.0,
            }
        ]

    def generate_for_word(self, word: str) -> Optional[DynamicLesson]:
        candidates = self._search_images(word)
        ranked = self._rank_candidates(word, candidates)
        for candidate in ranked:
            image_bytes = self._download_image(candidate["link"])
            if not image_bytes:
                continue
            hand = self._extract_hand_keypoints(image_bytes)
            if not hand:
                continue
            keypoints = self._build_keypoints(hand)
            lesson_id = self._lesson_id(word)
            keypoints_key = f"packs/asl/lessons/{lesson_id}/keypoints.json"
            keypoints_url = self.storage.upload_json(keypoints, keypoints_key, public=True)

            ref_png = self._encode_reference_png(hand["image"])
            if not ref_png:
                continue
            image_key = f"packs/asl/lessons/{lesson_id}/reference.png"
            image_url = self.storage.upload_bytes(ref_png, image_key, content_type="image/png", public=True)

            return DynamicLesson(
                lesson_id=lesson_id,
                word=word,
                label=word.title(),
                keypoints_url=keypoints_url,
                image_url=image_url,
            )
        return None

    def generate_batch(self, words: List[str]) -> Dict[str, DynamicLesson]:
        results: Dict[str, DynamicLesson] = {}
        for word in dict.fromkeys(words):
            lesson = self.generate_for_word(word)
            if lesson:
                results[word] = lesson
        return results
