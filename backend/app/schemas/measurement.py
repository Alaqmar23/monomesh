from typing import Optional, List, Dict
from pydantic import BaseModel

class Point3D(BaseModel):
    x: float
    y: float
    z: float

class MeasureDistanceRequest(BaseModel):
    project_id: str
    reconstruction_id: Optional[str] = None
    point_a: Point3D
    point_b: Point3D
    calibration_factor: Optional[float] = None  # cm per model unit
    unit: str = "units"

class DistanceMeasurementResponse(BaseModel):
    raw_distance: float
    unit: str
    calibrated_distance: Optional[float] = None
    is_calibrated: bool
    status_message: str

class CalibrateScaleRequest(BaseModel):
    project_id: str
    reconstruction_id: Optional[str] = None
    point_a: Point3D
    point_b: Point3D
    known_distance: float  # e.g., 10.0
    known_unit: str = "cm"  # "cm", "mm", "m", "inches"

class CalibrationResponse(BaseModel):
    scale_factor: float  # units per cm or cm per unit
    unit: str
    is_calibrated: bool
    bounding_box: Dict[str, float]  # width, height, depth in calibrated unit
    status_message: str
