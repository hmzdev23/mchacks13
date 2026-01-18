"""
SecondHand API - Main Application

FastAPI backend for:
- AI coaching (Gemini NLP)
- Voice synthesis (ElevenLabs)
- Storage (DigitalOcean Spaces)
- Pack management
- Preprocessing endpoints
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import coaching, voice, packs, preprocessing, feedback

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    print(f"🚀 Starting {settings.app_name}")
    yield
    print("👋 Shutting down...")


app = FastAPI(
    title=settings.app_name,
    description="Backend API for SecondHand motion learning platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(coaching.router, prefix="/api/coaching", tags=["Coaching"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice"])
app.include_router(packs.router, prefix="/api/packs", tags=["Packs"])
app.include_router(preprocessing.router, prefix="/api/preprocessing", tags=["Preprocessing"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["Feedback"])


@app.get("/")
async def root():
    return {"message": "SecondHand API", "status": "healthy"}


@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.app_name}
