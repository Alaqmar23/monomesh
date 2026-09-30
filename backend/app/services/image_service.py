import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.core.logging import logger

class ImageService:
    @staticmethod
    def analyze_image(filepath: str) -> Dict[str, Any]:
        """
        Analyze an image using real OpenCV metrics.
        No hard-coded values or fake scores.
        """
        path = Path(filepath)
        if not path.exists():
            return {
                "is_valid": False,
                "validation_error": "File does not exist on disk."
            }

        # Read image with OpenCV
        img = cv2.imread(str(path))
        if img is None:
            return {
                "is_valid": False,
                "validation_error": "Failed to decode image data. Corrupted or invalid format."
            }

        height, width, channels = img.shape
        if height < 128 or width < 128:
            return {
                "is_valid": False,
                "validation_error": f"Image resolution {width}x{height} is too low. Minimum required is 128x128."
            }

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 1. Sharpness via Variance of Laplacian
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        # Typically < 100 indicates blur, > 300 is sharp
        blur_detected = laplacian_var < 90.0

        # 2. Brightness and Contrast
        brightness = float(np.mean(gray))
        contrast = float(np.std(gray))

        # 3. Exposure categorization
        if brightness < 40:
            exposure = "Underexposed"
        elif brightness > 215:
            exposure = "Overexposed"
        elif contrast < 25:
            exposure = "Low Contrast"
        else:
            exposure = "Good"

        # 4. Feature Detection (ORB / SIFT)
        # Using ORB with up to 3000 keypoints
        orb = cv2.ORB_create(nfeatures=3000)
        keypoints = orb.detect(gray, None)
        feature_count = len(keypoints)

        # Features per megapixel
        mp = (width * height) / 1_000_000.0
        features_per_mp = feature_count / max(0.1, mp)

        if features_per_mp > 1200:
            feature_density = "High"
        elif features_per_mp > 500:
            feature_density = "Medium"
        else:
            feature_density = "Low"

        # Check validity
        validation_error = None
        is_valid = True
        if blur_detected:
            validation_error = "Image is noticeably blurry. This may reduce 3D reconstruction accuracy."
        elif feature_count < 80:
            validation_error = "Very few distinct visual features detected. Reconstruction may fail on this viewpoint."

        return {
            "width": width,
            "height": height,
            "channels": channels,
            "sharpness": round(laplacian_var, 2),
            "blur_detected": blur_detected,
            "brightness": round(brightness, 2),
            "contrast": round(contrast, 2),
            "exposure": exposure,
            "feature_count": feature_count,
            "feature_density": feature_density,
            "is_valid": is_valid,
            "validation_error": validation_error
        }

    @staticmethod
    def generate_quality_summary(analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Aggregate image quality metrics across all uploaded views.
        """
        if not analyses:
            return {
                "total_images": 0,
                "valid_images": 0,
                "average_sharpness": 0.0,
                "average_features": 0,
                "warnings": ["No images provided for analysis."]
            }

        valid_count = sum(1 for a in analyses if a.get("is_valid", False))
        avg_sharpness = float(np.mean([a.get("sharpness", 0.0) for a in analyses]))
        avg_features = int(np.mean([a.get("feature_count", 0) for a in analyses]))

        warnings = []
        for i, a in enumerate(analyses, start=1):
            if a.get("blur_detected", False):
                warnings.append(f"Image {i} ({a.get('original_name', 'view')}) is blurry (sharpness {a.get('sharpness')}).")
            if a.get("exposure") in ("Underexposed", "Overexposed"):
                warnings.append(f"Image {i} ({a.get('original_name', 'view')}) is {a.get('exposure').lower()}.")
            if a.get("feature_density") == "Low":
                warnings.append(f"Image {i} ({a.get('original_name', 'view')}) has low feature density ({a.get('feature_count')} features).")

        return {
            "total_images": len(analyses),
            "valid_images": valid_count,
            "average_sharpness": round(avg_sharpness, 2),
            "average_features": avg_features,
            "warnings": warnings
        }
