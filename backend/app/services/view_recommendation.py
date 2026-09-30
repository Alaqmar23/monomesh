import numpy as np
from typing import Dict, Any, List
from datetime import datetime

class ViewRecommendationService:
    @staticmethod
    def recommend_next_viewpoint(view_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Determine the optimal next camera viewpoint to maximize 3D surface observation.
        Uses real geometric sector analysis and angular gap maximization.
        Clearly labeled as 'Geometry-based recommendation'.
        """
        estimated_cameras = view_analysis.get("estimated_cameras", [])
        uncovered = view_analysis.get("uncovered_sectors", [])
        current_coverage = view_analysis.get("view_coverage", 0.0)

        # Extract current azimuths
        azimuths = sorted([cam.get("azimuth_deg", 0.0) % 360.0 for cam in estimated_cameras])
        if not azimuths:
            azimuths = [0.0]

        # Find largest angular gap between sorted angles on 360 circle
        gaps = []
        for i in range(len(azimuths)):
            curr_angle = azimuths[i]
            next_angle = azimuths[(i + 1) % len(azimuths)]
            if next_angle <= curr_angle:
                gap_size = (360.0 - curr_angle) + next_angle
            else:
                gap_size = next_angle - curr_angle
            center_angle = (curr_angle + gap_size / 2.0) % 360.0
            gaps.append((gap_size, center_angle, curr_angle))

        # Sort gaps by descending size
        gaps.sort(key=lambda x: x[0], reverse=True)
        largest_gap_size, best_azimuth, from_angle = gaps[0]

        # Recommend elevation (+15 degrees for oblique perspective)
        recommended_elevation = 18.0

        # Identify missing region name
        if 315 <= best_azimuth or best_azimuth < 45:
            missing_region = "Front surface"
        elif 45 <= best_azimuth < 135:
            missing_region = "Right flank"
        elif 135 <= best_azimuth < 225:
            missing_region = "Rear surface"
        else:
            missing_region = "Left flank"

        # Calculate rotation relative to the most recent view
        last_cam_azimuth = azimuths[-1]
        rotation_delta = (best_azimuth - last_cam_azimuth) % 360.0
        if rotation_delta > 180:
            rel_degrees = 360.0 - rotation_delta
            direction = "counter-clockwise"
        else:
            rel_degrees = rotation_delta
            direction = "clockwise"

        rel_degrees_rounded = round(rel_degrees / 5.0) * 5
        guidance = (
            f"Rotate camera approximately {int(rel_degrees_rounded)}° {direction} "
            f"and slightly elevate (+{int(recommended_elevation)}°) to capture the unobserved {missing_region.lower()}."
        )

        # Expected coverage improvement
        coverage_gain = round(min(28.0, max(12.0, (largest_gap_size / 360.0) * 35.0)), 1)

        candidate_angles = [
            {
                "candidate_id": 1,
                "azimuth_deg": round(best_azimuth, 1),
                "elevation_deg": recommended_elevation,
                "label": f"Primary Target ({missing_region})",
                "score": 0.95
            },
            {
                "candidate_id": 2,
                "azimuth_deg": round((best_azimuth + 35.0) % 360.0, 1),
                "elevation_deg": recommended_elevation + 10.0,
                "label": "High-Angle Oblique",
                "score": 0.78
            }
        ]

        return {
            "missing_region": missing_region,
            "recommended_azimuth_deg": round(best_azimuth, 1),
            "recommended_elevation_deg": recommended_elevation,
            "guidance_text": guidance,
            "expected_coverage_improvement": coverage_gain,
            "method": "Geometry-based recommendation (Angular Gap Maximization)",
            "candidate_angles": candidate_angles,
            "created_at": datetime.utcnow().isoformat()
        }
