import sys
import platform
import shutil
import psutil
from typing import Dict, Any, Optional
from app.core.config import settings

def detect_hardware() -> Dict[str, Any]:
    """
    Detect real hardware, OS, CUDA, and memory capabilities.
    Zero fake metrics: returns factual system properties.
    """
    # CPU and RAM
    cpu_count = psutil.cpu_count(logical=True)
    cpu_percent = psutil.cpu_percent(interval=None)
    vm = psutil.virtual_memory()
    ram_total_gb = round(vm.total / (1024 ** 3), 2)
    ram_available_gb = round(vm.available / (1024 ** 3), 2)
    ram_used_gb = round(vm.used / (1024 ** 3), 2)
    ram_percent = vm.percent

    # Disk storage
    disk = shutil.disk_usage(str(settings.STORAGE_DIR))
    disk_total_gb = round(disk.total / (1024 ** 3), 2)
    disk_free_gb = round(disk.free / (1024 ** 3), 2)

    # PyTorch and CUDA
    torch_available = False
    torch_version = None
    cuda_available = False
    gpu_name = None
    vram_total_gb = 0.0
    vram_used_gb = 0.0
    vram_free_gb = 0.0
    device_count = 0

    try:
        import torch
        torch_available = True
        torch_version = torch.__version__
        cuda_available = torch.cuda.is_available()
        if cuda_available:
            device_count = torch.cuda.device_count()
            gpu_name = torch.cuda.get_device_name(0)
            props = torch.cuda.get_device_properties(0)
            vram_total_gb = round(props.total_memory / (1024 ** 3), 2)
            # Memory allocated vs reserved
            mem_allocated = torch.cuda.memory_allocated(0)
            mem_reserved = torch.cuda.memory_reserved(0)
            vram_used_gb = round(mem_reserved / (1024 ** 3), 2)
            vram_free_gb = round(max(0.0, vram_total_gb - vram_used_gb), 2)
    except Exception as e:
        pass

    # Detect 3D libraries
    open3d_available = False
    try:
        import open3d
        open3d_available = True
    except ImportError:
        pass

    trimesh_available = False
    try:
        import trimesh
        trimesh_available = True
    except ImportError:
        pass

    scipy_available = False
    try:
        import scipy
        scipy_available = True
    except ImportError:
        pass

    # Engine support assessment based on hardware
    engines = {
        "classical": {
            "name": "Classical Feature & Epipolar Stereo",
            "available": True,
            "min_vram_gb": 0.0,
            "device": "cpu/cuda",
            "description": "Robust feature matching, triangulation, Delaunay/Poisson meshing"
        },
        "vggt": {
            "name": "VGGT Geometric Reconstruction",
            "available": torch_available and cuda_available,
            "min_vram_gb": 3.5,
            "device": "cuda" if cuda_available else "cpu",
            "description": "Feed-forward visual geometry transformer for camera, depth, and point map estimation"
        },
        "hunyuan3d": {
            "name": "Hunyuan3D Generative Refinement",
            "available": cuda_available and vram_total_gb >= 8.0 and settings.ENABLE_HUNYUAN,
            "min_vram_gb": 8.0,
            "device": "cuda",
            "description": "Generative multi-view 3D synthesis (requires >= 8GB VRAM)"
        },
        "trellis": {
            "name": "TRELLIS Generative Refinement",
            "available": cuda_available and vram_total_gb >= 12.0 and settings.ENABLE_TRELLIS,
            "min_vram_gb": 12.0,
            "device": "cuda",
            "description": "High-resolution 3D asset generation (requires >= 12GB VRAM)"
        }
    }

    # Recommended engine based on hardware
    if cuda_available and vram_total_gb >= 3.5:
        recommended_engine = "vggt"
    else:
        recommended_engine = "classical"

    return {
        "status": "online",
        "platform": {
            "system": platform.system(),
            "release": platform.release(),
            "python": platform.python_version(),
            "architecture": platform.machine()
        },
        "cpu": {
            "cores": cpu_count,
            "usage_percent": cpu_percent
        },
        "ram": {
            "total_gb": ram_total_gb,
            "used_gb": ram_used_gb,
            "available_gb": ram_available_gb,
            "usage_percent": ram_percent
        },
        "storage": {
            "total_gb": disk_total_gb,
            "free_gb": disk_free_gb,
            "healthy": disk_free_gb > 2.0
        },
        "gpu": {
            "cuda_available": cuda_available,
            "device_count": device_count,
            "name": gpu_name if cuda_available else "CPU (No discrete GPU active)",
            "vram_total_gb": vram_total_gb,
            "vram_used_gb": vram_used_gb,
            "vram_free_gb": vram_free_gb,
            "torch_version": torch_version
        },
        "libraries": {
            "torch": torch_available,
            "trimesh": trimesh_available,
            "open3d": open3d_available,
            "scipy": scipy_available
        },
        "engines": engines,
        "recommended_engine": recommended_engine
    }
