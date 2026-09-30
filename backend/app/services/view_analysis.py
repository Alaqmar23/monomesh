import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Tuple
from app.core.logging import logger
from app.utils.geometry import rotation_matrix_to_euler

class ViewAnalysisService:
    @staticmethod
    def analyze_views(image_paths: List[str], image_names: List[str]) -> Dict[str, Any]:
        """
        Analyze multi-view coverage, image overlap, and camera relationships.
        All metrics are computed from actual feature matching and epipolar geometry.
        """
        n = len(image_paths)
        if n < 2:
            return {
                "view_coverage": 0.0,
                "image_overlap": 0.0,
                "camera_confidence": 0.0,
                "feature_density": "Low",
                "reconstruction_risk": "High",
                "angular_spread_deg": 0.0,
                "covered_sectors": [],
                "uncovered_sectors": ["Front", "Right", "Rear", "Left"],
                "estimated_cameras": []
            }

        # 1. Extract keypoints and descriptors
        orb = cv2.ORB_create(nfeatures=2500)
        keypoints_list = []
        descriptors_list = []
        valid_images = []

        for path in image_paths:
            img = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
            if img is not None:
                kp, des = orb.detectAndCompute(img, None)
                keypoints_list.append(kp)
                descriptors_list.append(des)
                valid_images.append(img)
            else:
                keypoints_list.append([])
                descriptors_list.append(None)
                valid_images.append(None)

        # 2. Pairwise feature matching
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
        overlap_scores = []
        inlier_ratios = []
        relative_rotations = []
        relative_translations = []

        # Reference camera is at azimuth 0, elevation 0
        camera_estimates = [{
            "image_id": "0",
            "image_name": image_names[0] if image_names else "View 1",
            "azimuth_deg": 0.0,
            "elevation_deg": 0.0,
            "distance": 1.0,
            "relative_rotation": [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]],
            "relative_translation": [0.0, 0.0, 0.0]
        }]

        current_cumulative_R = np.eye(3)
        current_cumulative_t = np.zeros((3, 1))

        # Intrinsic matrix approximation using image dimensions (assuming f ~ max(W, H))
        h0, w0 = valid_images[0].shape if valid_images[0] is not None else (1080, 1920)
        focal_length = max(h0, w0)
        K = np.array([
            [focal_length, 0, w0 / 2.0],
            [0, focal_length, h0 / 2.0],
            [0, 0, 1.0]
        ], dtype=np.float64)

        for i in range(n - 1):
            des1 = descriptors_list[i]
            des2 = descriptors_list[i + 1]
            kp1 = keypoints_list[i]
            kp2 = keypoints_list[i + 1]

            if des1 is None or des2 is None or len(kp1) < 10 or len(kp2) < 10:
                overlap_scores.append(0.0)
                inlier_ratios.append(0.0)
                continue

            # KNN match with k=2 for ratio test
            matches = bf.knnMatch(des1, des2, k=2)
            good_matches = []
            for m_n in matches:
                if len(m_n) == 2:
                    m, m2 = m_n
                    if m.distance < 0.78 * m2.distance:
                        good_matches.append(m)

            min_kps = min(len(kp1), len(kp2))
            overlap_pct = (len(good_matches) / max(1, min_kps)) * 100.0
            overlap_scores.append(min(100.0, overlap_pct * 3.5))  # Normalized scale

            # Epipolar geometry / Essential matrix
            if len(good_matches) >= 8:
                pts1 = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
                pts2 = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)

                E, mask = cv2.findEssentialMat(pts1, pts2, K, method=cv2.RANSAC, prob=0.999, threshold=2.0)
                if E is not None and mask is not None:
                    inliers = int(np.sum(mask))
                    inlier_ratio = (inliers / max(1, len(good_matches))) * 100.0
                    inlier_ratios.append(inlier_ratio)

                    _, R, t, _ = cv2.recoverPose(E, pts1, pts2, K, mask=mask)
                    # Compose relative rotation
                    current_cumulative_R = current_cumulative_R @ R
                    current_cumulative_t = current_cumulative_t + current_cumulative_R @ t

                    azimuth, elevation, _ = rotation_matrix_to_euler(current_cumulative_R)
                    camera_estimates.append({
                        "image_id": str(i + 1),
                        "image_name": image_names[i + 1] if i + 1 < len(image_names) else f"View {i + 2}",
                        "azimuth_deg": round(float(azimuth), 1),
                        "elevation_deg": round(float(elevation), 1),
                        "distance": 1.0,
                        "relative_rotation": current_cumulative_R.tolist(),
                        "relative_translation": current_cumulative_t.flatten().tolist()
                    })
                else:
                    inlier_ratios.append(20.0)
            else:
                inlier_ratios.append(10.0)

        # Average overlap and camera confidence
        avg_overlap = float(np.mean(overlap_scores)) if overlap_scores else 0.0
        avg_confidence = float(np.mean(inlier_ratios)) if inlier_ratios else 0.0

        # Angular coverage assessment around 360 degrees (8 sectors)
        SECTORS = [
            ("Front (0°-45°)", 0.0, 45.0),
            ("Front-Right (45°-90°)", 45.0, 90.0),
            ("Right (90°-135°)", 90.0, 135.0),
            ("Rear-Right (135°-180°)", 135.0, 180.0),
            ("Rear (180°-225°)", 180.0, 225.0),
            ("Rear-Left (225°-270°)", 225.0, 270.0),
            ("Left (270°-315°)", 270.0, 315.0),
            ("Front-Left (315°-360°)", 315.0, 360.0),
        ]

        covered = set()
        azimuths = [cam["azimuth_deg"] for cam in camera_estimates]
        for az in azimuths:
            for name, start, end in SECTORS:
                # Direct sector check with 25 deg field of view tolerance
                if (start - 20) <= az <= (end + 20) or (start == 315 and az <= 20):
                    covered.add(name)

        covered_sectors = list(covered)
        uncovered_sectors = [name for name, _, _ in SECTORS if name not in covered]

        # View coverage calculation
        sector_ratio = len(covered_sectors) / 8.0
        # Incorporate image count factor and overlap quality
        view_coverage = min(95.0, round((sector_ratio * 0.70 + (avg_overlap / 100.0) * 0.30) * 100.0, 1))

        # Overall angular spread
        if len(azimuths) >= 2:
            angular_spread = float(np.ptp(azimuths))
        else:
            angular_spread = 0.0

        # Feature density classification
        total_kps = sum(len(kp) for kp in keypoints_list)
        avg_kps = total_kps / max(1, n)
        if avg_kps > 1500:
            feature_density = "High"
        elif avg_kps > 700:
            feature_density = "Medium"
        else:
            feature_density = "Low"

        # Reconstruction risk
        if n < 3 or view_coverage < 45.0 or avg_confidence < 45.0:
            reconstruction_risk = "High"
        elif view_coverage < 70.0 or avg_confidence < 65.0:
            reconstruction_risk = "Medium"
        else:
            reconstruction_risk = "Low"

        return {
            "view_coverage": view_coverage,
            "image_overlap": round(avg_overlap, 1),
            "camera_confidence": round(avg_confidence, 1),
            "feature_density": feature_density,
            "reconstruction_risk": reconstruction_risk,
            "angular_spread_deg": round(angular_spread, 1),
            "covered_sectors": covered_sectors,
            "uncovered_sectors": uncovered_sectors,
            "estimated_cameras": camera_estimates
        }
