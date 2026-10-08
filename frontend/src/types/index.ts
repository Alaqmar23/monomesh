export interface SystemStatus {
  status: string;
  platform: {
    system: string;
    release: string;
    python: string;
    architecture: string;
  };
  cpu: {
    cores: number;
    usage_percent: number;
  };
  ram: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
    usage_percent: number;
  };
  storage: {
    total_gb: number;
    free_gb: number;
    healthy: boolean;
  };
  gpu: {
    cuda_available: boolean;
    device_count: number;
    name: string;
    vram_total_gb: number;
    vram_used_gb: number;
    vram_free_gb: number;
    torch_version: string;
  };
  libraries: {
    torch: boolean;
    trimesh: boolean;
    open3d: boolean;
    scipy: boolean;
  };
  engines: Record<string, {
    name: string;
    available: boolean;
    min_vram_gb: number;
    device: string;
    description: string;
  }>;
  recommended_engine: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  image_count: number;
  status: string;
  latest_confidence: number | null;
  latest_reconstruction_id: string | null;
  latest_model_glb: string | null;
}

export interface ProjectImage {
  id: string;
  project_id: string;
  filename: string;
  original_name: string;
  url: string;
  width: number;
  height: number;
  sharpness: number;
  blur_detected: boolean;
  feature_count: number;
  feature_density: 'High' | 'Medium' | 'Low';
  brightness: number;
  contrast: number;
  exposure: string;
  is_valid: boolean;
  validation_error: string | null;
  created_at: string;
}

export interface ImageQualitySummary {
  total_images: number;
  valid_images: number;
  average_sharpness: number;
  average_features: number;
  warnings: string[];
  images: ProjectImage[];
}

export interface CameraPoseEstimate {
  image_id: string;
  image_name: string;
  azimuth_deg: number;
  elevation_deg: number;
  distance: number;
  relative_rotation: number[][];
  relative_translation: number[];
}

export interface ViewCoverageResult {
  project_id: string;
  view_coverage: number;
  image_overlap: number;
  camera_confidence: number;
  feature_density: 'High' | 'Medium' | 'Low';
  reconstruction_risk: 'Low' | 'Medium' | 'High';
  angular_spread_deg: number;
  covered_sectors: string[];
  uncovered_sectors: string[];
  estimated_cameras: CameraPoseEstimate[];
  created_at: string;
}

export interface ViewRecommendationResult {
  project_id: string;
  missing_region: string;
  recommended_azimuth_deg: number;
  recommended_elevation_deg: number;
  guidance_text: string;
  expected_coverage_improvement: number;
  method: string;
  candidate_angles: Array<{
    candidate_id: number;
    azimuth_deg: number;
    elevation_deg: number;
    label: string;
    score: number;
  }>;
  created_at: string;
}

export interface ReconstructionJobStatus {
  id: string;
  project_id: string;
  engine: string;
  quality: string;
  output_format: string;
  refinement: string;
  status: 'QUEUED' | 'VALIDATING' | 'ANALYZING_IMAGES' | 'ESTIMATING_CAMERAS' | 'GENERATING_DEPTH' | 'BUILDING_POINT_CLOUD' | 'GENERATING_MESH' | 'REFINING' | 'EVALUATING' | 'COMPLETED' | 'FAILED';
  progress: number;
  current_step: string;
  logs: string[];
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface ReconstructionResult {
  id: string;
  job_id: string;
  project_id: string;
  engine_used: string;
  refinement_status: string;
  refinement_details: string;
  model_urls: {
    glb: string;
    ply: string;
    obj: string;
    confidence_glb: string;
    generated_glb?: string | null;
  };
  vertex_count: number;
  face_count: number;
  point_count: number;
  geometry_confidence: number;
  visual_quality: number;
  processing_time_sec: number;
  memory_peak_mb: number;
  spatial_confidence: {
    high_percentage: number;
    medium_percentage: number;
    low_percentage: number;
    unknown_percentage: number;
    region_ratings: Record<string, string>;
    uncertain_regions: string[];
    vertex_confidence_map_available: boolean;
  };
  created_at: string;
}

export interface MetricValue {
  name: string;
  value: number | null;
  unit: string;
  available: boolean;
  status_label: string;
  description: string;
}

export interface EvaluationResult {
  id: string;
  project_id: string;
  reconstruction_id: string;
  ground_truth_present: boolean;
  ground_truth_name: string | null;
  metrics: Record<string, MetricValue>;
  view_count: number;
  processing_time_sec: number;
  peak_vram_mb: number;
  output_mesh_faces: number;
  output_mesh_vertices: number;
  notes: string[];
  created_at: string;
}

export interface ExperimentData {
  id: string;
  name: string;
  description: string;
  dataset_name: string;
  view_counts: number[];
  results: Array<{
    view_count: number;
    view_coverage_pct: number;
    geometry_confidence_pct: number;
    processing_time_sec: number;
    peak_memory_mb: number;
    vertex_count: number;
    face_count: number;
    chamfer_distance: number;
  }>;
  created_at: string;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface DistanceMeasurement {
  raw_distance: number;
  unit: string;
  calibrated_distance: number | null;
  is_calibrated: boolean;
  status_message: string;
}

export interface CalibrationResult {
  scale_factor: number;
  unit: string;
  is_calibrated: boolean;
  bounding_box: {
    width: number;
    height: number;
    depth: number;
    volume_est: number;
  };
  status_message: string;
}
