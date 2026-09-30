import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.core.hardware import detect_hardware
from app.models.db import init_db

# Import routers
from app.api.routes import health, projects, uploads, analysis, reconstruction, models, evaluation, measurements

setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Sparse3D database schema...")
    init_db()
    hw = detect_hardware()
    logger.info(
        f"Sparse3D System Ready | OS: {hw['platform']['system']} {hw['platform']['release']} | "
        f"GPU: {hw['gpu']['name']} (VRAM: {hw['gpu']['vram_total_gb']}GB) | "
        f"RAM: {hw['ram']['total_gb']}GB | Recommended Engine: {hw['recommended_engine']}"
    )
    yield
    logger.info("Sparse3D service shutting down...")

app = FastAPI(
    title="Sparse3D — AI Sparse-View 3D Reconstruction API",
    description="Scientific full-stack framework for multi-view geometry, AI reconstruction, and spatial uncertainty mapping.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static storage directory for image uploads and previews
app.mount("/storage", StaticFiles(directory=str(settings.STORAGE_DIR)), name="storage")

# Include API routers
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(projects.router, prefix=settings.API_V1_STR)
app.include_router(uploads.router, prefix=settings.API_V1_STR)
app.include_router(analysis.router, prefix=settings.API_V1_STR)
app.include_router(reconstruction.router, prefix=settings.API_V1_STR)
app.include_router(models.router, prefix=settings.API_V1_STR)
app.include_router(evaluation.router, prefix=settings.API_V1_STR)
app.include_router(measurements.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "service": "Sparse3D Reconstruction Platform",
        "status": "online",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.BACKEND_HOST, port=settings.BACKEND_PORT, reload=True)
