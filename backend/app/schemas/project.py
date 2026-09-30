from typing import Optional, List
from pydantic import BaseModel

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class ProjectSummary(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    created_at: str
    updated_at: str
    image_count: int
    status: str
    latest_confidence: Optional[float] = None
    latest_reconstruction_id: Optional[str] = None
    latest_model_glb: Optional[str] = None
