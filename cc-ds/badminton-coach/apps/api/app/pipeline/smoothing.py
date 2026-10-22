from __future__ import annotations

import math

import numpy as np


def _alpha(cutoff: float, dt: float) -> float:
    tau = 1.0 / (2.0 * math.pi * cutoff)
    return 1.0 / (1.0 + tau / dt)


class _LowPass:
    def __init__(self, alpha: float) -> None:
        self.alpha = alpha
        self.value: float | None = None

    def filter(self, value: float, alpha: float | None = None) -> float:
        use_alpha = self.alpha if alpha is None else alpha
        if self.value is None:
            self.value = value
        else:
            self.value = use_alpha * value + (1.0 - use_alpha) * self.value
        return self.value

    def reset(self) -> None:
        self.value = None


class OneEuroFilter:
    """Casiez et al. One Euro filter, used independently for x and y."""

    def __init__(
        self,
        *,
        min_cutoff: float = 1.0,
        beta: float = 0.05,
        derivative_cutoff: float = 1.0,
    ) -> None:
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.derivative_cutoff = derivative_cutoff
        self._x = _LowPass(_alpha(min_cutoff, 1 / 30))
        self._dx = _LowPass(_alpha(derivative_cutoff, 1 / 30))
        self._previous: float | None = None

    def filter(self, value: float, dt: float) -> float:
        if not math.isfinite(value):
            self.reset()
            return value
        derivative = 0.0 if self._previous is None else (value - self._previous) / dt
        derivative_hat = self._dx.filter(derivative, _alpha(self.derivative_cutoff, dt))
        cutoff = self.min_cutoff + self.beta * abs(derivative_hat)
        result = self._x.filter(value, _alpha(cutoff, dt))
        self._previous = value
        return result

    def reset(self) -> None:
        self._x.reset()
        self._dx.reset()
        self._previous = None


def fill_short_gaps(values: np.ndarray, valid: np.ndarray, max_gap: int = 5) -> tuple[np.ndarray, np.ndarray]:
    """Linearly fill short missing runs. Returns filled values and a usability mask."""
    result = np.asarray(values, dtype=np.float64).copy()
    usable = np.asarray(valid, dtype=bool) & np.isfinite(result)
    indices = np.flatnonzero(usable)
    if len(indices) < 2:
        return result, usable

    for left, right in zip(indices[:-1], indices[1:], strict=False):
        gap = int(right - left - 1)
        if gap <= 0 or gap > max_gap:
            continue
        start_value = result[left]
        end_value = result[right]
        for offset in range(1, gap + 1):
            fraction = offset / (gap + 1)
            result[left + offset] = start_value + (end_value - start_value) * fraction
            usable[left + offset] = True
    return result, usable


def smooth_series(values: np.ndarray, valid: np.ndarray, fps: float) -> np.ndarray:
    """One Euro smoothing with a reset across unsmoothed long gaps."""
    result = np.asarray(values, dtype=np.float64).copy()
    if fps <= 0:
        return result
    filter_x = OneEuroFilter()
    for index, value in enumerate(result):
        if not valid[index] or not math.isfinite(value):
            result[index] = np.nan
            filter_x.reset()
            continue
        result[index] = filter_x.filter(float(value), 1.0 / fps)
    return result


def smooth_keypoints(
    keypoints: np.ndarray,
    observed: np.ndarray,
    *,
    fps: float,
    max_gap: int = 5,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Smooth x/y while retaining confidence and tracking interpolated points."""
    count, joints = observed.shape
    smoothed = np.full((count, joints, 2), np.nan, dtype=np.float32)
    usable = np.zeros((count, joints), dtype=bool)

    for joint in range(joints):
        for coordinate in range(2):
            series = keypoints[:, joint, coordinate].astype(np.float64)
            filled, joint_usable = fill_short_gaps(series, observed[:, joint], max_gap=max_gap)
            filtered = smooth_series(filled, joint_usable, fps)
            smoothed[:, joint, coordinate] = filtered
            if coordinate == 0:
                usable[:, joint] = joint_usable
            else:
                usable[:, joint] &= joint_usable

    return smoothed, usable, observed
