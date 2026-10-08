# Sparse3D — Latest Prompt & Context Snapshot

## 1. Project Goal & Architectural Stack

**Sparse3D** is an AI-powered sparse-view 3D reconstruction, analysis, and spatial uncertainty mapping platform optimized for low-VRAM environments (target: NVIDIA RTX 3050 4GB VRAM with CPU fallback). Processing 2–5 input images, the system evaluates pixel quality (Laplacian variance/sharpness), computes epipolar matches/camera geometry, maps angular coverage gaps to recommend optimal next camera angles, and executes hardware-aware 3D reconstruction. The architecture cascades across multiple engines: local VGGT FP16 neural inference, remote GPU worker execution, CPU classical stereo triangulation, and Track B generative hull extrapolation, producing PLY meshes annotated with per-vertex spatial uncertainty confidence scores and Chamfer/Hausdorff ground-truth evaluation metrics.
* **Backend**: Python 3.11, FastAPI, Pydantic v2, OpenCV, SciPy (`cKDTree`, `Delaunay`), Trimesh, PyTorch 2.6 (CUDA 12.4), SQLite3.
* **Frontend**: React 18, TypeScript, Vite, Vanilla Tailwind CSS (glassmorphism design), Three.js, React Three Fiber (`@react-three/fiber`), Drei, Recharts, Lucide React.

---

## 2. Key Files Recently Created or Modified

### Newly Created Files (Untracked)
- `backend/app/reconstruction/generative_engine.py`: Track B generative extrapolation engine for synthetic/AI surface filling on unobserved camera arcs.
- `backend/app/reconstruction/remote_worker.py`: Remote GPU execution engine offloading heavy inference via REST endpoints (`SPARSE3D_WORKER_URL`).
- `frontend/src/pages/LabViewer.tsx`: Interactive workstation UI supporting multi-image uploads, engine configuration, real-time log stream, and multi-mesh Three.js viewing.
- `worker/`: Standalone remote execution package for off-node GPU worker nodes.

### Modified Core Files
- `backend/app/reconstruction/manager.py`: Orchestrates multi-engine fallback sequence (VGGT -> Remote Worker -> Classical -> Generative).
- `backend/app/reconstruction/classical_engine.py`: Enhanced CPU stereo triangulation fallback with feature matching.
- `backend/app/reconstruction/vggt_engine.py`: FP16 low-VRAM PyTorch VGGT inference handler.
- `backend/app/api/routes/reconstruction.py` & `models.py`: API route extensions for generative toggles and remote job dispatching.
- `backend/app/schemas/reconstruction.py` & `common.py`: Pydantic payload models for generative parameters and engine metadata.
- `backend/app/utils/geometry.py`: Multi-view ray intersection, spatial confidence mapping, and Chamfer/Hausdorff metric calculations.
- `frontend/src/App.tsx`: Routing integration for the `LabViewer` workstation page.
- `frontend/src/components/viewer/ThreeViewer.tsx`: WebGL viewport with vertex confidence heatmaps, wireframe/solid modes, and camera frustum overlays.
- `frontend/src/index.css`: Styles for lab viewer layouts, progress indicators, and glassmorphic panels.
- `frontend/src/services/reconstructionService.ts` & `types/index.ts`: API clients and type definitions for generative reconstruction workflows.

---

## 3. Open Issues & Next Immediate Technical Steps

### 1. Remote Worker Infrastructure & Authentication
- Build containerized `Dockerfile` for `worker/` service supporting CUDA FP16 models (TRELLIS/Hunyuan3D).
- Implement bearer token auth and health monitoring for `RemoteWorkerEngine` (`SPARSE3D_WORKER_URL`).

### 2. Real Generative Model Integration (Track B)
- Upgrade `GenerativeEngine` from current synthetic hull fallback to Zero123/StableZero123 image-to-3D diffusion backend.
- Blending logic: Seamlessly stitch unobserved generative surface patches with sparse classical/VGGT base geometry.

### 3. Spatial Uncertainty & Performance Optimization
- Optimize per-vertex visibility raycasting in `backend/app/utils/geometry.py` using spatial k-d trees for >50k vertex meshes.
- Dynamic color buffer updates in `ThreeViewer.tsx` for fast toggling between Solid, Wireframe, Confidence Heatmap, and Generative modes.

### 4. Ground-Truth Benchmarking & Verification
- Create automated quantitative verification CLI (`scripts/evaluate_mesh.py`) measuring Chamfer and Hausdorff distances against reference CAD models.
- Expand end-to-end integration tests for multi-engine failover paths.
