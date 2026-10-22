from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from app.pipeline.media import MediaError, MediaInfo
from app.pipeline.pose.base import PoseBackend, PoseDetection, PoseFrame, PoseSequence


def _select_device(preference: str) -> str:
    if preference and preference != "auto":
        return preference
    try:
        import torch

        if torch.backends.mps.is_available():
            return "mps"
        if torch.cuda.is_available():
            return "cuda"
    except Exception:
        pass
    return "cpu"


def _to_numpy(value: Any) -> np.ndarray:
    if value is None:
        return np.empty((0,))
    if hasattr(value, "cpu"):
        value = value.cpu()
    if hasattr(value, "numpy"):
        value = value.numpy()
    return np.asarray(value)


class UltralyticsPoseBackend(PoseBackend):
    name = "ultralytics"

    def __init__(self, model_name: str, device: str = "auto", confidence: float = 0.25) -> None:
        self.model_name = model_name
        self.confidence = confidence
        self.device = _select_device(device)

    def extract(self, video_path: Path, info: MediaInfo, *, fps: int) -> PoseSequence:
        try:
            from ultralytics import YOLO
        except ImportError as exc:
            raise MediaError(
                "POSE_BACKEND_MISSING",
                "The YOLO pose backend is not installed. Run `uv sync` in apps/api.",
            ) from exc

        try:
            model = YOLO(self.model_name)
            results = model.track(
                source=str(video_path),
                stream=True,
                persist=True,
                tracker="bytetrack.yaml",
                conf=self.confidence,
                iou=0.5,
                imgsz=640,
                device=self.device,
                verbose=False,
            )

            frames: list[PoseFrame] = []
            for index, result in enumerate(results):
                detections: list[PoseDetection] = []
                boxes = getattr(result, "boxes", None)
                keypoints = getattr(result, "keypoints", None)

                if boxes is not None and keypoints is not None and len(boxes) > 0:
                    xyxy = _to_numpy(boxes.xyxy)
                    scores = _to_numpy(boxes.conf).reshape(-1)
                    ids = _to_numpy(boxes.id).reshape(-1) if boxes.id is not None else None
                    kp_xy = _to_numpy(keypoints.xy)
                    kp_conf = _to_numpy(keypoints.conf)

                    for person_index in range(len(xyxy)):
                        if person_index >= len(kp_xy):
                            continue
                        xy = kp_xy[person_index]
                        conf = (
                            kp_conf[person_index]
                            if person_index < len(kp_conf)
                            else np.ones(len(xy), dtype=np.float32)
                        )
                        pose = np.concatenate(
                            [
                                np.asarray(xy, dtype=np.float32),
                                np.asarray(conf, dtype=np.float32).reshape(-1, 1),
                            ],
                            axis=1,
                        )
                        track_id = (
                            int(ids[person_index])
                            if ids is not None and person_index < len(ids) and np.isfinite(ids[person_index])
                            else None
                        )
                        detections.append(
                            PoseDetection(
                                keypoints=pose,
                                bbox=tuple(float(v) for v in xyxy[person_index]),
                                score=float(scores[person_index]) if person_index < len(scores) else 0.0,
                                track_id=track_id,
                            )
                        )

                frames.append(
                    PoseFrame(
                        frame_index=index,
                        timestamp_s=index / fps,
                        detections=detections,
                    )
                )
        except MediaError:
            raise
        except Exception as exc:
            message = str(exc)
            if "Download failure" in message or "Connection" in message or "timed out" in message:
                raise MediaError(
                    "POSE_MODEL_UNAVAILABLE",
                    "The YOLO pose weights could not be downloaded. Check network access or set POSE_MODEL "
                    "to a local .pt file, then retry the analysis.",
                    retryable=True,
                ) from exc
            raise MediaError(
                "POSE_FAILED",
                "Pose tracking failed while processing this clip. Try a clearer, full-body clip.",
                retryable=True,
            ) from exc

        if not frames:
            raise MediaError("NO_FRAMES", "No video frames were available for pose tracking.")

        return PoseSequence(
            frames=frames,
            width=info.width,
            height=info.height,
            fps=float(fps),
            backend=self.name,
            model=self.model_name,
            device=self.device,
        )
