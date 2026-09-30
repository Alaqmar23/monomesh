import json
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.schemas.common import ApiResponse
from app.schemas.evaluation import EvaluationRequest
from app.services.evaluation_service import EvaluationService
from app.services.dataset_generator import DatasetGeneratorService
from app.models.db import get_db_connection
from app.core.config import settings

router = APIRouter(tags=["Evaluation & Experiments"])

@router.post("/evaluation")
def run_evaluation(data: EvaluationRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get reconstruction result
    if data.reconstruction_id:
        cursor.execute("SELECT * FROM reconstruction_results WHERE id = ?;", (data.reconstruction_id,))
    else:
        cursor.execute("SELECT * FROM reconstruction_results WHERE project_id = ? ORDER BY created_at DESC LIMIT 1;", (data.project_id,))

    rec = cursor.fetchone()
    if not rec:
        conn.close()
        return ApiResponse.fail("NO_RECONSTRUCTION", "No reconstruction found to evaluate.")

    # Get project image count
    cursor.execute("SELECT image_count FROM projects WHERE id = ?;", (data.project_id,))
    proj = cursor.fetchone()
    view_count = proj["image_count"] if proj else 3

    # Check for ground truth file if specified
    gt_path = None
    if data.ground_truth_filename:
        gt_path = str(settings.MODEL_DIR / data.project_id / data.ground_truth_filename)

    eval_result = EvaluationService.evaluate_model(
        reconstructed_mesh_path=rec["model_path_glb"],
        ground_truth_path=gt_path,
        runtime_sec=rec["processing_time_sec"] or 0.0,
        peak_vram_mb=rec["memory_peak_mb"] or 0.0,
        view_count=view_count
    )

    eval_id = f"eval_{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO evaluations (
            id, project_id, reconstruction_id, ground_truth_path,
            chamfer_distance, hausdorff_distance, point_to_point_error,
            metrics_json, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        eval_id,
        data.project_id,
        rec["id"],
        gt_path,
        eval_result["metrics"]["chamfer_distance"]["value"],
        eval_result["metrics"]["hausdorff_distance"]["value"],
        eval_result["metrics"]["point_to_point_error"]["value"],
        json.dumps(eval_result["metrics"]),
        json.dumps(eval_result["notes"]),
        now
    ))
    conn.commit()
    conn.close()

    eval_result["id"] = eval_id
    eval_result["project_id"] = data.project_id
    eval_result["reconstruction_id"] = rec["id"]

    return ApiResponse.ok(eval_result)

@router.get("/evaluation/{project_id}")
def get_latest_evaluation(project_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM evaluations WHERE project_id = ? ORDER BY created_at DESC LIMIT 1;", (project_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return ApiResponse.ok(None)

    metrics = json.loads(row["metrics_json"]) if row["metrics_json"] else {}
    notes = json.loads(row["notes"]) if row["notes"] else []

    return ApiResponse.ok({
        "id": row["id"],
        "project_id": row["project_id"],
        "reconstruction_id": row["reconstruction_id"],
        "ground_truth_present": bool(row["ground_truth_path"]),
        "metrics": metrics,
        "notes": notes,
        "created_at": row["created_at"]
    })

@router.post("/experiments/run")
def run_scaling_experiment(dataset_name: str = Form("Standard Multi-View Benchmark")):
    exp = DatasetGeneratorService.run_view_count_experiment(dataset_name)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO experiments (id, name, description, dataset_name, view_counts_json, results_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    """, (
        exp["id"],
        exp["name"],
        exp["description"],
        exp["dataset_name"],
        json.dumps(exp["view_counts"]),
        json.dumps(exp["results"]),
        exp["created_at"]
    ))
    conn.commit()
    conn.close()

    return ApiResponse.ok(exp)

@router.get("/experiments")
def list_experiments():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM experiments ORDER BY created_at DESC;")
    rows = cursor.fetchall()
    conn.close()

    res = []
    for r in rows:
        res.append({
            "id": r["id"],
            "name": r["name"],
            "description": r["description"],
            "dataset_name": r["dataset_name"],
            "view_counts": json.loads(r["view_counts_json"]),
            "results": json.loads(r["results_json"]),
            "created_at": r["created_at"]
        })

    # If database has no experiments yet, run an initial default benchmark
    if not res:
        initial_exp = DatasetGeneratorService.run_view_count_experiment("Controlled Geometric Benchmark")
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO experiments (id, name, description, dataset_name, view_counts_json, results_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            initial_exp["id"],
            initial_exp["name"],
            initial_exp["description"],
            initial_exp["dataset_name"],
            json.dumps(initial_exp["view_counts"]),
            json.dumps(initial_exp["results"]),
            initial_exp["created_at"]
        ))
        conn.commit()
        conn.close()
        res.append(initial_exp)

    return ApiResponse.ok(res)
