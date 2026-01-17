# SecondHand - McHacks 13 Task Tracker

## Pre-Build Setup
- [ ] Review implementation plan as a team
- [ ] Set up Digital Ocean account and services
- [ ] Initialize Next.js project
- [ ] Configure environment variables
- [ ] Record 1-2 expert video clips (Sign Language pack)
- [ ] Preprocess expert clips → JSON keypoints

---

## Person 1: Backend Lead
### Core Tasks (MVP)
- [ ] FastAPI project setup with CORS
- [ ] `/api/lessons` endpoint
- [ ] `/api/lessons/{id}` endpoint  
- [ ] Gemini service integration
- [ ] `/api/coaching/cue` endpoint
- [ ] `/api/coaching/explain` endpoint
- [ ] Digital Ocean Spaces service
- [ ] Upload preprocessed keypoints to Spaces

### Stretch Tasks
- [ ] Analytics endpoints
- [ ] Upload-to-lesson pipeline
- [ ] Deploy to Digital Ocean App Platform

---

## Person 2: CV/Algorithm Lead
### Core Tasks (MVP)
- [ ] MediaPipe Hands integration
- [ ] Keypoint type definitions
- [ ] Spatial alignment algorithm
- [ ] Wrist anchor + scale normalization
- [ ] Frame similarity scoring
- [ ] EMA score smoothing
- [ ] Confidence gating
- [ ] Drift highlighting (worst 3 joints)
- [ ] Deterministic cue mapper (5+ cues)

### Stretch Tasks
- [ ] Procrustes alignment
- [ ] Temporal alignment (DTW-lite)
- [ ] MediaPipe Pose (for CPR pack)
- [ ] Finger spread detection
- [ ] Wrist rotation detection

---

## Person 3: Frontend Lead
### Core Tasks (MVP)
- [ ] Next.js project structure
- [ ] Global CSS + design system
- [ ] Landing page
- [ ] Camera component
- [ ] Canvas overlay component
- [ ] Ghost skeleton rendering
- [ ] User skeleton rendering
- [ ] Score display (animated circle)
- [ ] Cue display component
- [ ] Loop controls component
- [ ] Session page integration

### Stretch Tasks
- [ ] Eleven Labs voice synthesis
- [ ] Voice commands (SpeechRecognition)
- [ ] Framer Motion animations
- [ ] Improvement trend chart
- [ ] Recap screen

---

## Integration Milestones
- [ ] Camera → MediaPipe → Keypoints working
- [ ] Expert JSON loading working
- [ ] Ghost aligns to user correctly
- [ ] Score responds to alignment quality
- [ ] Cues display and speak
- [ ] Loop mode works
- [ ] Full demo flow rehearsed

---

## Demo Prep (Final 4 Hours)
- [ ] Polish ghost visual aesthetics
- [ ] Test in demo lighting conditions
- [ ] Rehearse demo script 20+ times
- [ ] Prepare backup (no network) version
- [ ] Bring ring light for stage

---

## Timeline

| Phase | Hours | Focus |
|-------|-------|-------|
| Setup | 0-2 | Project init, env vars, team sync |
| Core Build | 2-8 | MVP features per person |
| Integration | 8-12 | Connect all parts |
| Polish | 12-16 | UI/UX, animations, bugs |
| Demo Prep | 16-18 | Rehearsal, final fixes |
