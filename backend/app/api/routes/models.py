from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from app.schemas.common import ApiResponse
from app.models.db import get_db_connection

router = APIRouter(prefix="/models", tags=["3D Models"])

@router.get("/{rec_id}")
def get_model_info(rec_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reconstruction_results WHERE id = ?;", (rec_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Model record not found.")

    return ApiResponse.ok(dict(row))

@router.get("/{rec_id}/download")
def download_model(rec_id: str, format: str = Query("glb")):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reconstruction_results WHERE id = ?;", (rec_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Model record not found.")

    format_lower = format.lower()
    if format_lower == "glb":
        file_path = row["model_path_glb"]
        media_type = "model/gltf-binary"
        filename = f"sparse3d_{rec_id}.glb"
    elif format_lower == "confidence_glb":
        file_path = row["model_path_glb"].replace(".glb", "_confidence.glb")
        media_type = "model/gltf-binary"
        filename = f"sparse3d_{rec_id}_confidence.glb"
    elif format_lower == "ply":
        file_path = row["model_path_ply"]
        media_type = "application/octet-stream"
        filename = f"sparse3d_{rec_id}.ply"
    elif format_lower == "obj":
        file_path = row["model_path_obj"]
        media_type = "text/plain"
        filename = f"sparse3d_{rec_id}.obj"
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format '{format}'. Supported: glb, ply, obj, confidence_glb.")

    p = Path(file_path)
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"Model file {filename} not found on disk.")

    return FileResponse(
        path=str(p),
        media_type=media_type,
        filename=filename
    )
