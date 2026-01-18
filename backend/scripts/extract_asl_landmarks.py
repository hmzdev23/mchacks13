import cv2
import mediapipe as mp
import json
import os
import glob

# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=True,
    max_num_hands=1,
    min_detection_confidence=0.5
)

def extract_landmarks(image_path):
    image = cv2.imread(image_path)
    if image is None:
        print(f"Failed to load image: {image_path}")
        return None
    
    # Convert to RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = hands.process(image_rgb)
    
    if results.multi_hand_landmarks:
        # Get the first hand detected
        landmarks = results.multi_hand_landmarks[0]
        # Convert to list of [x, y]
        return [[lm.x, lm.y] for lm in landmarks.landmark]
    return None

def main():
    image_dir = "../../frontend/public/asl-images"
    output_file = "../../frontend/src/constants/asl-landmarks.ts"
    
    reference_data = {}
    
    image_files = glob.glob(os.path.join(image_dir, "*.png"))
    print(f"Found {len(image_files)} images.")
    
    for file_path in image_files:
        letter = os.path.basename(file_path).split('.')[0].upper()
        print(f"Processing letter: {letter}...")
        landmarks = extract_landmarks(file_path)
        if landmarks:
            reference_data[letter] = landmarks
        else:
            print(f"Warning: No hand detected for {letter}")

    # Generate TypeScript file
    ts_content = "/* eslint-disable */\n\n"
    ts_content += "import { Point2D } from '@/lib/cv/alignment';\n\n"
    ts_content += "export const ASL_LANDMARKS: Record<string, Point2D[]> = "
    ts_content += json.dumps(reference_data, indent=2)
    ts_content += ";\n"
    
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w') as f:
        f.write(ts_content)
    
    print(f"Successfully wrote landmarks to {output_file}")

if __name__ == "__main__":
    main()
