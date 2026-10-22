from __future__ import annotations

from app.config import Settings
from app.pipeline.pose.base import PoseBackend
from app.pipeline.pose.fake_backend import FakePoseBackend
from app.pipeline.pose.ultralytics_backend import UltralyticsPoseBackend


def create_pose_backend(settings: Settings) -> PoseBackend:
    backend = settings.pose_backend.strip().lower()
    if backend == "fake":
        return FakePoseBackend()
    if backend == "ultralytics":
        return UltralyticsPoseBackend(
            model_name=settings.pose_model,
            device=settings.pose_device,
            confidence=settings.pose_confidence,
        )
    raise ValueError(f"Unknown POSE_BACKEND: {settings.pose_backend}")
