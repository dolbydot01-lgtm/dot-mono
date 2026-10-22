from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import numpy as np

from app.pipeline.media import MediaInfo

COCO_KEYPOINT_NAMES = (
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
)

LEFT_RIGHT_PAIRS = (
    (1, 2),
    (3, 4),
    (5, 6),
    (7, 8),
    (9, 10),
    (11, 12),
    (13, 14),
    (15, 16),
)

KEYPOINT_INDEX = {name: index for index, name in enumerate(COCO_KEYPOINT_NAMES)}


@dataclass
class PoseDetection:
    keypoints: np.ndarray  # (17, 3): x, y, confidence
    bbox: tuple[float, float, float, float]
    score: float = 0.0
    track_id: int | None = None


@dataclass
class PoseFrame:
    frame_index: int
    timestamp_s: float
    detections: list[PoseDetection]


@dataclass
class PoseSequence:
    frames: list[PoseFrame]
    width: int
    height: int
    fps: float
    backend: str
    model: str
    device: str


class PoseBackend(Protocol):
    name: str
    model_name: str
    device: str

    def extract(self, video_path: Path, info: MediaInfo, *, fps: int) -> PoseSequence: ...
