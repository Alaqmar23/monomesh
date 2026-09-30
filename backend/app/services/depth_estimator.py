"""
Real monocular depth estimation using MiDaS (Intel ISL).
Uses DPT-Hybrid for balance between quality and VRAM usage on RTX 3050 4GB.
"""
import torch
import cv2
import numpy as np
from pathlib import Path
from typing import Optional
from app.core.logging import logger

_model = None
_transform = None
_device = None


def _load_model():
    """Lazy-load MiDaS DPT-Hybrid model. Downloads ~120MB on first run."""
    global _model, _transform, _device

    if _model is not None:
        return

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Loading MiDaS DPT-Hybrid on {_device}...")

    # Use torch.hub to download MiDaS
    _model = torch.hub.load("intel-isl/MiDaS", "DPT_Hybrid", trust_repo=True)
    _model.to(_device)
    _model.eval()

    # Load the matching transform
    midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms", trust_repo=True)
    _transform = midas_transforms.dpt_transform

    if _device.type == "cuda":
        torch.cuda.empty_cache()

    logger.info("MiDaS DPT-Hybrid loaded successfully.")


def estimate_depth(image_bgr: np.ndarray) -> np.ndarray:
    """
    Estimate relative depth from a single BGR image.
    Returns a float32 depth map (H, W) where higher = farther.
    Values are normalized to [0, 1] range.
    """
    _load_model()

    rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    input_batch = _transform(rgb).to(_device)

    with torch.no_grad():
        if _device.type == "cuda":
            with torch.cuda.amp.autocast():
                prediction = _model(input_batch)
        else:
            prediction = _model(input_batch)

    # Resize prediction to original image size
    prediction = torch.nn.functional.interpolate(
        prediction.unsqueeze(1),
        size=image_bgr.shape[:2],
        mode="bicubic",
        align_corners=False,
    ).squeeze()

    depth = prediction.cpu().numpy()

    # MiDaS outputs inverse depth (close = high value). Invert so close = low.
    # Normalize to [0, 1]
    depth_min = depth.min()
    depth_max = depth.max()
    if depth_max - depth_min > 1e-6:
        depth = (depth - depth_min) / (depth_max - depth_min)
    else:
        depth = np.zeros_like(depth)

    if _device.type == "cuda":
        torch.cuda.empty_cache()

    return depth.astype(np.float32)


def unload_model():
    """Free GPU memory by unloading the model."""
    global _model, _transform, _device
    if _model is not None:
        del _model
        _model = None
        _transform = None
        if _device and _device.type == "cuda":
            torch.cuda.empty_cache()
        logger.info("MiDaS model unloaded.")
