import csv
import numpy as np
import tensorflow as tf
import os
import itertools
import copy

class ASLModelService:
    def __init__(self):
        # Paths relative to backend root (where main.py is run)
        self.model_path = os.path.join("model", "asl", "keypoint_classifier.tflite")
        self.label_path = os.path.join("model", "asl", "keypoint_classifier_label.csv")
        
        self.labels = self._load_labels()
        self.interpreter = None
        self.input_details = None
        self.output_details = None
        
        self._load_model()

    def _load_labels(self):
        try:
            with open(self.label_path, encoding='utf-8-sig') as f:
                reader = csv.reader(f)
                return [row[0] for row in reader]
        except Exception as e:
            print(f"Error loading ASL labels: {e}")
            return []

    def _load_model(self):
        try:
            self.interpreter = tf.lite.Interpreter(model_path=self.model_path, num_threads=1)
            self.interpreter.allocate_tensors()
            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()
            print(f"✅ ASL Model loaded from {self.model_path}")
        except Exception as e:
            print(f"❌ Failed to load ASL model: {e}")

    def predict(self, landmarks):
        """
        Predicts ASL letter from a list of [x, y] or [x, y, z] landmarks.
        Expects 21 landmarks.
        """
        if not self.interpreter:
            return None, 0.0

        processed_landmarks = self.pre_process_landmark(landmarks)
        
        input_details_tensor_index = self.input_details[0]['index']
        self.interpreter.set_tensor(
            input_details_tensor_index, 
            np.array([processed_landmarks], dtype=np.float32)
        )
        self.interpreter.invoke()

        output_details_tensor_index = self.output_details[0]['index']
        result = self.interpreter.get_tensor(output_details_tensor_index)
        
        result_index = np.argmax(np.squeeze(result))
        confidence = float(np.max(result))
        
        predicted_label = self.labels[result_index] if 0 <= result_index < len(self.labels) else "Unknown"
        
        return predicted_label, confidence

    def pre_process_landmark(self, landmark_list):
        """
        Converts landmarks to relative coordinates and normalizes them.
        Based on AkramOM606's implementation.
        """
        temp_landmark_list = copy.deepcopy(landmark_list)

        # Convert to relative coordinates
        base_x, base_y = 0, 0
        for index, landmark_point in enumerate(temp_landmark_list):
            if index == 0:
                base_x, base_y = landmark_point[0], landmark_point[1]

            temp_landmark_list[index][0] = temp_landmark_list[index][0] - base_x
            temp_landmark_list[index][1] = temp_landmark_list[index][1] - base_y

        # Flatten list (only using x, y)
        # Handle if input has z or not
        flat_list = []
        for landmark in temp_landmark_list:
            flat_list.append(landmark[0])
            flat_list.append(landmark[1])

        # Normalization
        max_value = max(list(map(abs, flat_list)))

        def normalize_(n):
            return n / max_value if max_value != 0 else 0

        return list(map(normalize_, flat_list))

# Singleton instance
asl_service = ASLModelService()
