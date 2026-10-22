from __future__ import annotations

import numpy as np

from app.pipeline.subject import SelectedPose


def estimate_view(pose: SelectedPose) -> tuple[str, float]:
    """Estimate camera view from projected shoulder width relative to torso length."""
    shoulder_widths = np.abs(pose.keypoints[:, 5, 0] - pose.keypoints[:, 6, 0])
    left_shoulder = pose.keypoints[:, 5]
    right_shoulder = pose.keypoints[:, 6]
    shoulder_mid = (left_shoulder + right_shoulder) / 2.0
    hip_mid = (pose.keypoints[:, 11] + pose.keypoints[:, 12]) / 2.0
    torso_lengths = np.linalg.norm(shoulder_mid - hip_mid, axis=1)
    valid = (
        pose.usable[:, 5]
        & pose.usable[:, 6]
        & pose.usable[:, 11]
        & pose.usable[:, 12]
        & np.isfinite(shoulder_widths)
        & np.isfinite(torso_lengths)
        & (torso_lengths > 1.0)
    )
    if not np.any(valid):
        return "ambiguous", 0.0

    ratio = float(np.nanmedian(shoulder_widths[valid] / torso_lengths[valid]))
    if ratio > 0.55:
        estimate = "front"
        confidence = min(1.0, (ratio - 0.55) / 0.20 + 0.55)
    elif ratio < 0.35:
        estimate = "side"
        confidence = min(1.0, (0.35 - ratio) / 0.20 + 0.55)
    else:
        estimate = "ambiguous"
        confidence = 0.25
    return estimate, round(max(0.0, min(1.0, confidence)), 2)
