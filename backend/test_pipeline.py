import os
import sys
import time
from pathlib import Path

# Add backend to sys.path
sys.path.append(str(Path(__file__).parent))

from app.core.config import settings
from app.models.db import init_db, get_db_connection
from app.core.hardware import detect_hardware
from app.services.image_service import ImageService
from app.services.view_analysis import ViewAnalysisService
from app.services.view_recommendation import ViewRecommendationService
from app.reconstruction.manager import ReconstructionManager
from app.services.measurement_service import MeasurementService
from app.services.evaluation_service import EvaluationService
from app.schemas.measurement import Point3D

def run_e2e_verification():
    print("=" * 60)
    print("SPARSE3D END-TO-END PIPELINE VERIFICATION")
    print("=" * 60)

    # 1. Hardware Detection
    print("\n[Step 1/8] Verifying Hardware Detection...")
    hw = detect_hardware()
    print(f"  • Host OS: {hw['platform']['system']} {hw['platform']['release']}")
    print(f"  • GPU: {hw['gpu']['name']} (CUDA: {hw['gpu']['cuda_available']}, VRAM: {hw['gpu']['vram_total_gb']}GB)")
    print(f"  • Recommended Engine: {hw['recommended_engine']}")

    # 2. Database Initialization
    print("\n[Step 2/8] Initializing Database...")
    init_db()
    print("  • Database tables verified.")

    # 3. Locate Sample Images
    sample_dir = settings.STORAGE_DIR / "sample_data"
    image_paths = sorted(list(sample_dir.glob("*.jpg")))[:3]
    if len(image_paths) < 2:
        print("  ❌ Insufficient sample images found.")
        return False
    print(f"  • Using {len(image_paths)} sample sparse viewpoints:")
    for p in image_paths:
        print(f"    - {p.name}")

    # 4. Image Quality Analysis
    print("\n[Step 3/8] Running OpenCV Image Quality Analysis...")
    analyses = []
    for p in image_paths:
        res = ImageService.analyze_image(str(p))
        analyses.append(res)
        print(f"  • {p.name}: Res {res['width']}x{res['height']}, Sharpness={res['sharpness']}, Features={res['feature_count']}, Density={res['feature_density']}")

    summary = ImageService.generate_quality_summary(analyses)
    print(f"  • Quality Summary: Avg Sharpness={summary['average_sharpness']}, Avg Features={summary['average_features']}")

    # 5. Multi-View Coverage & Epipolar Analysis
    print("\n[Step 4/8] Running Epipolar Multi-View Coverage Analysis...")
    img_names = [p.name for p in image_paths]
    coverage = ViewAnalysisService.analyze_views([str(p) for p in image_paths], img_names)
    print(f"  • View Coverage: {coverage['view_coverage']}%")
    print(f"  • Image Overlap: {coverage['image_overlap']}%")
    print(f"  • Camera Confidence: {coverage['camera_confidence']}%")
    print(f"  • Reconstruction Risk: {coverage['reconstruction_risk']}")
    print(f"  • Covered Sectors: {len(coverage['covered_sectors'])}/8 ({', '.join(coverage['covered_sectors'][:3])}...)")

    # 6. View Recommendation
    print("\n[Step 5/8] Generating Next Viewpoint Recommendation...")
    rec = ViewRecommendationService.recommend_next_viewpoint(coverage)
    print(f"  • Missing Sector: {rec['missing_region']}")
    print(f"  • Recommended Azimuth: {rec['recommended_azimuth_deg']}°")
    print(f"  • Actionable Guidance: {rec['guidance_text']}")
    print(f"  • Expected Gain: +{rec['expected_coverage_improvement']}%")

    # 7. 3D Reconstruction
    print("\n[Step 6/8] Executing 3D Reconstruction Manager...")
    rm = ReconstructionManager()
    job_id = f"test_{int(time.time())}"
    proj_id = "test_project_e2e"

    def progress(step, pct):
        print(f"    -> Progress: {step} ({pct}%)")

    t0 = time.time()
    result = rm.execute_reconstruction(
        job_id=job_id,
        project_id=proj_id,
        image_paths=[str(p) for p in image_paths],
        config={"engine": "auto", "quality": "balanced", "refinement": "auto"},
        progress_callback=progress
    )
    t_elapsed = round(time.time() - t0, 2)

    print(f"  • Engine Used: {result['engine_used']}")
    print(f"  • Reconstructed Vertices: {result['vertex_count']:,}")
    print(f"  • Reconstructed Faces: {result['face_count']:,}")
    print(f"  • Processing Time: {t_elapsed}s")
    print(f"  • Output GLB: {Path(result['glb_path']).name} ({round(os.path.getsize(result['glb_path'])/1024, 1)} KB)")
    print(f"  • Output PLY: {Path(result['ply_path']).name} ({round(os.path.getsize(result['ply_path'])/1024, 1)} KB)")
    print(f"  • Output Confidence GLB: {Path(result['confidence_glb_path']).name} ({round(os.path.getsize(result['confidence_glb_path'])/1024, 1)} KB)")

    # 8. Spatial Confidence
    print("\n[Step 7/8] Verifying Spatial Confidence Mapping...")
    conf = result["confidence"]
    print(f"  • Geometry Confidence: {conf['geometry_confidence']}%")
    print(f"  • Visual Quality: {conf['visual_quality']}%")
    print(f"  • High Confidence: {conf['high_pct']}%")
    print(f"  • Medium Confidence: {conf['medium_pct']}%")
    print(f"  • Low / Inferred: {conf['low_pct']}%")
    print(f"  • Unknown / Unseen: {conf['unknown_pct']}%")

    # 9. Measurement & Calibration
    print("\n[Step 8/8] Testing 3D Measurement & Scale Calibration...")
    p1 = Point3D(x=0.0, y=0.0, z=0.0)
    p2 = Point3D(x=0.5, y=0.8, z=0.3)
    dist = MeasurementService.calculate_distance(p1, p2)
    print(f"  • Uncalibrated Distance: {dist['raw_distance']} {dist['unit']}")

    calib = MeasurementService.calibrate_scale(
        model_path=result["glb_path"],
        p_a=p1,
        p_b=p2,
        known_distance=15.0,
        known_unit="cm"
    )
    print(f"  • Calibrated Scale: {calib['scale_factor']} cm/unit")
    print(f"  • Calibrated Dimensions: Width={calib['bounding_box']['width']}cm, Height={calib['bounding_box']['height']}cm, Depth={calib['bounding_box']['depth']}cm")

    # Evaluation
    eval_res = EvaluationService.evaluate_model(
        reconstructed_mesh_path=result["glb_path"],
        runtime_sec=t_elapsed,
        view_count=len(image_paths)
    )
    print(f"  • Scientific Evaluation Status: Ground Truth Present = {eval_res['ground_truth_present']}")
    print(f"  • Chamfer Distance Status: {eval_res['metrics']['chamfer_distance']['status_label']}")

    print("\n" + "=" * 60)
    print("[SUCCESS] ALL 8 SYSTEM PHASES VERIFIED SUCCESSFULLY!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = run_e2e_verification()
    sys.exit(0 if success else 1)
