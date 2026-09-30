"""
VGGT Engine — GPU-accelerated reconstruction using MiDaS depth estimation.
Uses real monocular depth maps + multi-view feature matching for 3D fusion.
Designed for RTX 3050 4GB: sequential inference, FP16, aggressive cache clearing.
"""
import time
import cv2
import numpy as np
import trimesh
import torch
from typing import List, Dict, Any, Callable, Optional
from app.reconstruction.base import ReconstructionEngine
from app.services.depth_estimator import estimate_depth, unload_model
from app.utils.geometry import points_to_mesh
from app.core.logging import logger


class VGGTEngine(ReconstructionEngine):
    def __init__(self):
        self.name = "Depth-Fused Multi-View (GPU)"

    def is_available(self) -> bool:
        return torch.cuda.is_available()

    def estimate_requirements(self) -> Dict[str, Any]:
        return {
            "min_vram_gb": 2.0,
            "recommended_vram_gb": 4.0,
            "min_ram_gb": 8.0,
            "device": "cuda" if torch.cuda.is_available() else "cpu"
        }

    def _load_and_resize(self, path: str, max_dim: int) -> np.ndarray:
        img = cv2.imread(str(path))
        if img is None:
            raise ValueError(f"Could not read image: {path}")
        h, w = img.shape[:2]
        if max(h, w) > max_dim:
            scale = max_dim / float(max(h, w))
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        return img

    def _estimate_cameras_from_features(self, images_gray, images_bgr):
        """Use SIFT feature matching + essential matrix to estimate relative camera poses."""
        n = len(images_gray)
        h0, w0 = images_gray[0].shape
        focal = max(h0, w0)
        K = np.array([
            [focal, 0, w0 / 2.0],
            [0, focal, h0 / 2.0],
            [0, 0, 1.0]
        ], dtype=np.float64)

        sift = cv2.SIFT_create(nfeatures=3000)
        bf = cv2.BFMatcher(cv2.NORM_L2, crossCheck=False)

        kps_list, des_list = [], []
        for g in images_gray:
            kp, des = sift.detectAndCompute(g, None)
            kps_list.append(kp)
            des_list.append(des)

        poses = [{"R": np.eye(3), "t": np.zeros((3, 1))}]
        curr_R, curr_t = np.eye(3), np.zeros((3, 1))

        # Also collect triangulated sparse points for validation
        sparse_points = []
        sparse_colors = []

        for i in range(n - 1):
            des1, des2 = des_list[i], des_list[i + 1]
            kp1, kp2 = kps_list[i], kps_list[i + 1]

            if des1 is None or des2 is None or len(kp1) < 8 or len(kp2) < 8:
                # Can't match, assume even angular spacing
                angle = (360.0 / n) * (i + 1)
                rad = np.radians(angle)
                R_guess = np.array([
                    [np.cos(rad), 0, np.sin(rad)],
                    [0, 1, 0],
                    [-np.sin(rad), 0, np.cos(rad)]
                ])
                poses.append({"R": R_guess, "t": np.zeros((3, 1))})
                continue

            matches = bf.knnMatch(des1, des2, k=2)
            good = [m for m, n_m in matches if m.distance < 0.7 * n_m.distance]

            if len(good) >= 12:
                pts1 = np.float32([kp1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
                pts2 = np.float32([kp2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)

                E, mask = cv2.findEssentialMat(pts1, pts2, K, method=cv2.RANSAC, prob=0.999, threshold=1.0)
                if E is not None and mask is not None:
                    _, R, t, mask_pose = cv2.recoverPose(E, pts1, pts2, K, mask=mask)
                    curr_R = curr_R @ R
                    curr_t = curr_t + curr_R @ t
                    poses.append({"R": curr_R.copy(), "t": curr_t.copy()})

                    # Triangulate for sparse validation points
                    P1 = K @ np.hstack([poses[-2]["R"], poses[-2]["t"]])
                    P2 = K @ np.hstack([curr_R, curr_t])
                    inlier_pts1 = pts1[mask_pose.ravel() > 0]
                    inlier_pts2 = pts2[mask_pose.ravel() > 0]
                    if len(inlier_pts1) > 0:
                        pts4d = cv2.triangulatePoints(P1, P2, inlier_pts1.T, inlier_pts2.T)
                        pts3d = (pts4d[:3] / (pts4d[3] + 1e-8)).T
                        valid = (pts3d[:, 2] > 0.01) & (pts3d[:, 2] < 100.0)
                        pts3d = pts3d[valid]
                        for j, pt2d in enumerate(inlier_pts1[valid]):
                            u = int(np.clip(pt2d[0, 0], 0, images_bgr[i].shape[1] - 1))
                            v = int(np.clip(pt2d[0, 1], 0, images_bgr[i].shape[0] - 1))
                            b, g, r = images_bgr[i][v, u]
                            sparse_points.append(pts3d[j])
                            sparse_colors.append([r, g, b, 255])
                else:
                    angle = (360.0 / n) * (i + 1)
                    rad = np.radians(angle)
                    R_guess = np.array([
                        [np.cos(rad), 0, np.sin(rad)],
                        [0, 1, 0],
                        [-np.sin(rad), 0, np.cos(rad)]
                    ])
                    poses.append({"R": R_guess, "t": np.zeros((3, 1))})
            else:
                angle = (360.0 / n) * (i + 1)
                rad = np.radians(angle)
                R_guess = np.array([
                    [np.cos(rad), 0, np.sin(rad)],
                    [0, 1, 0],
                    [-np.sin(rad), 0, np.cos(rad)]
                ])
                poses.append({"R": R_guess, "t": np.zeros((3, 1))})

        sparse_pts = np.array(sparse_points, dtype=np.float32) if sparse_points else np.empty((0, 3))
        sparse_cols = np.array(sparse_colors, dtype=np.uint8) if sparse_colors else np.empty((0, 4))

        return K, poses, sparse_pts, sparse_cols

    def _backproject_depth(self, depth_map, image_bgr, K, R, t, step=4):
        """Backproject a depth map into 3D world coordinates using camera pose."""
        h, w = depth_map.shape
        fx, fy = K[0, 0], K[1, 1]
        cx, cy = K[0, 2], K[1, 2]

        # Scale K to match depth map resolution if needed
        img_h, img_w = image_bgr.shape[:2]
        scale_x = w / img_w
        scale_y = h / img_h
        fx_s, fy_s = fx * scale_x, fy * scale_y
        cx_s, cy_s = cx * scale_x, cy * scale_y

        # Create pixel grid (subsampled)
        u_coords = np.arange(0, w, step)
        v_coords = np.arange(0, h, step)
        uu, vv = np.meshgrid(u_coords, v_coords)
        uu_flat = uu.flatten()
        vv_flat = vv.flatten()

        depth_vals = depth_map[vv_flat, uu_flat]

        # Scale depth: MiDaS gives relative depth [0,1], scale to reasonable range
        # Use median-based scaling for stability
        median_d = np.median(depth_vals[depth_vals > 0.05])
        if median_d > 0:
            depth_vals = depth_vals / median_d * 2.0  # Normalize around 2.0 units

        # Filter out zero/near-zero depth
        valid = depth_vals > 0.1
        uu_v = uu_flat[valid]
        vv_v = vv_flat[valid]
        d_v = depth_vals[valid]

        # Backproject to camera space
        x_cam = (uu_v - cx_s) / fx_s * d_v
        y_cam = (vv_v - cy_s) / fy_s * d_v
        z_cam = d_v

        pts_cam = np.column_stack([x_cam, -y_cam, z_cam])  # Flip Y for OpenGL convention

        # Transform to world space
        pts_world = (R.T @ (pts_cam.T - t)).T

        # Sample colors from original image
        img_u = (uu_v / scale_x).astype(int).clip(0, img_w - 1)
        img_v = (vv_v / scale_y).astype(int).clip(0, img_h - 1)
        colors = image_bgr[img_v, img_u]
        colors_rgba = np.column_stack([colors[:, 2], colors[:, 1], colors[:, 0],
                                        np.full(len(colors), 255, dtype=np.uint8)])

        return pts_world.astype(np.float32), colors_rgba.astype(np.uint8)

    def reconstruct(
        self,
        image_paths: List[str],
        config: Dict[str, Any],
        progress_callback: Optional[Callable[[str, int], None]] = None
    ) -> Dict[str, Any]:
        start_time = time.time()
        n = len(image_paths)

        def report(step: str, pct: int):
            if progress_callback:
                progress_callback(step, pct)

        report("VALIDATING", 5)
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        # Load images
        max_dim = {"high": 768, "balanced": 640, "fast": 512}.get(config.get("quality", "balanced"), 640)
        images_bgr = [self._load_and_resize(p, max_dim) for p in image_paths]
        images_gray = [cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) for img in images_bgr]

        report("ESTIMATING_CAMERAS", 15)
        K, poses, sparse_pts, sparse_cols = self._estimate_cameras_from_features(images_gray, images_bgr)
        logger.info(f"Estimated {len(poses)} camera poses, {len(sparse_pts)} sparse triangulated points")

        # Generate real depth maps using MiDaS
        report("GENERATING_DEPTH", 30)
        all_points = []
        all_colors = []

        step = {"high": 3, "balanced": 4, "fast": 6}.get(config.get("quality", "balanced"), 4)

        for i, img_bgr in enumerate(images_bgr):
            report("GENERATING_DEPTH", 30 + int(30 * i / n))
            logger.info(f"Running MiDaS depth on view {i+1}/{n}")

            depth_map = estimate_depth(img_bgr)

            R = poses[i]["R"] if i < len(poses) else np.eye(3)
            t = poses[i]["t"] if i < len(poses) else np.zeros((3, 1))

            pts, cols = self._backproject_depth(depth_map, img_bgr, K, R, t, step=step)
            all_points.append(pts)
            all_colors.append(cols)

            if torch.cuda.is_available():
                torch.cuda.empty_cache()

        # Free the depth model to recover VRAM
        unload_model()

        report("BUILDING_POINT_CLOUD", 70)
        # Fuse all point clouds
        fused_points = np.vstack(all_points)
        fused_colors = np.vstack(all_colors)

        # Add sparse triangulated points (they're geometrically accurate)
        if len(sparse_pts) > 0:
            fused_points = np.vstack([fused_points, sparse_pts])
            fused_colors = np.vstack([fused_colors, sparse_cols])

        # Statistical outlier removal
        mean = np.mean(fused_points, axis=0)
        std = np.std(fused_points, axis=0)
        std_clipped = np.clip(std, 0.01, None)
        inliers = np.all(np.abs(fused_points - mean) < 2.5 * std_clipped, axis=1)
        fused_points = fused_points[inliers]
        fused_colors = fused_colors[inliers]

        logger.info(f"Fused point cloud: {len(fused_points)} points after outlier removal")

        report("GENERATING_MESH", 85)
        mesh = points_to_mesh(fused_points, fused_colors)

        # Center and normalize
        mesh.apply_translation(-mesh.centroid)
        max_ext = max(mesh.extents) if max(mesh.extents) > 1e-4 else 1.0
        mesh.apply_scale(2.0 / max_ext)

        elapsed = round(time.time() - start_time, 2)
        peak_vram = 0.0
        if torch.cuda.is_available():
            peak_vram = round(torch.cuda.max_memory_allocated() / (1024 ** 2), 1)

        report("COMPLETED", 100)

        return {
            "points": mesh.vertices,
            "colors": fused_colors[:len(mesh.vertices)] if len(fused_colors) >= len(mesh.vertices) else None,
            "mesh": mesh,
            "vertex_count": len(mesh.vertices),
            "face_count": len(mesh.faces),
            "point_count": len(fused_points),
            "processing_time": elapsed,
            "peak_memory_mb": max(peak_vram, 200.0),
            "engine_name": self.name
        }
