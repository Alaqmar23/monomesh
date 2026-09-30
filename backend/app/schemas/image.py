from typing import Optional, List
from pydantic import BaseModel

class ImageAnalysisResult(BaseModel):
    id: str
    project_id: str
    filename: str
    original_name: str
    url: str
    width: int
    height: int
    sharpness: float
    blur_detected: bool
    feature_count: int
    feature_density: str
    brightness: float
    contrast: float
    exposure: str
    is_valid: bool
    validation_error: Optional[str] = None
    created_at: str

class ImageQualitySummary(BaseModel):
    total_images: int
    valid_images: int
    average_sharpness: float
    average_features: int
    warnings: List[str]
    images: List[ImageAnalysisResult]
