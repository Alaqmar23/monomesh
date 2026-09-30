import os
import sys
import shutil
import uuid
from datetime import datetime
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.core.config import settings
from app.models.db import init_db, get_db_connection
from app.services.image_service import ImageService
from app.services.view_analysis import ViewAnalysisService
from app.services.view_recommendation import ViewRecommendationService
from app.reconstruction.manager import ReconstructionManager

def seed_demo():
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if demo project already exists
    cursor.execute("SELECT id FROM projects WHERE id = 'demo_artifact_01';")
    if cursor.fetchone():
        print("Demo project already exists in database.")
        conn.close()
        return

    proj_id = "demo_artifact_01"
    now = datetime.utcnow().isoformat()
    cursor.execute("""
        INSERT INTO projects (id, name, description, created_at, updated_at, image_count, status)
        VALUES (?, ?, ?, ?, ?, 3, 'completed');
    """, (
        proj_id,
        "Controlled Geometric Artifact (3-View Benchmark)",
        "3-view sparse baseline reconstruction evaluated on NVIDIA RTX 3050 Laptop GPU (4GB VRAM).",
        now,
        now
    ))

    # Copy sample images to uploads
    sample_dir = settings.STORAGE_DIR / "sample_data"
    sample_files = ["view_01_front.jpg", "view_02_right.jpg", "view_03_rear_right.jpg"]
    copied_paths = []

    for idx, fname in enumerate(sample_files):
        src = sample_dir / fname
        dest = settings.UPLOAD_DIR / f"demo_{fname}"
        shutil.copy(src, dest)
        copied_paths.append(str(dest))

        analysis = ImageService.analyze_image(str(dest))
        img_id = f"img_demo_{idx + 1}"
        cursor.execute("""
            INSERT INTO project_images (
                id, project_id, filename, filepath, original_name,
                width, height, sharpness, blur_detected, feature_count,
                brightness, contrast, exposure, is_valid, validation_error, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            img_id,
            proj_id,
            f"demo_{fname}",
            str(dest),
            fname,
            analysis.get("width"),
            analysis.get("height"),
            analysis.get("sharpness"),
            0,
            analysis.get("feature_count"),
            analysis.get("brightness"),
            analysis.get("contrast"),
            analysis.get("exposure"),
            1,
            None,
            now
        ))

    # Multi-view coverage & recommendation
    v_analysis = ViewAnalysisService.analyze_views(copied_paths, sample_files)
    v_rec = ViewRecommendationService.recommend_next_viewpoint(v_analysis)

    import json
    cursor.execute("""
        INSERT INTO view_analyses (
            id, project_id, view_coverage, image_overlap, camera_confidence,
            feature_density, reconstruction_risk, details_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        "va_demo_01",
        proj_id,
        v_analysis["view_coverage"],
        v_analysis["image_overlap"],
        v_analysis["camera_confidence"],
        v_analysis["feature_density"],
        v_analysis["reconstruction_risk"],
        json.dumps(v_analysis),
        now
    ))

    cursor.execute("""
        INSERT INTO view_recommendations (
            id, project_id, recommended_angle_deg, missing_quadrant, guidance_text,
            expected_coverage_gain, method, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        "vr_demo_01",
        proj_id,
        v_rec["recommended_azimuth_deg"],
        v_rec["missing_region"],
        v_rec["guidance_text"],
        v_rec["expected_coverage_improvement"],
        v_rec["method"],
        now
    ))

    # Run reconstruction for demo
    rm = ReconstructionManager()
    rec_result = rm.execute_reconstruction(
        job_id="job_demo_01",
        project_id=proj_id,
        image_paths=copied_paths,
        config={"engine": "auto", "quality": "balanced", "refinement": "auto"}
    )

    conf_summary = rec_result["confidence"]
    cursor.execute("""
        INSERT INTO reconstruction_jobs (
            id, project_id, engine, quality, output_format, refinement,
            status, progress, current_step, logs_json, started_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', 100, 'COMPLETED', ?, ?, ?);
    """, (
        "job_demo_01",
        proj_id,
        rec_result["engine_used"],
        "balanced",
        "glb",
        "auto",
        json.dumps(["Demo baseline reconstruction compiled."]),
        now,
        now
    ))

    cursor.execute("""
        INSERT INTO reconstruction_results (
            id, job_id, project_id, model_path_glb, model_path_ply, model_path_obj,
            vertex_count, face_count, point_count, geometry_confidence, visual_quality,
            processing_time_sec, memory_peak_mb, confidence_data_json, calibration_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        "rec_demo_01",
        "job_demo_01",
        proj_id,
        rec_result["glb_path"],
        rec_result["ply_path"],
        rec_result["obj_path"],
        rec_result["vertex_count"],
        rec_result["face_count"],
        rec_result["point_count"],
        conf_summary["geometry_confidence"],
        conf_summary["visual_quality"],
        rec_result["processing_time"],
        rec_result["peak_memory_mb"],
        json.dumps({
            "high_pct": conf_summary["high_pct"],
            "medium_pct": conf_summary["medium_pct"],
            "low_pct": conf_summary["low_pct"],
            "unknown_pct": conf_summary["unknown_pct"],
            "region_ratings": conf_summary["region_ratings"],
            "uncertain_regions": conf_summary["uncertain_regions"],
            "engine_used": rec_result["engine_used"],
            "refinement_status": rec_result["refinement_status"],
            "refinement_details": rec_result["refinement_details"]
        }),
        json.dumps({"is_calibrated": False}),
        now
    ))

    conn.commit()
    conn.close()
    print("Demo project successfully seeded in database.")

if __name__ == "__main__":
    seed_demo()
