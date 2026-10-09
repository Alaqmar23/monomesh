import os
import modal
import tempfile
import subprocess
import glob
import base64
import json
import shutil
import time
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

# ==========================================
# 1. BUILD THE DOCKER IMAGE
# ==========================================
# This exactly mirrors your Colab notebook installation steps!
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git", "libgl1-mesa-glx", "ninja-build", "libjpeg-dev", "libpng-dev")
    .run_commands("git clone https://github.com/TencentARC/InstantMesh.git /content/InstantMesh")
    # Install PyTorch
    .pip_install("torch==2.1.0", "torchvision==0.16.0", "xformers==0.0.22.post7", extra_index_url="https://download.pytorch.org/whl/cu121")
    # Install other constraints
    .pip_install("setuptools", "numpy<2", "huggingface-hub==0.17.3", "accelerate==0.24.1", "fastapi", "uvicorn", "python-multipart", "trimesh", "onnxruntime", "rembg", "pillow")
    # Clean up requirements.txt and install
    .run_commands("sed -i -E '/gradio|nvdiffrast/d' /content/InstantMesh/requirements.txt")
    .run_commands("pip install -r /content/InstantMesh/requirements.txt")
    # Install nvdiffrast manually
    .run_commands("pip install --no-build-isolation git+https://github.com/NVlabs/nvdiffrast.git@v0.3.3")
)

app = modal.App("sparse3d-instantmesh")
job_dict = modal.Dict.from_name("instantmesh-jobs", create_if_missing=True)
hf_volume = modal.Volume.from_name("huggingface-cache", create_if_missing=True)

