from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class CameraPoseEstimate(BaseModel):
    image_id: str
    image_name: str
    azimuth_deg: float
    elevation_deg: float
    distance: float
    relative_rotation: List[List[float]]
    relative_translation: List[float]

class ViewCoverageResult(BaseModel):
    project_id: str
    view_coverage: float  # Percentage 0-100
    image_overlap: float  # Percentage 0-100
    camera_confidence: float  # Percentage 0-100
    feature_density: str  # "High", "Medium", "Low"
    reconstruction_risk: str  # "Low", "Medium", "High"
    angular_spread_deg: float
    covered_sectors: List[str]
    uncovered_sectors: List[str]
    estimated_cameras: List[CameraPoseEstimate]
    created_at: str

class ViewRecommendationResult(BaseModel):
    project_id: str
    missing_region: str
    recommended_azimuth_deg: float
    recommended_elevation_deg: float
    guidance_text: str
    expected_coverage_improvement: float  # Percentage gain
    method: str
    candidate_angles: List[Dict[str, Any]]
    created_at: str
