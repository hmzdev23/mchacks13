# SecondHand
Learn physical skills from invisible teachers.

SecondHand is a real-time motion learning platform that overlays an expert "ghost"
on a live camera feed so users can match form, timing, and alignment. It turns
skill practice into a visual alignment task with instant scoring and coaching
cues.

## What it does
- Live ghost overlay for hands or full body.
- Real-time alignment scoring with top-joint error highlights.
- Loop mode micro-drills and score trend feedback.
- ASL practice: letters, words, and custom phrases.
- Dance mode: full-body choreography with audio sync and score trend chart.
- AI coaching: deterministic cues plus Gemini natural language polish.
- Voice features: voice commands and ElevenLabs ConvAI widget.
- Dynamic ASL words: unknown words can be generated on the fly from image search
  (with a fallback to finger-spelling).

## How it works
1. Expert demos are preprocessed into keypoint sequences (MediaPipe + OpenCV).
2. Packs store lesson metadata, segments, and keypoints.
3. In the browser, MediaPipe runs locally to detect hands or pose.
4. Alignment normalizes and anchors the expert ghost onto the user.
5. Scoring computes positional and angular error and smooths it with EMA.
6. Cue mapping surfaces the top corrections; Gemini can rewrite them into
   friendly coaching.
7. Pack loading pulls from `/public/packs` or a CDN base.

## Tech stack
Frontend:
- Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion.
- MediaPipe Hands/Pose (in browser).
- Canvas overlays for ghost and highlights.
- Zustand for session state.
- @elevenlabs/react for ConvAI widget integration.

Backend:
- FastAPI, Pydantic.
- MediaPipe + OpenCV + NumPy + SciPy for preprocessing.
- Gemini API for NLP parsing and coaching.
- ElevenLabs for TTS.
- DigitalOcean Spaces (S3-compatible) for pack storage.
- Google Custom Search for dynamic ASL image lookup.

## APIs and services used
- Google MediaPipe (hands/pose tracking).
- Google Gemini (phrase parser + coaching language).
- ElevenLabs (TTS + conversational agent).
- Google Custom Search (ASL sign image lookup for dynamic words).
- DigitalOcean Spaces (keypoint and asset storage).

## What we learned
- Alignment quality matters more than fancy rendering; anchor-based transforms
  are fast and reliable.
- Smoothing and confidence gating are essential for stable overlays and scores.
- Deterministic cues keep feedback reliable; LLMs work best as a polish layer.
- Looping short segments creates visible improvement quickly (best demo payoff).
- Preprocessed packs and CDN delivery make live demos more robust.

## Project structure
- `frontend/`: Next.js app, UI, MediaPipe hooks, overlays, session modes.
- `backend/`: FastAPI services for NLP, coaching, preprocessing, packs, storage.
- `frontend/public/packs/`: ASL and dance keypoint packs and segments.
- `docs/`: planning docs and prompts.
- `SecondHand - McHacks 13 Project.pdf`: project whitepaper.
