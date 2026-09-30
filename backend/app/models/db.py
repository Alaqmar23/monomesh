import sqlite3
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.core.config import settings
from app.core.logging import logger

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(settings.STORAGE_DIR / "sparse3d.db"))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Projects
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        image_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'created'
    );
    """)

    # Uploaded Images
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS project_images (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        original_name TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        sharpness REAL,
        blur_detected INTEGER DEFAULT 0,
        feature_count INTEGER,
        brightness REAL,
        contrast REAL,
        exposure TEXT,
        is_valid INTEGER DEFAULT 1,
        validation_error TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    """)

    # View Coverage Analysis
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS view_analyses (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        view_coverage REAL,
        image_overlap REAL,
        camera_confidence REAL,
        feature_density TEXT,
        reconstruction_risk TEXT,
        details_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    """)

    # View Recommendation
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS view_recommendations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        recommended_angle_deg REAL,
        missing_quadrant TEXT,
        guidance_text TEXT,
        expected_coverage_gain REAL,
        method TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    """)

    # Reconstruction Jobs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reconstruction_jobs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        engine TEXT NOT NULL,
        quality TEXT NOT NULL,
        output_format TEXT NOT NULL,
        refinement TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        current_step TEXT,
        logs_json TEXT,
        error_message TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    """)

    # Reconstruction Results
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reconstruction_results (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        model_path_glb TEXT,
        model_path_ply TEXT,
        model_path_obj TEXT,
        vertex_count INTEGER,
        face_count INTEGER,
        point_count INTEGER,
        geometry_confidence REAL,
        visual_quality REAL,
        processing_time_sec REAL,
        memory_peak_mb REAL,
        confidence_data_json TEXT,
        calibration_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (job_id) REFERENCES reconstruction_jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    """)

    # Evaluations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS evaluations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        reconstruction_id TEXT,
        ground_truth_path TEXT,
        chamfer_distance REAL,
        hausdorff_distance REAL,
        point_to_point_error REAL,
        psnr REAL,
        ssim REAL,
        metrics_json TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    """)

    # Research Experiments
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS experiments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        dataset_name TEXT,
        status TEXT DEFAULT 'completed',
        view_counts_json TEXT,
        results_json TEXT,
        created_at TEXT NOT NULL
    );
    """)

    conn.commit()
    conn.close()
    logger.info("Database schema initialized successfully.")

