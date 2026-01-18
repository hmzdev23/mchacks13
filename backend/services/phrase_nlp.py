"""
Phrase NLP Service

Uses Gemini to normalize and tokenize phrases into ASL lesson vocabulary.
Falls back to deterministic parsing when the model fails.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Dict, List, Optional

import google.generativeai as genai

from config import get_settings

settings = get_settings()
genai.configure(api_key=settings.gemini_api_key)


@dataclass
class PhraseParseResult:
    normalized: str
    words: List[str]
    unknown_words: List[str]
    sequence: List[str]


class PhraseNLP:
    SYSTEM_PROMPT = """You are an ASL phrase parser.
You receive a user phrase and a list of allowed vocabulary words.
Return ONLY JSON with keys:
- normalized: the cleaned lowercase phrase
- words: ordered list of vocabulary words (multi-word allowed) in sequence
- unknown_words: list of words not found in vocabulary

Rules:
1) Use only words in the given vocabulary list for "words".
2) If a phrase token is not in vocabulary, add it to unknown_words.
3) Keep the order; do not invent new words.
4) Output valid JSON only, no extra text.
"""

    def __init__(self):
        self.model = genai.GenerativeModel(
            model_name=settings.gemini_model, system_instruction=self.SYSTEM_PROMPT
        )

    def _normalize(self, phrase: str) -> str:
        cleaned = (
            phrase.lower()
            .replace("’", "'")
            .replace("'", "")
        )
        cleaned = "".join(ch if ch.isalpha() or ch.isspace() else " " for ch in cleaned)
        cleaned = " ".join(cleaned.split())
        return cleaned

    def _deterministic_parse(self, normalized: str, vocab: List[str]) -> List[str]:
        tokens = normalized.split()
        vocab_tokens = sorted(
            [(word, word.split()) for word in vocab], key=lambda x: len(x[1]), reverse=True
        )
        results: List[str] = []
        i = 0
        while i < len(tokens):
            matched = False
            for word, parts in vocab_tokens:
                if tokens[i : i + len(parts)] == parts:
                    results.append(word)
                    i += len(parts)
                    matched = True
                    break
            if not matched:
                results.append(tokens[i])
                i += 1
        return results

    def _extract_json(self, text: str) -> Optional[dict]:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            return None
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None

    def parse_phrase(
        self,
        phrase: str,
        vocabulary: List[str],
        vocab_map: Dict[str, str],
        letters: List[str],
        max_words: int = 20,
    ) -> PhraseParseResult:
        normalized = self._normalize(phrase)
        tokens = normalized.split()
        if not tokens:
            raise ValueError("Phrase must contain at least one word.")
        if len(tokens) > max_words:
            raise ValueError("Phrase exceeds max word count.")

        words: List[str] = []
        unknown: List[str] = []

        prompt = f"""Phrase: {normalized}
Vocabulary: {json.dumps(vocabulary)}
Return JSON only."""

        try:
            response = self.model.generate_content(prompt)
            data = self._extract_json(response.text or "")
            if data:
                words = [w for w in data.get("words", []) if isinstance(w, str)]
                unknown = [w for w in data.get("unknown_words", []) if isinstance(w, str)]
        except Exception:
            words = []
            unknown = []

        if not words:
            words = self._deterministic_parse(normalized, vocabulary)

        # Build sequence by mapping to lesson IDs; fallback to letters
        sequence: List[str] = []
        for word in words:
            if word in vocab_map:
                sequence.append(vocab_map[word])
            else:
                unknown.append(word)
                for ch in word:
                    if ch in letters:
                        sequence.append(f"letter-{ch}")
                    else:
                        raise ValueError(f"Unsupported character: {ch}")

        unknown = sorted(set(unknown))
        return PhraseParseResult(
            normalized=normalized, words=words, unknown_words=unknown, sequence=sequence
        )