# ==========================================
# 2. THE GPU WORKER
# ==========================================
@app.cls(gpu="T4", image=image, max_containers=5, scaledown_window=2, volumes={"/root/.cache/huggingface": hf_volume})
class InstantMeshWorker:
    @modal.enter()
    def setup(self):
        # Create heatmap.py exactly as it was in your Colab notebook
        heat_code = '''
import sys, glob, os, json
import numpy as np
import trimesh
from PIL import Image

obj_path = sys.argv[1]
img_path = sys.argv[2]
out_conf_path = sys.argv[3]
out_json_path = sys.argv[4]

scene = trimesh.load(obj_path, process=False)
mesh = scene.dump(concatenate=True) if isinstance(scene, trimesh.Scene) else scene
V = np.asarray(mesh.vertices); F = np.asarray(mesh.faces); n = len(V)
C = np.asarray(mesh.visual.vertex_colors)[:, :3].astype(float) if hasattr(mesh.visual, 'vertex_colors') else np.full((n, 3), 150.0)

from rembg import remove, new_session
photo = Image.open(img_path).convert('RGB')
if max(photo.size) > 512:
    s = 512 / max(photo.size)
    photo = photo.resize((int(photo.width * s), int(photo.height * s)))
cut = np.array(remove(photo, session=new_session('u2net')))

pts = np.concatenate([V, V[F].mean(axis=1)]) if len(F) > 0 else V
cols = np.concatenate([C, C[F].mean(axis=1)]) if len(F) > 0 else C
UP = np.array([0.0, 0.0, -1.0])

def norm_square(mask, rgb, S=64):
    ys, xs = np.where(mask)
    if len(ys) == 0: return np.zeros((S, S), bool), np.zeros((S, S, 3))
    m = mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    c = rgb[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = m.shape; side = max(h, w)
    pm = np.zeros((side, side), bool); pc = np.zeros((side, side, 3))
    oy, ox = (side - h) // 2, (side - w) // 2
    pm[oy:oy + h, ox:ox + w] = m; pc[oy:oy + h, ox:ox + w] = c
    idx = (np.arange(S) * side / S).astype(int)
    return pm[np.ix_(idx, idx)], pc[np.ix_(idx, idx)]

def direction(az, el):
    a, e = np.deg2rad(az), np.deg2rad(el)
    return np.array([np.cos(e) * np.cos(a), np.cos(e) * np.sin(a), -np.sin(e)])

def render(d, G=160):
    fwd = -d; rx = np.cross(fwd, UP)
    nrx = np.linalg.norm(rx)
    rx = rx / nrx if nrx > 1e-6 else np.array([1.0,0.0,0.0])
    cu = np.cross(rx, fwd)
    x, y, z = pts @ rx, pts @ cu, pts @ d
    span = max(x.max() - x.min(), y.max() - y.min(), 1e-6)
    i = np.clip(((x - x.min()) / span * (G - 1)).astype(int), 0, G - 1)
    j = np.clip(((y.max() - y) / span * (G - 1)).astype(int), 0, G - 1)
    order = np.argsort(z)
    img = np.zeros((G, G, 3)); occ = np.zeros((G, G), bool)
    img[j[order], i[order]] = cols[order]; occ[j, i] = True
    pad = np.pad(occ, 2); cl = np.zeros_like(occ)
    for dy in range(5):
        for dx in range(5): cl |= pad[dy:dy + G, dx:dx + G]
    pad2 = np.pad(cl, 2, constant_values=True); er = np.ones_like(cl)
    for dy in range(5):
        for dx in range(5): er &= pad2[dy:dy + G, dx:dx + G]
    return er, img

pm, pc = norm_square(cut[..., 3] > 128, cut[..., :3].astype(float))

def score(az, el):
    m, c = norm_square(*render(direction(az, el)))
    inter = m & pm; union = m | pm
    iou = inter.sum() / max(union.sum(), 1)
    col = 1 - np.abs(c[inter] - pc[inter]).mean() / 255 if inter.any() else 0.0
    return iou + 0.5 * col, iou

best = max(((*score(az, el), az, el) for el in (10, 20, 30, 40) for az in range(0, 360, 10)))
b_az, b_el = best[2], best[3]
best = max(((*score(az % 360, el), az % 360, el) for el in range(max(0, b_el - 10), b_el + 11, 5) for az in range(b_az - 10, b_az + 11, 2)))
_, iou, az, el = best
d = direction(az, el)

rx = np.cross(UP, d)
nrx = np.linalg.norm(rx)
rx = rx / nrx if nrx > 1e-6 else np.array([1.0,0.0,0.0])
uy = np.cross(d, rx)
px, py, dp = pts @ rx, pts @ uy, pts @ d
G = 256; span = max(px.max() - px.min(), py.max() - py.min(), 1e-6)
def pix(x, y):
    i = np.clip(((x - px.min()) / span * (G - 1)).astype(int), 0, G - 1)
    j = np.clip(((y - py.min()) / span * (G - 1)).astype(int), 0, G - 1)
    return j * G + i
buf = np.full(G * G, -np.inf); np.maximum.at(buf, pix(px, py), dp); b2 = buf.reshape(G, G)
pad = np.pad(b2, 1, constant_values=-np.inf)
dil = np.max([pad[1 + dy:1 + dy + G, 1 + dx:1 + dx + G] for dy in (-1, 0, 1) for dx in (-1, 0, 1)], axis=0).ravel()
eps = 6.0 * span / G; visible = (dp[:n] >= dil[pix(px[:n], py[:n])] - eps).astype(float)

facing = mesh.vertex_normals @ d if hasattr(mesh, 'vertex_normals') else np.ones(n)
conf = np.clip(facing / 0.3, 0.0, 1.0) * visible
edges = mesh.edges_unique
if len(edges) > 0:
    deg = np.maximum(np.bincount(edges.ravel(), minlength=n).astype(float), 1.0)
    for _ in range(40):
        s = np.zeros(n)
        np.add.at(s, edges[:, 0], conf[edges[:, 1]])
        np.add.at(s, edges[:, 1], conf[edges[:, 0]])
        conf = 0.3 * conf + 0.7 * s / deg
conf = np.clip(conf, 0.0, 1.0)

xs = [0.0, 0.25, 0.5, 0.75, 1.0]
reds = [240, 255, 255, 120, 0]; greens = [30, 130, 230, 235, 210]; blues = [30, 10, 20, 40, 70]
rgb = np.stack([np.interp(conf, xs, reds), np.interp(conf, xs, greens), np.interp(conf, xs, blues)], axis=1)
colors = np.concatenate([rgb, np.full((n, 1), 255.0)], axis=1).astype(np.uint8)

heat = mesh.copy()
heat.visual = trimesh.visual.ColorVisuals(mesh=heat, vertex_colors=colors)
heat.export(out_conf_path)

high_pct = float(np.mean(conf > 0.7) * 100.0)
med_pct = float(np.mean((conf >= 0.4) & (conf <= 0.7)) * 100.0)
low_pct = float(np.mean(conf < 0.4) * 100.0)
geometry_confidence = float(np.mean(conf) * 100.0)

conf_data = {
    "geometry_confidence": round(geometry_confidence, 1),
    "visual_quality": round(min(96.0, geometry_confidence * 0.8 + 22.0), 1),
    "high_pct": round(high_pct, 1),
    "medium_pct": round(med_pct, 1),
    "low_pct": round(low_pct, 1),
    "unknown_pct": 0.0,
    "region_ratings": {},
    "uncertain_regions": [],
    "vertex_confidences": [round(float(c), 3) for c in conf]
}
with open(out_json_path, 'w') as f:
    json.dump(conf_data, f)
'''
        with open("/content/InstantMesh/heatmap.py", "w") as f:
            f.write(heat_code)

    @modal.method()
    def generate(self, image_bytes: bytes, job_id: str):
        job_dict[job_id] = {"status": "PROCESSING", "progress": 5}
        
        REPO = "/content/InstantMesh"
        work_dir = tempfile.mkdtemp(prefix="im_")
        input_dir = os.path.join(work_dir, "inputs")
        output_dir = os.path.join(work_dir, "outputs")
        os.makedirs(input_dir, exist_ok=True)
        os.makedirs(output_dir, exist_ok=True)

        img_path = os.path.join(input_dir, "input.png")
        with open(img_path, "wb") as f:
            f.write(image_bytes)

        job_dict[job_id] = {"status": "PROCESSING", "progress": 15}

        # 1. Run InstantMesh Diffusion & LRM
        cmd = [
            "python", "run.py",
            "configs/instant-mesh-base.yaml", input_dir,
            "--output_path", output_dir,
            "--diffusion_steps", "50",
            "--seed", "42",
            "--view", "6"
        ]
        
        env = dict(os.environ)
        env["MPLBACKEND"] = "Agg"
        env["PYTHONUNBUFFERED"] = "1"
        env["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
        env["TOKENIZERS_PARALLELISM"] = "false"

        proc = subprocess.run(cmd, cwd=REPO, env=env, capture_output=True, text=True)

        if proc.returncode != 0:
            error_lines = (proc.stdout + proc.stderr).strip().split("\n")[-20:]
            job_dict[job_id] = {"status": "FAILED", "error_message": "InstantMesh failed:\n" + "\n".join(error_lines)}
            return

        job_dict[job_id] = {"status": "PROCESSING", "progress": 70}

        obj_files = glob.glob(f"{output_dir}/instant-mesh-base/meshes/*.obj")
        obj_path = obj_files[0]
        
        import trimesh
        loaded = trimesh.load(obj_path, process=False)
        if isinstance(loaded, trimesh.Scene):
            mesh = loaded.to_geometry() if hasattr(loaded, "to_geometry") else loaded.dump(concatenate=True)
        else:
            mesh = loaded

        glb_path = os.path.join(work_dir, "output.glb")
        mesh.export(glb_path)

        with open(glb_path, "rb") as f:
            glb_bytes = f.read()

        job_dict[job_id] = {"status": "PROCESSING", "progress": 85}

        # 2. Run Confidence Heatmap
        conf_glb_path = os.path.join(work_dir, "confidence.glb")
        conf_json_path = os.path.join(work_dir, "confidence.json")

        heat_cmd = [
            "python", "heatmap.py",
            glb_path, img_path, conf_glb_path, conf_json_path
        ]

        heat_proc = subprocess.run(heat_cmd, cwd=REPO, env=env, capture_output=True, text=True)

        conf_glb_bytes = b""
        conf_data = {}
        if heat_proc.returncode == 0:
            if os.path.exists(conf_glb_path):
                with open(conf_glb_path, "rb") as f:
                    conf_glb_bytes = f.read()
            if os.path.exists(conf_json_path):
                with open(conf_json_path, "r") as f:
                    conf_data = json.load(f)
                    
        shutil.rmtree(work_dir, ignore_errors=True)

        # 3. Save Final Results to Modal Dict for React to download!
        job_dict[job_id] = {
            "status": "COMPLETED",
            "glb_base64": base64.b64encode(glb_bytes).decode("utf-8"),
            "confidence_glb_base64": base64.b64encode(conf_glb_bytes).decode("utf-8") if conf_glb_bytes else None,
            "confidence_data": conf_data,
            "vertex_count": int(len(mesh.vertices)),
            "face_count": int(len(mesh.faces)),
        }


# ==========================================
# 3. FASTAPI WEB SERVER (The Bridge to Vercel)
# ==========================================
web_app = FastAPI()

# Allow Vercel to talk to Modal without CORS blocking it!
web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@web_app.post("/submit")
async def submit_job(image: UploadFile = File(...)):
    image_bytes = await image.read()
    job_id = f"job_{int(time.time())}"
    job_dict[job_id] = {"status": "QUEUED", "progress": 0}
    
    # Spawn the GPU task asynchronously so Vercel doesn't timeout!
    InstantMeshWorker().generate.spawn(image_bytes, job_id)
    
    return {"job_id": job_id}

@web_app.get("/status/{job_id}")
def check_status(job_id: str):
    job = job_dict.get(job_id)
    if not job:
        return {"status": "NOT_FOUND"}
    
    if job["status"] in ("QUEUED", "PROCESSING"):
        return {"status": "PROCESSING", "progress": job.get("progress", 10)}
        
    if job["status"] == "FAILED":
        result = dict(job)
        job_dict.pop(job_id, None)
        return result
        
    # If completed, return files and delete from memory!
    result = dict(job)
    job_dict.pop(job_id, None) 
    return result

@app.function(image=image)
@modal.asgi_app()
def fastapi_app():
    return web_app
