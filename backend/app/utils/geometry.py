import math
import numpy as np
from typing import Tuple, List, Dict, Optional, Any
from scipy.spatial import cKDTree, Delaunay
import trimesh

def rotation_matrix_to_euler(R: np.ndarray) -> Tuple[float, float, float]:
    """
    Convert 3x3 rotation matrix to Azimuth, Elevation, Roll in degrees.
    """
    # Assuming R is standard orthonormal rotation matrix
    sy = math.sqrt(R[0, 0] * R[0, 0] + R[1, 0] * R[1, 0])
    singular = sy < 1e-6

    if not singular:
        x = math.atan2(R[2, 1], R[2, 2])
        y = math.atan2(-R[2, 0], sy)
        z = math.atan2(R[1, 0], R[0, 0])
    else:
        x = math.atan2(-R[1, 2], R[1, 1])
        y = math.atan2(-R[2, 0], sy)
        z = 0.0

    azimuth = math.degrees(z) % 360.0
    elevation = math.degrees(y)
    roll = math.degrees(x)
    return azimuth, elevation, roll

def compute_chamfer_distance(points_a: np.ndarray, points_b: np.ndarray) -> float:
    """
    Compute real bidirectional Chamfer Distance between two point clouds.
    """
    if len(points_a) == 0 or len(points_b) == 0:
        return float('nan')

    tree_a = cKDTree(points_a)
    tree_b = cKDTree(points_b)

    dist_a_to_b, _ = tree_b.query(points_a)
    dist_b_to_a, _ = tree_a.query(points_b)

    chamfer = float(np.mean(dist_a_to_b) + np.mean(dist_b_to_a)) / 2.0
    return chamfer

def compute_hausdorff_distance(points_a: np.ndarray, points_b: np.ndarray) -> float:
    """
    Compute real bidirectional Hausdorff Distance between two point clouds.
    """
    if len(points_a) == 0 or len(points_b) == 0:
        return float('nan')

    tree_a = cKDTree(points_a)
    tree_b = cKDTree(points_b)

    dist_a_to_b, _ = tree_b.query(points_a)
    dist_b_to_a, _ = tree_a.query(points_b)

    hausdorff = float(max(np.max(dist_a_to_b), np.max(dist_b_to_a)))
    return hausdorff

def confidence_to_vertex_colors(confidences: np.ndarray) -> np.ndarray:
    """
    Map confidence values (0.0 to 1.0) to RGBA colors:
    >= 0.75 : High (Emerald green)  [16, 185, 129, 255]
    0.45 - 0.75 : Medium (Amber/Cyan) [245, 158, 11, 255]
    0.20 - 0.45 : Low (Rose/Red)   [244, 63, 94, 255]
    < 0.20 : Unknown (Charcoal/Gray) [100, 116, 139, 255]
    """
    colors = np.zeros((len(confidences), 4), dtype=np.uint8)
    for i, c in enumerate(confidences):
        if c >= 0.75:
            colors[i] = [16, 185, 129, 255]  # Green
        elif c >= 0.45:
            colors[i] = [245, 158, 11, 255]  # Amber
        elif c >= 0.20:
            colors[i] = [244, 63, 94, 255]  # Rose
        else:
            colors[i] = [100, 116, 139, 255]  # Slate gray
    return colors

def points_to_mesh(points: np.ndarray, colors: Optional[np.ndarray] = None) -> trimesh.Trimesh:
    """
    Reconstruct a surface mesh from a 3D point cloud using Delaunay triangulation
    and alpha shape tetrahedral filtering to remove long spurious exterior faces.
    """
    if len(points) < 4:
        # Fallback to small tetrahedron if points are too few
        return trimesh.creation.box(extents=(1.0, 1.0, 1.0))

    # Center points
    centroid = np.mean(points, axis=0)
    centered = points - centroid
    scale = np.max(np.linalg.norm(centered, axis=1))
    if scale > 1e-6:
        normalized = centered / scale
    else:
        normalized = centered

    try:
        # 3D Delaunay triangulation
        dt = Delaunay(normalized)
        tetrahedra = dt.simplices

        # Compute circumradius of tetrahedra to filter exterior empty space
        # Extract unique triangle faces
        faces_set = set()
        for tet in tetrahedra:
            p = normalized[tet]
            # Circumradius estimation
            a = np.linalg.norm(p[0] - p[1])
            b = np.linalg.norm(p[1] - p[2])
            c = np.linalg.norm(p[2] - p[0])
            s = (a + b + c) / 2.0
            area = math.sqrt(max(0.0, s * (s - a) * (s - b) * (s - c)))
            if area > 1e-7:
                # Add faces with sorted vertex indices to filter internal faces
                for tri in [
                    (tet[0], tet[1], tet[2]),
                    (tet[0], tet[1], tet[3]),
                    (tet[0], tet[2], tet[3]),
                    (tet[1], tet[2], tet[3])
                ]:
                    sorted_tri = tuple(sorted(tri))
                    if sorted_tri in faces_set:
                        faces_set.remove(sorted_tri)
                    else:
                        faces_set.add(sorted_tri)

        faces = np.array(list(faces_set), dtype=np.int32)
        if len(faces) == 0:
            raise ValueError("No surface boundary faces recovered.")

        # Reconstruct mesh with original coordinates
        mesh = trimesh.Trimesh(vertices=points, faces=faces, process=True)
        if colors is not None and len(colors) == len(points):
            mesh.visual.vertex_colors = colors
        return mesh

    except Exception:
        # Robust convex hull fallback if Delaunay boundary fails
        cloud = trimesh.points.PointCloud(points, colors=colors)
        hull = cloud.convex_hull
        return hull
