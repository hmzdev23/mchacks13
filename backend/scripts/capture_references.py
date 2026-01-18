import cv2
import mediapipe as mp
import json
import os
import sys

# Constants
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
OUTPUT_FILE = os.path.join(DATA_DIR, "reference_landmarks.json")

def main():
    # Ensure data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)

    # Load existing data if available
    landmarks_data = {}
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, "r") as f:
                landmarks_data = json.load(f)
            print(f"Loaded existing data for: {list(landmarks_data.keys())}")
        except json.JSONDecodeError:
            print("Warning: Could not decode existing JSON, starting fresh.")

    # Initialize MediaPipe Hands
    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=1,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.5
    )
    mp_draw = mp.solutions.drawing_utils

    cap = cv2.VideoCapture(0)
    
    print("\n=== ASL Reference Capture Tool ===")
    print("Instructions:")
    print("1. Show your hand to the camera.")
    print("2. Press a letter key (A-Z) to save the current pose for that letter.")
    print("3. Press 'q' or ESC to quit.")
    print("==================================\n")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("Ignoring empty camera frame.")
            continue

        # Flip frame horizontally for selfie-view
        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb_frame)

        # Draw landmarks
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

                # Wait for key press
                key = cv2.waitKey(1) & 0xFF
                
                # Check if it's a letter
                if 65 <= key <= 90 or 97 <= key <= 122: # A-Z or a-z
                    letter = chr(key).upper()
                    
                    # Extract landmarks
                    # Normalize relative to wrist (index 0) to be position invariant-ish
                    # But actually, simpler to store raw normalized (0-1) coordinates from MediaPipe
                    # and let the alignment engine handle the rest.
                    stored_landmarks = []
                    for lm in hand_landmarks.landmark:
                        stored_landmarks.append({
                            "x": lm.x,
                            "y": lm.y,
                            "z": lm.z
                        })
                    
                    landmarks_data[letter] = stored_landmarks
                    print(f"✅ Saved reference for letter: {letter}")
                    
                    # Save to file immediately
                    with open(OUTPUT_FILE, "w") as f:
                        json.dump(landmarks_data, f, indent=2)

        cv2.imshow('ASL Capture Tool', frame)

        if cv2.waitKey(5) & 0xFF == 27 or cv2.waitKey(5) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print(f"\nSaved landmarks to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
