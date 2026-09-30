from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class ReconstructionRequest(BaseModel):
    project_id: str
    engine: str = "auto"  # "auto", "classical", "vggt"
    quality: str = "balanced"  # "fast", "balanced", "high"
    output_format: str = "glb"  # "glb", "ply", "obj"
    refinement: str = "auto"  # "disabled", "auto", "ai_refinement"

class ReconstructionJobStatus(BaseModel):
    id: str
    project_id: str
    engine: str
    quality: str
    output_format: str
    refinement: str
    status: str
    progress: int
    current_step: str
    logs: List[str]
    error_message: Optional[str] = None
    started_at: str
    completed_at: Optional[str] = None

class SpatialConfidenceSummary(BaseModel):
    high_percentage: float
    medium_percentage: float
    low_percentage: float
    unknown_percentage: float
    region_ratings: Dict[str, str]  # e.g., {"Front": "High", "Left": "High", "Rear": "Low"}
    vertex_confidence_map_available: bool

class ReconstructionResultResponse(BaseModel):
    id: str
    job_id: str
    project_id: str
    engine_used: str
    refinement_used: str
    model_urls: Dict[str, str]  # glb, ply, obj
    vertex_count: int
    face_count: int
    point_count: int
    geometry_confidence: float  # Percentage 0-100 (Heuristic / Evidence-based)
    visual_quality: float  # Percentage 0-100 (Sharpness & Completeness)
    processing_time_sec: float
    memory_peak_mb: float
    spatial_confidence: SpatialConfidenceSummary
    created_at: str
