import json
import uuid
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.schemas.common import ApiResponse
from app.schemas.reconstruction import ReconstructionRequest
from app.reconstruction.manager import ReconstructionManager
from app.models.db import get_db_connection
from app.core.logging import logger

router = APIRouter(prefix="/reconstruction", tags=["Reconstruction"])

rec_manager = ReconstructionManager()

def run_reconstruction_worker(
    job_id: str,
    project_id: str,
    image_paths: List[str],
    config: Dict[str, Any]
):
    """
    Background worker that executes the actual 3D reconstruction pipeline.
    Updates database with real progress callbacks.
    """
    logs = [f"Reconstruction job {job_id} initiated at {datetime.utcnow().isoformat()}."]

    def update_progress(step: str, pct: int):
        conn = get_db_connection()
        cursor = conn.cursor()
        logs.append(f"Step {step} - {pct}% complete.")
        cursor.execute("""
            UPDATE reconstruction_jobs
            SET progress = ?, current_step = ?, logs_json = ?
            WHERE id = ?;
        """, (pct, step, json.dumps(logs), job_id))
        conn.commit()
        conn.close()

    try:
        update_progress("VALIDATING", 10)
        result = rec_manager.execute_reconstruction(
            job_id=job_id,
            project_id=project_id,
            image_paths=image_paths,
            config=config,
            progress_callback=update_progress
        )

        # Save result into reconstruction_results
        rec_res_id = f"res_{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat()
        conf_summary = result["confidence"]

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO reconstruction_results (
                id, job_id, project_id, model_path_glb, model_path_ply, model_path_obj,
                vertex_count, face_count, point_count, geometry_confidence, visual_quality,
                processing_time_sec, memory_peak_mb, confidence_data_json, calibration_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            rec_res_id,
            job_id,
            project_id,
            result["glb_path"],
            result["ply_path"],
            result["obj_path"],
            result["vertex_count"],
            result["face_count"],
            result["point_count"],
            conf_summary["geometry_confidence"],
            conf_summary["visual_quality"],
            result["processing_time"],
            result["peak_memory_mb"],
            json.dumps({
                "high_pct": conf_summary["high_pct"],
                "medium_pct": conf_summary["medium_pct"],
                "low_pct": conf_summary["low_pct"],
                "unknown_pct": conf_summary["unknown_pct"],
                "region_ratings": conf_summary["region_ratings"],
                "uncertain_regions": conf_summary["uncertain_regions"],
                "engine_used": result["engine_used"],
                "refinement_status": result["refinement_status"],
                "refinement_details": result["refinement_details"]
            }),
            json.dumps({"is_calibrated": False}),
            now
        ))

        # Mark job as COMPLETED
        cursor.execute("""
            UPDATE reconstruction_jobs
            SET status = 'COMPLETED', progress = 100, current_step = 'COMPLETED', completed_at = ?
            WHERE id = ?;
        """, (now, job_id))

        # Update project status
        cursor.execute("UPDATE projects SET status = 'completed', updated_at = ? WHERE id = ?;", (now, project_id))
        conn.commit()
        conn.close()

        logger.info(f"Reconstruction job {job_id} successfully finished.")

    except Exception as e:
        logger.error(f"Reconstruction job {job_id} failed: {e}", exc_info=True)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE reconstruction_jobs
            SET status = 'FAILED', current_step = 'FAILED', error_message = ?, completed_at = ?
            WHERE id = ?;
        """, (str(e), datetime.utcnow().isoformat(), job_id))
        cursor.execute("UPDATE projects SET status = 'failed', updated_at = ? WHERE id = ?;", (datetime.utcnow().isoformat(), project_id))
        conn.commit()
        conn.close()


@router.post("")
def start_reconstruction(data: ReconstructionRequest, background_tasks: BackgroundTasks):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT filepath FROM project_images WHERE project_id = ? ORDER BY created_at ASC;", (data.project_id,))
    rows = cursor.fetchall()

    if len(rows) < 2:
        conn.close()
        return ApiResponse.fail("INSUFFICIENT_VIEWS", "Sparse-view 3D reconstruction requires at least 2 viewpoints.")

    image_paths = [r["filepath"] for r in rows]
    job_id = f"job_{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow().isoformat()

    # Record job
    cursor.execute("""
        INSERT INTO reconstruction_jobs (
            id, project_id, engine, quality, output_format, refinement,
            status, progress, current_step, logs_json, started_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'QUEUED', 0, 'QUEUED', ?, ?);
    """, (
        job_id,
        data.project_id,
        data.engine,
        data.quality,
        data.output_format,
        data.refinement,
        json.dumps([f"Job {job_id} queued"]),
        now
    ))
    cursor.execute("UPDATE projects SET status = 'reconstructing', updated_at = ? WHERE id = ?;", (now, data.project_id))
    conn.commit()
    conn.close()

    # Launch background task
    background_tasks.add_task(
        run_reconstruction_worker,
        job_id=job_id,
        project_id=data.project_id,
        image_paths=image_paths,
        config=data.dict()
    )

    return ApiResponse.ok({
        "job_id": job_id,
        "project_id": data.project_id,
        "status": "QUEUED",
        "progress": 0,
        "current_step": "QUEUED",
        "started_at": now
    })


@router.get("/{job_id}/status")
def get_reconstruction_status(job_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reconstruction_jobs WHERE id = ?;", (job_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Reconstruction job not found.")

    logs = json.loads(row["logs_json"]) if row["logs_json"] else []

    return ApiResponse.ok({
        "id": row["id"],
        "project_id": row["project_id"],
        "engine": row["engine"],
        "quality": row["quality"],
        "output_format": row["output_format"],
        "refinement": row["refinement"],
        "status": row["status"],
        "progress": row["progress"],
        "current_step": row["current_step"],
        "logs": logs,
        "error_message": row["error_message"],
        "started_at": row["started_at"],
        "completed_at": row["completed_at"]
    })


@router.get("/{job_id}/result")
def get_reconstruction_result(job_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reconstruction_results WHERE job_id = ?;", (job_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Reconstruction result not yet available or job failed.")

    rec_id = row["id"]
    conf_data = json.loads(row["confidence_data_json"]) if row["confidence_data_json"] else {}

    return ApiResponse.ok({
        "id": rec_id,
        "job_id": row["job_id"],
        "project_id": row["project_id"],
        "engine_used": conf_data.get("engine_used", "Unknown"),
        "refinement_status": conf_data.get("refinement_status", "None"),
        "refinement_details": conf_data.get("refinement_details", ""),
        "model_urls": {
            "glb": f"/api/models/{rec_id}/download?format=glb",
            "ply": f"/api/models/{rec_id}/download?format=ply",
            "obj": f"/api/models/{rec_id}/download?format=obj",
            "confidence_glb": f"/api/models/{rec_id}/download?format=confidence_glb"
        },
        "vertex_count": row["vertex_count"],
        "face_count": row["face_count"],
        "point_count": row["point_count"],
        "geometry_confidence": row["geometry_confidence"],
        "visual_quality": row["visual_quality"],
        "processing_time_sec": row["processing_time_sec"],
        "memory_peak_mb": row["memory_peak_mb"],
        "spatial_confidence": {
            "high_percentage": conf_data.get("high_pct", 0.0),
            "medium_percentage": conf_data.get("medium_pct", 0.0),
            "low_percentage": conf_data.get("low_pct", 0.0),
            "unknown_percentage": conf_data.get("unknown_pct", 0.0),
            "region_ratings": conf_data.get("region_ratings", {}),
            "uncertain_regions": conf_data.get("uncertain_regions", []),
            "vertex_confidence_map_available": True
        },
        "created_at": row["created_at"]
    })
