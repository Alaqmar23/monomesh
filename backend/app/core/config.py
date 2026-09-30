import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env if present
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"

class Settings(BaseModel):
    PROJECT_NAME: str = "Sparse3D"
    API_V1_STR: str = "/api"
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    
    # Storage paths
    STORAGE_DIR: Path = STORAGE_DIR
    UPLOAD_DIR: Path = STORAGE_DIR / "uploads"
    PROJECT_DIR: Path = STORAGE_DIR / "projects"
    MODEL_DIR: Path = STORAGE_DIR / "models"
    RECONSTRUCTION_DIR: Path = STORAGE_DIR / "reconstructions"
    EXPERIMENT_DIR: Path = STORAGE_DIR / "experiments"
    TEMP_DIR: Path = STORAGE_DIR / "temp"

    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{STORAGE_DIR / 'sparse3d.db'}")

    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "100"))
    ALLOWED_IMAGE_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp"}
    ALLOWED_MODEL_EXTENSIONS: set = {".glb", ".gltf", ".obj", ".ply"}

    # Hardware & Model flags
    DEVICE: str = os.getenv("DEVICE", "auto")
    RECONSTRUCTION_ENGINE: str = os.getenv("RECONSTRUCTION_ENGINE", "auto")
    ENABLE_VGGT: bool = os.getenv("ENABLE_VGGT", "true").lower() in ("true", "1", "yes")
    ENABLE_HUNYUAN: bool = os.getenv("ENABLE_HUNYUAN", "false").lower() in ("true", "1", "yes")
    ENABLE_TRELLIS: bool = os.getenv("ENABLE_TRELLIS", "false").lower() in ("true", "1", "yes")

settings = Settings()

# Ensure directories exist
for path in [
    settings.STORAGE_DIR,
    settings.UPLOAD_DIR,
    settings.PROJECT_DIR,
    settings.MODEL_DIR,
    settings.RECONSTRUCTION_DIR,
    settings.EXPERIMENT_DIR,
    settings.TEMP_DIR,
]:
    path.mkdir(parents=True, exist_ok=True)
