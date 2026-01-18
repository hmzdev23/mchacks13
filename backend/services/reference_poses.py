"""
Reference Poses Service

Provides ideal MediaPipe hand landmarks for ASL alphabets.
Loads from captured JSON data if available, otherwise falls back to
geometrically constructed approximations for testing.
"""

import json
import os
from typing import Dict, List, Optional

# Path to the captured data
DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "reference_landmarks.json")

class ReferencePosesService:
    def __init__(self):
        self.references: Dict[str, List[Dict[str, float]]] = {}
        self._load_references()

    def _load_references(self):
        """Load references from JSON or fallback to geometric."""
        self.references = {}
        
        # 1. Try loading from file
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r") as f:
                    self.references = json.load(f)
                print(f"✅ Loaded {len(self.references)} reference poses from file.")
            except Exception as e:
                print(f"⚠️ Error loading reference file: {e}")
        
        # 2. Add fallbacks if missing (Geometric Approximations)
        # We construct these in normalized coordinates (0-1)
        # These are "good enough" guesses for 'A' and 'B' to allow dev work without capturing
        
        if "A" not in self.references:
            self.references["A"] = self._create_geometric_A()
            
        if "B" not in self.references:
            self.references["B"] = self._create_geometric_B()

    def get_reference(self, letter: str) -> Optional[List[Dict[str, float]]]:
        """Get the 21 landmarks for a specific letter."""
        return self.references.get(letter.upper())

    def _create_geometric_A(self) -> List[Dict[str, float]]:
        """
        Constructs a geometric approximation of 'A'.
        Fist with thumb alongside index.
        """
        # Very rough approximation of a fist facing forward
        landmarks = []
        # Wrist
        landmarks.append({"x": 0.5, "y": 0.9, "z": 0.0}) 
        
        # Thumb (tucked against side)
        landmarks.append({"x": 0.4, "y": 0.8, "z": -0.02}) # CMC
        landmarks.append({"x": 0.35, "y": 0.7, "z": -0.04}) # MCP
        landmarks.append({"x": 0.35, "y": 0.6, "z": -0.05}) # IP
        landmarks.append({"x": 0.35, "y": 0.5, "z": -0.06}) # TIP
        
        # Fingers (curled into palm)
        # Index
        landmarks.append({"x": 0.45, "y": 0.5, "z": -0.1}) # MCP
        landmarks.append({"x": 0.48, "y": 0.6, "z": -0.15}) # PIP
        landmarks.append({"x": 0.45, "y": 0.65, "z": -0.15}) # DIP
        landmarks.append({"x": 0.42, "y": 0.7, "z": -0.1}) # TIP (touching palm)
        
        # Middle
        landmarks.append({"x": 0.5, "y": 0.5, "z": -0.1})
        landmarks.append({"x": 0.52, "y": 0.6, "z": -0.15})
        landmarks.append({"x": 0.5, "y": 0.65, "z": -0.15})
        landmarks.append({"x": 0.48, "y": 0.7, "z": -0.1})
        
        # Ring
        landmarks.append({"x": 0.55, "y": 0.51, "z": -0.1})
        landmarks.append({"x": 0.56, "y": 0.6, "z": -0.15})
        landmarks.append({"x": 0.54, "y": 0.65, "z": -0.15})
        landmarks.append({"x": 0.52, "y": 0.7, "z": -0.1})
        
        # Pinky
        landmarks.append({"x": 0.6, "y": 0.52, "z": -0.1})
        landmarks.append({"x": 0.6, "y": 0.6, "z": -0.15})
        landmarks.append({"x": 0.58, "y": 0.65, "z": -0.15})
        landmarks.append({"x": 0.56, "y": 0.7, "z": -0.1})
        
        return landmarks

    def _create_geometric_B(self) -> List[Dict[str, float]]:
        """
        Constructs a geometric approximation of 'B'.
        Fingers straight up, thumb tucked across palm.
        """
        landmarks = []
        # Wrist
        landmarks.append({"x": 0.5, "y": 0.9, "z": 0.0})
        
        # Thumb (crossed over palm)
        landmarks.append({"x": 0.45, "y": 0.8, "z": -0.02})
        landmarks.append({"x": 0.4, "y": 0.75, "z": -0.04})
        landmarks.append({"x": 0.45, "y": 0.75, "z": -0.05})
        landmarks.append({"x": 0.55, "y": 0.75, "z": -0.06}) # Tip towards pinky side
        
        # Fingers (extended straight up)
        # Index
        landmarks.append({"x": 0.45, "y": 0.5, "z": -0.05}) # MCP
        landmarks.append({"x": 0.44, "y": 0.4, "z": -0.06}) # PIP
        landmarks.append({"x": 0.43, "y": 0.3, "z": -0.07}) # DIP
        landmarks.append({"x": 0.42, "y": 0.2, "z": -0.08}) # TIP
        
        # Middle
        landmarks.append({"x": 0.5, "y": 0.5, "z": -0.05})
        landmarks.append({"x": 0.5, "y": 0.38, "z": -0.06})
        landmarks.append({"x": 0.5, "y": 0.28, "z": -0.07})
        landmarks.append({"x": 0.5, "y": 0.18, "z": -0.08})
        
        # Ring
        landmarks.append({"x": 0.55, "y": 0.51, "z": -0.05})
        landmarks.append({"x": 0.56, "y": 0.4, "z": -0.06})
        landmarks.append({"x": 0.57, "y": 0.3, "z": -0.07})
        landmarks.append({"x": 0.58, "y": 0.2, "z": -0.08})
        
        # Pinky
        landmarks.append({"x": 0.6, "y": 0.52, "z": -0.05})
        landmarks.append({"x": 0.62, "y": 0.45, "z": -0.06})
        landmarks.append({"x": 0.64, "y": 0.38, "z": -0.07})
        landmarks.append({"x": 0.66, "y": 0.3, "z": -0.08})
        
        return landmarks

# Singleton
reference_service = ReferencePosesService()
