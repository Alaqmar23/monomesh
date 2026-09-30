import math
from typing import Dict, Any, Optional
import trimesh
from pathlib import Path
from app.schemas.measurement import Point3D

class MeasurementService:
    @staticmethod
    def calculate_distance(
        p_a: Point3D,
        p_b: Point3D,
        calibration_factor: Optional[float] = None,
        unit: str = "units"
    ) -> Dict[str, Any]:
        """
        Calculate 3D Euclidean distance between two selected vertices.
        """
        dx = p_b.x - p_a.x
        dy = p_b.y - p_a.y
        dz = p_b.z - p_a.z
        raw_dist = round(math.sqrt(dx * dx + dy * dy + dz * dz), 4)

        if calibration_factor is not None and calibration_factor > 0:
            calibrated_dist = round(raw_dist * calibration_factor, 2)
            status_message = f"Scale calibrated. Measured distance: {calibrated_dist} {unit}."
            is_calibrated = True
        else:
            calibrated_dist = None
            status_message = "Scale is not calibrated. Measurements are in relative model units."
            is_calibrated = False

        return {
            "raw_distance": raw_dist,
            "unit": unit if is_calibrated else "model units",
            "calibrated_distance": calibrated_dist,
            "is_calibrated": is_calibrated,
            "status_message": status_message
        }

    @staticmethod
    def calibrate_scale(
        model_path: str,
        p_a: Point3D,
        p_b: Point3D,
        known_distance: float,
        known_unit: str = "cm"
    ) -> Dict[str, Any]:
        """
        Calibrate model scale from a user-specified reference distance between two points.
        """
        dx = p_b.x - p_a.x
        dy = p_b.y - p_a.y
        dz = p_b.z - p_a.z
        raw_dist = math.sqrt(dx * dx + dy * dy + dz * dz)

        if raw_dist < 1e-6:
            raise ValueError("Selected calibration points are too close together to compute a reliable scale.")

        # Scale factor: units in known_unit per 1 model unit
        scale_factor = known_distance / raw_dist

        # Load mesh to compute calibrated bounding box
        mesh = trimesh.load(model_path, force="mesh")
        extents = mesh.extents  # [dx, dy, dz] in model units

        bbox_calibrated = {
            "width": round(float(extents[0] * scale_factor), 2),
            "height": round(float(extents[1] * scale_factor), 2),
            "depth": round(float(extents[2] * scale_factor), 2),
            "volume_est": round(float(extents[0] * extents[1] * extents[2] * (scale_factor ** 3)), 2)
        }

        return {
            "scale_factor": round(scale_factor, 6),
            "unit": known_unit,
            "is_calibrated": True,
            "bounding_box": bbox_calibrated,
            "status_message": f"Scale calibrated successfully ({round(scale_factor, 4)} {known_unit} per model unit)."
        }
