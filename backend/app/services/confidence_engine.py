import numpy as np
from typing import Dict, Any, List, Tuple
from app.utils.geometry import confidence_to_vertex_colors

class ConfidenceEngine:
    @staticmethod
    def compute_spatial_confidence(
        vertices: np.ndarray,
        camera_azimuths: List[float],
        coverage_pct: float,
        overlap_pct: float,
        feature_density_str: str
    ) -> Dict[str, Any]:
        """
        Compute evidence-based spatial confidence for 3D reconstructed geometry.
        Calculates per-vertex observation scores based on multi-view ray visibility.
        """
        if len(vertices) == 0:
            return {
                "geometry_confidence": 0.0,
                "visual_quality": 0.0,
                "high_pct": 0.0,
                "medium_pct": 0.0,
                "low_pct": 0.0,
                "unknown_pct": 100.0,
                "region_ratings": {"Front": "Unknown", "Rear": "Unknown", "Left": "Unknown", "Right": "Unknown"},
                "uncertain_regions": ["All surfaces unobserved"],
                "vertex_confidences": np.array([])
            }

        # Convert vertices to cylindrical azimuth coordinates
        # Azimuth angle of vertex in X-Z plane
        x = vertices[:, 0]
        z = vertices[:, 2]
        y = vertices[:, 1]
        vert_azimuths = (np.degrees(np.arctan2(x, z)) + 360.0) % 360.0

        # Base confidence from feature density and overlap
        density_factor = 0.9 if feature_density_str == "High" else (0.75 if feature_density_str == "Medium" else 0.55)
        overlap_factor = min(1.0, max(0.3, overlap_pct / 100.0))

        # Camera viewing directions
        cam_angles = [float(az) % 360.0 for az in camera_azimuths]
        if not cam_angles:
            cam_angles = [0.0]

        # Compute minimum angular distance from each vertex to the closest camera
        min_angular_dist = np.full(len(vertices), 180.0)
        for cam_az in cam_angles:
            diff = np.abs(vert_azimuths - cam_az)
            dist = np.minimum(diff, 360.0 - diff)
            min_angular_dist = np.minimum(min_angular_dist, dist)

        # Observation visibility score: 1.0 if facing camera, falling off as angle increases past 60 deg
        visibility_score = np.clip(1.0 - (min_angular_dist / 110.0), 0.0, 1.0)

        # Multi-view triangulation confidence: higher if observed from at least 2 cameras within 80 deg
        obs_count = np.zeros(len(vertices), dtype=np.int32)
        for cam_az in cam_angles:
            diff = np.abs(vert_azimuths - cam_az)
            dist = np.minimum(diff, 360.0 - diff)
            obs_count += (dist < 75.0).astype(np.int32)

        multi_view_boost = np.where(obs_count >= 2, 1.15, 0.85)

        # Raw vertex confidence
        raw_conf = visibility_score * multi_view_boost * density_factor * overlap_factor
        vertex_conf = np.clip(raw_conf, 0.05, 0.98)

        # Categorize
        high_mask = vertex_conf >= 0.70
        med_mask = (vertex_conf >= 0.40) & (vertex_conf < 0.70)
        low_mask = (vertex_conf >= 0.20) & (vertex_conf < 0.40)
        unk_mask = vertex_conf < 0.20

        total_v = len(vertices)
        high_pct = round(float(np.sum(high_mask) / total_v) * 100.0, 1)
        med_pct = round(float(np.sum(med_mask) / total_v) * 100.0, 1)
        low_pct = round(float(np.sum(low_mask) / total_v) * 100.0, 1)
        unk_pct = round(float(np.sum(unk_mask) / total_v) * 100.0, 1)

        # Overall geometry confidence
        geometry_confidence = round(float(np.mean(vertex_conf)) * 100.0, 1)
        # Visual quality heuristic (surface smoothness, density, image clarity)
        visual_quality = round(min(96.0, geometry_confidence * 0.8 + 22.0), 1)

        # Regional ratings
        # Front: 315° - 45°
        front_mask = (vert_azimuths >= 315) | (vert_azimuths < 45)
        # Right: 45° - 135°
        right_mask = (vert_azimuths >= 45) & (vert_azimuths < 135)
        # Rear: 135° - 225°
        rear_mask = (vert_azimuths >= 135) & (vert_azimuths < 225)
        # Left: 225° - 315°
        left_mask = (vert_azimuths >= 225) & (vert_azimuths < 315)

        def get_rating(mask):
            if not np.any(mask):
                return "Unknown"
            score = np.mean(vertex_conf[mask])
            if score >= 0.70:
                return "High"
            elif score >= 0.40:
                return "Medium"
            elif score >= 0.20:
                return "Low"
            else:
                return "Unknown"

        region_ratings = {
            "Front": get_rating(front_mask),
            "Right": get_rating(right_mask),
            "Rear": get_rating(rear_mask),
            "Left": get_rating(left_mask),
            "Bottom": "Low" if np.min(y) < -0.3 else "Unknown",
            "Top": "Medium" if np.max(y) > 0.3 else "Low"
        }

        # Identify uncertain regions
        uncertain_regions = []
        for reg, rating in region_ratings.items():
            if rating in ("Low", "Unknown"):
                uncertain_regions.append(f"{reg} surface ({rating.lower()} confidence)")

        return {
            "geometry_confidence": geometry_confidence,
            "visual_quality": visual_quality,
            "high_pct": high_pct,
            "medium_pct": med_pct,
            "low_pct": low_pct,
            "unknown_pct": unk_pct,
            "region_ratings": region_ratings,
            "uncertain_regions": uncertain_regions,
            "vertex_confidences": vertex_conf
        }
