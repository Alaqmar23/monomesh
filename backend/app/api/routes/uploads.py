import uuid
import shutil
from pathlib import Path
from datetime import datetime
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.core.config import settings
from app.schemas.common import ApiResponse
from app.services.image_service import ImageService
from app.models.db import get_db_connection
from app.utils.file_utils import sanitize_filename, validate_image_extension, generate_unique_filename
from app.core.logging import logger

router = APIRouter(prefix="/images", tags=["Images & Uploads"])

@router.post("/upload")
async def upload_images(
    project_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    if len(files) < 1:
        return ApiResponse.fail("NO_FILES", "At least one image must be uploaded.")

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check project exists
    cursor.execute("SELECT id, image_count FROM projects WHERE id = ?;", (project_id,))
    proj = cursor.fetchone()
    if not proj:
        conn.close()
        return ApiResponse.fail("PROJECT_NOT_FOUND", f"Project {project_id} does not exist.")

    current_count = proj["image_count"]
    if current_count + len(files) > 10:
        conn.close()
        return ApiResponse.fail("EXCESS_IMAGES", "A sparse-view reconstruction project cannot exceed 10 images.")

    uploaded_results = []
    now = datetime.utcnow().isoformat()

    for file in files:
        if not validate_image_extension(file.filename):
            continue

        unique_id, saved_name = generate_unique_filename(file.filename)
        dest_path = settings.UPLOAD_DIR / saved_name

        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Run real OpenCV image quality analysis
        analysis = ImageService.analyze_image(str(dest_path))

        cursor.execute("""
            INSERT INTO project_images (
                id, project_id, filename, filepath, original_name,
                width, height, sharpness, blur_detected, feature_count,
                brightness, contrast, exposure, is_valid, validation_error, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            unique_id,
            project_id,
            saved_name,
            str(dest_path),
            file.filename,
            analysis.get("width"),
            analysis.get("height"),
            analysis.get("sharpness"),
            1 if analysis.get("blur_detected") else 0,
            analysis.get("feature_count"),
            analysis.get("brightness"),
            analysis.get("contrast"),
            analysis.get("exposure"),
            1 if analysis.get("is_valid") else 0,
            analysis.get("validation_error"),
            now
        ))

        uploaded_results.append({
            "id": unique_id,
            "project_id": project_id,
            "filename": saved_name,
            "original_name": file.filename,
            "url": f"/storage/uploads/{saved_name}",
            **analysis
        })

    # Update project image count and timestamp
    cursor.execute("SELECT COUNT(*) as cnt FROM project_images WHERE project_id = ?;", (project_id,))
    total_imgs = cursor.fetchone()["cnt"]
    cursor.execute("UPDATE projects SET image_count = ?, updated_at = ? WHERE id = ?;", (total_imgs, now, project_id))

    conn.commit()
    conn.close()

    return ApiResponse.ok({
        "uploaded_count": len(uploaded_results),
        "total_images": total_imgs,
        "images": uploaded_results
    })

@router.delete("/{image_id}")
def delete_image(image_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT filepath, project_id FROM project_images WHERE id = ?;", (image_id,))
    img = cursor.fetchone()
    if not img:
        conn.close()
        raise HTTPException(status_code=404, detail="Image not found")

    file_p = Path(img["filepath"])
    if file_p.exists():
        try:
            file_p.unlink()
        except Exception:
            pass

    proj_id = img["project_id"]
    cursor.execute("DELETE FROM project_images WHERE id = ?;", (image_id,))
    cursor.execute("SELECT COUNT(*) as cnt FROM project_images WHERE project_id = ?;", (proj_id,))
    remaining = cursor.fetchone()["cnt"]
    cursor.execute("UPDATE projects SET image_count = ?, updated_at = ? WHERE id = ?;", (remaining, datetime.utcnow().isoformat(), proj_id))

    conn.commit()
    conn.close()
    return ApiResponse.ok({"deleted": True, "image_id": image_id, "remaining_count": remaining})
