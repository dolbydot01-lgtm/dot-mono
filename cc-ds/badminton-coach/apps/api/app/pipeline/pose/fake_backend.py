"""Deterministic pose source for API tests and UI development.

The fake athlete follows a ready stance, a lunge, and an overhead motion. It
exercises the whole pipeline without requiring model weights or a real video.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from app.pipeline.media import MediaInfo
from app.pipeline.pose.base import PoseBackend, PoseDetection, PoseFrame, PoseSequence


def _kp(x: float, y: float, confidence: float = 0.92) -> list[float]:
    return [x, y, confidence]


def _build_keypoints(width: float, height: float, phase: str, t: float) -> np.ndarray:
    """Return 17 COCO keypoints in pixels for one synthetic athlete frame."""
    cx = width * 0.5
    shoulder_y = height * 0.32
    hip_y = height * 0.55
    head_y = height * 0.18
    left_shoulder = (cx - width * 0.095, shoulder_y)
    right_shoulder = (cx + width * 0.095, shoulder_y)
    left_hip = (cx - width * 0.07, hip_y)
    right_hip = (cx + width * 0.07, hip_y)

    # The synthetic ready stance deliberately keeps the knees a little too
    # straight, so the demo exercises a real fault rule end-to-end.
    left_knee = (cx - width * 0.09, height * 0.72)
    left_ankle = (cx - width * 0.10, height * 0.90)
    right_knee = (cx + width * 0.09, height * 0.72)
    right_ankle = (cx + width * 0.10, height * 0.90)
    left_elbow = (cx - width * 0.15, height * 0.45)
    left_wrist = (cx - width * 0.17, height * 0.58)
    right_elbow = (cx + width * 0.15, height * 0.45)
    right_wrist = (cx + width * 0.17, height * 0.58)

    if phase == "lunge":
        # Lead with the right leg, keeping the knee tracking over the foot.
        left_hip = (cx - width * 0.035, height * 0.58)
        right_hip = (cx + width * 0.035, height * 0.58)
        right_knee = (cx + width * 0.18, height * 0.70)
        right_ankle = (cx + width * 0.24, height * 0.90)
        left_knee = (cx - width * 0.13, height * 0.74)
        left_ankle = (cx - width * 0.13, height * 0.91)
        left_elbow = (cx - width * 0.18, height * 0.43)
        left_wrist = (cx - width * 0.25, height * 0.36)
        right_elbow = (cx + width * 0.15, height * 0.47)
        right_wrist = (cx + width * 0.20, height * 0.57)
    elif phase == "overhead":
        # Racket arm reaches high with a near-straight elbow.
        right_elbow = (cx + width * 0.16, height * 0.20)
        right_wrist = (cx + width * 0.20, height * 0.08)
        left_elbow = (cx - width * 0.13, height * 0.42)
        left_wrist = (cx - width * 0.18, height * 0.34)

    keypoints = np.zeros((17, 3), dtype=np.float32)
    keypoints[0] = _kp(cx, head_y)
    keypoints[1] = _kp(cx - width * 0.018, head_y - height * 0.008)
    keypoints[2] = _kp(cx + width * 0.018, head_y - height * 0.008)
    keypoints[3] = _kp(cx - width * 0.035, head_y)
    keypoints[4] = _kp(cx + width * 0.035, head_y)
    keypoints[5] = _kp(*left_shoulder)
    keypoints[6] = _kp(*right_shoulder)
    keypoints[7] = _kp(*left_elbow)
    keypoints[8] = _kp(*right_elbow)
    keypoints[9] = _kp(*left_wrist)
    keypoints[10] = _kp(*right_wrist)
    keypoints[11] = _kp(*left_hip)
    keypoints[12] = _kp(*right_hip)
    keypoints[13] = _kp(*left_knee)
    keypoints[14] = _kp(*right_knee)
    keypoints[15] = _kp(*left_ankle)
    keypoints[16] = _kp(*right_ankle)

    # A tiny amount of coordinated sway keeps the smoothing path realistic.
    sway = np.sin(t * 2.1) * width * 0.0018
    keypoints[:, 0] += sway
    return keypoints


def _phase_for_progress(progress: float) -> str:
    if 0.28 <= progress < 0.50:
        return "lunge"
    if 0.62 <= progress < 0.86:
        return "overhead"
    if progress < 0.28 or progress >= 0.92:
        return "ready"
    return "neutral"


class FakePoseBackend(PoseBackend):
    name = "fake"
    model_name = "synthetic-athlete"
    device = "cpu"

    def extract(self, video_path: Path, info: MediaInfo, *, fps: int) -> PoseSequence:
        del video_path
        width = float(info.width)
        height = float(info.height)
        duration = max(info.duration_s, 1.0)
        count = max(1, int(round(duration * fps)))
        frames: list[PoseFrame] = []

        for index in range(count):
            progress = index / max(1, count - 1)
            keypoints = _build_keypoints(width, height, _phase_for_progress(progress), progress * 8)
            valid = keypoints[keypoints[:, 2] > 0]
            x1, y1 = valid[:, 0].min() - width * 0.04, valid[:, 1].min() - height * 0.02
            x2, y2 = valid[:, 0].max() + width * 0.04, valid[:, 1].max() + height * 0.02
            bbox = (
                max(0.0, float(x1)),
                max(0.0, float(y1)),
                min(width, float(x2)),
                min(height, float(y2)),
            )
            frames.append(
                PoseFrame(
                    frame_index=index,
                    timestamp_s=index / fps,
                    detections=[
                        PoseDetection(
                            keypoints=keypoints,
                            bbox=bbox,
                            score=0.95,
                            track_id=1,
                        )
                    ],
                )
            )

        return PoseSequence(
            frames=frames,
            width=info.width,
            height=info.height,
            fps=float(fps),
            backend=self.name,
            model=self.model_name,
            device=self.device,
        )
