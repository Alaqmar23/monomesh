import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from app.schemas.common import ApiResponse
from app.schemas.project import ProjectCreate, ProjectSummary
from app.models.db import get_db_connection
from app.core.logging import logger

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("")
def list_projects():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT p.*,
               r.id as latest_rec_id,
               r.geometry_confidence as latest_confidence,
               r.model_path_glb as latest_glb
        FROM projects p
        LEFT JOIN (
            SELECT project_id, id, geometry_confidence, model_path_glb,
                   ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at DESC) as rn
            FROM reconstruction_results
        ) r ON p.id = r.project_id AND r.rn = 1
        ORDER BY p.updated_at DESC;
    """)
    rows = cursor.fetchall()
    projects = []
    for r in rows:
        glb_url = f"/api/models/{r['latest_rec_id']}/download?format=glb" if r['latest_rec_id'] else None
        projects.append({
            "id": r["id"],
            "name": r["name"],
            "description": r["description"] or "",
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
            "image_count": r["image_count"],
            "status": r["status"],
            "latest_confidence": r["latest_confidence"],
            "latest_reconstruction_id": r["latest_rec_id"],
            "latest_model_glb": glb_url
        })
    conn.close()
    return ApiResponse.ok(projects)

@router.post("")
def create_project(data: ProjectCreate):
    proj_id = f"proj_{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO projects (id, name, description, created_at, updated_at, image_count, status)
        VALUES (?, ?, ?, ?, ?, 0, 'created');
    """, (proj_id, data.name, data.description or "", now, now))
    conn.commit()
    conn.close()

    return ApiResponse.ok({
        "id": proj_id,
        "name": data.name,
        "description": data.description or "",
        "created_at": now,
        "updated_at": now,
        "image_count": 0,
        "status": "created"
    })

@router.get("/{project_id}")
def get_project(project_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM projects WHERE id = ?;", (project_id,))
    proj = cursor.fetchone()
    if not proj:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch images
    cursor.execute("SELECT * FROM project_images WHERE project_id = ? ORDER BY created_at ASC;", (project_id,))
    img_rows = cursor.fetchall()
    images = []
    for img in img_rows:
        images.append({
            "id": img["id"],
            "project_id": img["project_id"],
            "filename": img["filename"],
            "original_name": img["original_name"],
            "url": f"/storage/uploads/{img['filename']}",
            "width": img["width"],
            "height": img["height"],
            "sharpness": img["sharpness"],
            "blur_detected": bool(img["blur_detected"]),
            "feature_count": img["feature_count"],
            "brightness": img["brightness"],
            "contrast": img["contrast"],
            "exposure": img["exposure"],
            "is_valid": bool(img["is_valid"]),
            "validation_error": img["validation_error"],
            "created_at": img["created_at"]
        })

    # Fetch latest view analysis
    cursor.execute("SELECT * FROM view_analyses WHERE project_id = ? ORDER BY created_at DESC LIMIT 1;", (project_id,))
    va_row = cursor.fetchone()
    view_analysis = dict(va_row) if va_row else None

    # Fetch latest view recommendation
    cursor.execute("SELECT * FROM view_recommendations WHERE project_id = ? ORDER BY created_at DESC LIMIT 1;", (project_id,))
    vr_row = cursor.fetchone()
    view_recommendation = dict(vr_row) if vr_row else None

    # Fetch latest reconstruction result
    cursor.execute("SELECT * FROM reconstruction_results WHERE project_id = ? ORDER BY created_at DESC LIMIT 1;", (project_id,))
    rr_row = cursor.fetchone()
    reconstruction = None
    if rr_row:
        rec_id = rr_row["id"]
        reconstruction = {
            "id": rec_id,
            "job_id": rr_row["job_id"],
            "project_id": rr_row["project_id"],
            "model_urls": {
                "glb": f"/api/models/{rec_id}/download?format=glb",
                "ply": f"/api/models/{rec_id}/download?format=ply",
                "obj": f"/api/models/{rec_id}/download?format=obj",
                "confidence_glb": f"/api/models/{rec_id}/download?format=confidence_glb"
            },
            "vertex_count": rr_row["vertex_count"],
            "face_count": rr_row["face_count"],
            "point_count": rr_row["point_count"],
            "geometry_confidence": rr_row["geometry_confidence"],
            "visual_quality": rr_row["visual_quality"],
            "processing_time_sec": rr_row["processing_time_sec"],
            "memory_peak_mb": rr_row["memory_peak_mb"],
            "created_at": rr_row["created_at"]
        }

    conn.close()

    return ApiResponse.ok({
        "project": dict(proj),
        "images": images,
        "view_analysis": view_analysis,
        "view_recommendation": view_recommendation,
        "latest_reconstruction": reconstruction
    })

@router.delete("/{project_id}")
def delete_project(project_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM projects WHERE id = ?;", (project_id,))
    conn.commit()
    conn.close()
    return ApiResponse.ok({"deleted": True, "project_id": project_id})
