from fastapi import APIRouter, HTTPException
from app.schemas.common import ApiResponse
from app.schemas.measurement import MeasureDistanceRequest, CalibrateScaleRequest
from app.services.measurement_service import MeasurementService
from app.models.db import get_db_connection

router = APIRouter(prefix="/measurements", tags=["Measurements"])

@router.post("")
def measure_distance(data: MeasureDistanceRequest):
    result = MeasurementService.calculate_distance(
        p_a=data.point_a,
        p_b=data.point_b,
        calibration_factor=data.calibration_factor,
        unit=data.unit
    )
    return ApiResponse.ok(result)

@router.post("/calibrate")
def calibrate_scale(data: CalibrateScaleRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    if data.reconstruction_id:
        cursor.execute("SELECT model_path_glb FROM reconstruction_results WHERE id = ?;", (data.reconstruction_id,))
    else:
        cursor.execute("SELECT model_path_glb FROM reconstruction_results WHERE project_id = ? ORDER BY created_at DESC LIMIT 1;", (data.project_id,))

    rec = cursor.fetchone()
    conn.close()

    if not rec:
        return ApiResponse.fail("MODEL_NOT_FOUND", "Reconstructed 3D model not found for calibration.")

    try:
        calib = MeasurementService.calibrate_scale(
            model_path=rec["model_path_glb"],
            p_a=data.point_a,
            p_b=data.point_b,
            known_distance=data.known_distance,
            known_unit=data.known_unit
        )
        return ApiResponse.ok(calib)
    except Exception as e:
        return ApiResponse.fail("CALIBRATION_FAILED", str(e))
