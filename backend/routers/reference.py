from fastapi import APIRouter, HTTPException
from services.reference_poses import reference_service

router = APIRouter()

@router.get("/asl/{letter}")
async def get_asl_reference(letter: str):
    """
    Get the ideal landmarks for a specific ASL letter.
    Returns 404 if not found.
    """
    if len(letter) != 1 or not letter.isalpha():
        raise HTTPException(status_code=400, detail="Input must be a single letter.")
    
    landmarks = reference_service.get_reference(letter)
    if not landmarks:
        raise HTTPException(status_code=404, detail=f"Reference for '{letter}' not found.")
        
    return {"letter": letter.upper(), "landmarks": landmarks}
