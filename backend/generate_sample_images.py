import cv2
import numpy as np
import math
from pathlib import Path
from app.core.config import settings

def create_sample_sparse_views():
    """
    Generate 4 controlled multi-view viewpoints of a 3D geometric artifact
    with distinct perspective projections, realistic surface textures, and shading.
    """
    sample_dir = settings.STORAGE_DIR / "sample_data"
    sample_dir.mkdir(parents=True, exist_ok=True)

    angles = [
        ("view_01_front.jpg", 0.0, 0.0),
        ("view_02_right.jpg", 65.0, 15.0),
        ("view_03_rear_right.jpg", 140.0, 20.0),
        ("view_04_left.jpg", 285.0, -10.0),
    ]

    width, height = 800, 600
    images_created = []

    for filename, azimuth_deg, elevation_deg in angles:
        img = np.zeros((height, width, 3), dtype=np.uint8)
        # Deep studio background with vignette
        y, x = np.ogrid[:height, :width]
        dist_from_center = np.sqrt((x - width / 2)**2 + (y - height / 2)**2)
        vignette = np.clip(1.0 - dist_from_center / 500.0, 0.1, 1.0)
        img[:, :] = (np.array([28, 22, 18]) * vignette[:, :, None]).astype(np.uint8)

        # 3D object: Render a textured polyhedron / vase-like geometry
        cx, cy = width // 2, height // 2
        az_rad = math.radians(azimuth_deg)
        el_rad = math.radians(elevation_deg)

        # Draw projected 3D wireframe / shaded polygons
        points_3d = []
        # Generate rings of points
        n_rings = 14
        n_pts = 24
        for r_idx in range(n_rings):
            z_norm = (r_idx - n_rings / 2) / (n_rings / 2)
            radius = 140 + 35 * math.sin(z_norm * 3.5) + 15 * math.cos(az_rad + z_norm * 2)
            ring = []
            for p_idx in range(n_pts):
                phi = (2 * math.pi / n_pts) * p_idx + az_rad
                x_3d = radius * math.cos(phi)
                y_3d = (r_idx - n_rings / 2) * 22
                z_3d = radius * math.sin(phi)

                # Rotate by elevation
                y_rot = y_3d * math.cos(el_rad) - z_3d * math.sin(el_rad)
                z_rot = y_3d * math.sin(el_rad) + z_3d * math.cos(el_rad)

                # Project to 2D
                f = 650.0
                depth = z_rot + 550.0
                u = int(cx + (x_3d * f) / depth)
                v = int(cy + (y_rot * f) / depth)
                ring.append((u, v, depth, phi))
            points_3d.append(ring)

        # Render shaded faces with rich texture
        for r_idx in range(n_rings - 1):
            for p_idx in range(n_pts):
                p1 = points_3d[r_idx][p_idx]
                p2 = points_3d[r_idx][(p_idx + 1) % n_pts]
                p3 = points_3d[r_idx + 1][(p_idx + 1) % n_pts]
                p4 = points_3d[r_idx + 1][p_idx]

                # Back-face culling via signed area
                area = (p2[0] - p1[0]) * (p4[1] - p1[1]) - (p2[1] - p1[1]) * (p4[0] - p1[0])
                if area > 0:
                    pts = np.array([[p1[0], p1[1]], [p2[0], p2[1]], [p3[0], p3[1]], [p4[0], p4[1]]], np.int32)
                    # Diffuse lighting
                    light_intensity = max(0.2, (math.cos(p1[3]) + 1.0) / 2.0)
                    color = (
                        int(180 * light_intensity + 40),
                        int(110 * light_intensity + 30),
                        int(70 * light_intensity + 20)
                    )
                    cv2.fillConvexPoly(img, pts, color)
                    # Add detailed surface texture lines for ORB/SIFT feature richness
                    cv2.polylines(img, [pts], True, (int(color[0] * 0.7), int(color[1] * 0.7), int(color[2] * 0.7)), 1)

        # Add speckle noise for dense feature descriptors
        noise = np.random.normal(0, 8, img.shape).astype(np.int16)
        noisy_img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        out_path = sample_dir / filename
        cv2.imwrite(str(out_path), noisy_img)
        images_created.append(str(out_path))

    print(f"Generated {len(images_created)} sample multi-view photographs in {sample_dir}")
    return images_created

if __name__ == "__main__":
    create_sample_sparse_views()
