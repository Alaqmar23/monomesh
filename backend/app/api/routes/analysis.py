import json
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Body
from app.schemas.common import ApiResponse
from app.services.image_service import ImageService
from app.services.view_analysis import ViewAnalysisService
from app.services.view_recommendation import ViewRecommendationService
from app.models.db import get_db_connection

router = APIRouter(tags=["Analysis"])

@router.post("/images/analyze")
def analyze_project_images(payload: dict = Body(...)):
    project_id = payload.get("project_id")
    if not project_id:
        return ApiResponse.fail("MISSING_PROJECT_ID", "project_id is required.")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM project_images WHERE project_id = ? ORDER BY created_at ASC;", (project_id,))
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return ApiResponse.fail("NO_IMAGES", "No images uploaded for this project yet.")

    analyses = []
    for r in rows:
        analyses.append({
            "id": r["id"],
            "filename": r["filename"],
            "original_name": r["original_name"],
            "url": f"/storage/uploads/{r['filename']}",
            "width": r["width"],
            "height": r["height"],
            "sharpness": r["sharpness"],
            "blur_detected": bool(r["blur_detected"]),
            "feature_count": r["feature_count"],
            "brightness": r["brightness"],
            "contrast": r["contrast"],
            "exposure": r["exposure"],
            "feature_density": "High" if (r["feature_count"] or 0) > 1500 else ("Medium" if (r["feature_count"] or 0) > 600 else "Low"),
            "is_valid": bool(r["is_valid"]),
            "validation_error": r["validation_error"],
            "created_at": r["created_at"]
        })

    summary = ImageService.generate_quality_summary(analyses)
    summary["images"] = analyses
    return ApiResponse.ok(summary)

@router.post("/views/analyze")
def analyze_view_coverage(payload: dict = Body(...)):
    project_id = payload.get("project_id")
    if not project_id:
        return ApiResponse.fail("MISSING_PROJECT_ID", "project_id is required.")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT filepath, original_name FROM project_images WHERE project_id = ? ORDER BY created_at ASC;", (project_id,))
    rows = cursor.fetchall()

    if len(rows) < 2:
        conn.close()
        return ApiResponse.fail("INSUFFICIENT_VIEWS", "Sparse-view analysis requires at least 2 viewpoints.")

    image_paths = [r["filepath"] for r in rows]
    image_names = [r["original_name"] for r in rows]

    analysis = ViewAnalysisService.analyze_views(image_paths, image_names)
    analysis["project_id"] = project_id
    analysis["created_at"] = datetime.utcnow().isoformat()

    # Save to database
    analysis_id = f"va_{uuid.uuid4().hex[:8]}"
    cursor.execute("""
        INSERT INTO view_analyses (
            id, project_id, view_coverage, image_overlap, camera_confidence,
            feature_density, reconstruction_risk, details_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        analysis_id,
        project_id,
        analysis["view_coverage"],
        analysis["image_overlap"],
        analysis["camera_confidence"],
        analysis["feature_density"],
        analysis["reconstruction_risk"],
        json.dumps(analysis),
        analysis["created_at"]
    ))
    conn.commit()
    conn.close()

    return ApiResponse.ok(analysis)

@router.post("/views/recommend")
def recommend_viewpoint(payload: dict = Body(...)):
    project_id = payload.get("project_id")
    if not project_id:
        return ApiResponse.fail("MISSING_PROJECT_ID", "project_id is required.")

    conn = get_db_connection()
    cursor = conn.cursor()
    # Get latest view analysis
    cursor.execute("SELECT details_json FROM view_analyses WHERE project_id = ? ORDER BY created_at DESC LIMIT 1;", (project_id,))
    va_row = cursor.fetchone()

    if not va_row:
        # If no view analysis exists yet, run it
        cursor.execute("SELECT filepath, original_name FROM project_images WHERE project_id = ? ORDER BY created_at ASC;", (project_id,))
        rows = cursor.fetchall()
        if len(rows) < 2:
            conn.close()
            return ApiResponse.fail("INSUFFICIENT_VIEWS", "At least 2 viewpoints are required to compute view recommendations.")
        view_analysis = ViewAnalysisService.analyze_views([r["filepath"] for r in rows], [r["original_name"] for r in rows])
    else:
        view_analysis = json.loads(va_row["details_json"])

    rec = ViewRecommendationService.recommend_next_viewpoint(view_analysis)
    rec["project_id"] = project_id

    rec_id = f"vr_{uuid.uuid4().hex[:8]}"
    cursor.execute("""
        INSERT INTO view_recommendations (
            id, project_id, recommended_angle_deg, missing_quadrant, guidance_text,
            expected_coverage_gain, method, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        rec_id,
        project_id,
        rec["recommended_azimuth_deg"],
        rec["missing_region"],
        rec["guidance_text"],
        rec["expected_coverage_improvement"],
        rec["method"],
        rec["created_at"]
    ))
    conn.commit()
    conn.close()

    return ApiResponse.ok(rec)
