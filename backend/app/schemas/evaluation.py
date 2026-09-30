from typing import Optional, Dict, Any, List
from pydantic import BaseModel

class EvaluationRequest(BaseModel):
    project_id: str
    reconstruction_id: Optional[str] = None
    ground_truth_filename: Optional[str] = None

class MetricValue(BaseModel):
    name: str
    value: Optional[float]
    unit: str
    available: bool
    status_label: str  # "Measured", "Not Available (Ground Truth Required)", "Estimated"
    description: str

class EvaluationResponse(BaseModel):
    id: str
    project_id: str
    reconstruction_id: str
    ground_truth_present: bool
    ground_truth_name: Optional[str] = None
    metrics: Dict[str, MetricValue]
    view_count: int
    processing_time_sec: float
    peak_vram_mb: float
    output_mesh_faces: int
    output_mesh_vertices: int
    notes: List[str]
    created_at: str

class ExperimentResult(BaseModel):
    id: str
    name: str
    description: str
    dataset_name: str
    view_counts: List[int]
    results: List[Dict[str, Any]]
    created_at: str
