from fastapi import APIRouter
from app.schemas.common import ApiResponse
from app.core.hardware import detect_hardware

router = APIRouter(tags=["Health & System"])

@router.get("/health")
def health_check():
    return ApiResponse.ok({
        "status": "healthy",
        "service": "Sparse3D Reconstruction API",
        "version": "1.0.0"
    })

@router.get("/system/status")
def system_status():
    hw = detect_hardware()
    return ApiResponse.ok(hw)
