from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Tuple
from services.asl_model import asl_service

router = APIRouter()

class Landmark(BaseModel):
    x: float
    y: float
    z: float = 0.0

class PredictionRequest(BaseModel):
    landmarks: List[List[float]] # List of [x, y] or [x, y, z]

class PredictionResponse(BaseModel):
    letter: str
    confidence: float

@router.post("/predict", response_model=PredictionResponse)
async def predict_asl(request: PredictionRequest):
    """
    Predict ASL letter from hand landmarks.
    """
    if not asl_service.interpreter:
        raise HTTPException(status_code=503, detail="ASL Model not loaded")

    if len(request.landmarks) != 21:
        raise HTTPException(status_code=400, detail="Expected 21 landmarks")

    letter, confidence = asl_service.predict(request.landmarks)
    
    return {
        "letter": letter,
        "confidence": confidence
    }
