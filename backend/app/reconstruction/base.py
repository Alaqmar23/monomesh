from abc import ABC, abstractmethod
from typing import List, Dict, Any, Callable, Optional

class ReconstructionEngine(ABC):
    @abstractmethod
    def is_available(self) -> bool:
        """Check if this engine's dependencies and hardware are available."""
        pass

    @abstractmethod
    def estimate_requirements(self) -> Dict[str, Any]:
        """Return memory, VRAM, and device requirements for this engine."""
        pass

    @abstractmethod
    def reconstruct(
        self,
        image_paths: List[str],
        config: Dict[str, Any],
        progress_callback: Optional[Callable[[str, int], None]] = None
    ) -> Dict[str, Any]:
        """
        Execute 3D reconstruction from sparse images.
        Must return dict with:
        - points: np.ndarray (N, 3)
        - colors: np.ndarray (N, 4)
        - mesh: trimesh.Trimesh
        - camera_poses: List[Dict]
        - processing_time: float
        - peak_memory_mb: float
        - engine_name: str
        """
        pass
