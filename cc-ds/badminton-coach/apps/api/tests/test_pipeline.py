from __future__ import annotations

from dataclasses import replace

import numpy as np

from app.contracts.analysis_result import CameraView, DominantHand
from app.pipeline.metrics import segment_movements
from app.pipeline.quality import assess_quality
from app.pipeline.smoothing import fill_short_gaps, smooth_series
from app.pipeline.subject import SelectedPose
from app.pipeline.view import estimate_view


def test_fill_short_gaps_only_closes_short_runs():
    values = np.array([1.0, np.nan, np.nan, np.nan, 5.0, np.nan, np.nan, np.nan, np.nan, np.nan, 9.0])
    valid = np.isfinite(values)
    filled, usable = fill_short_gaps(values, valid, max_gap=3)
    assert filled[1] == 2.0
    assert filled[3] == 4.0
    assert usable[1:4].all()
    assert np.isnan(filled[5])
    assert not usable[5:10].any()


def test_smooth_series_reduces_alternating_jitter():
    values = np.array([0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0])
    smoothed = smooth_series(values, np.ones(values.size, dtype=bool), fps=15)
    assert np.std(smoothed[2:]) < np.std(values[2:])


def test_fake_clip_produces_movement_episodes(sample_pose: SelectedPose):
    segmentation = segment_movements(
        sample_pose,
        view=CameraView.SIDE,
        dominant_hand=DominantHand.RIGHT,
        fps=15,
    )
    episode_types = {str(episode.type) for episode in segmentation.episodes}
    assert "overhead_motion" in episode_types
    assert "lunge" in episode_types
    assert "ready_stance" in episode_types
    assert all(episode.start_s < episode.end_s for episode in segmentation.episodes)


def test_quality_blocks_missing_athlete(sample_pose: SelectedPose, sample_info):
    broken = replace(
        sample_pose,
        coverage=0.0,
        mean_keypoint_confidence=0.1,
        bbox_height_ratio=0.1,
        multiple_people_ratio=0.5,
    )
    assessment = assess_quality(
        pose=broken,
        source_info=sample_info,
        blur=5.0,
        view="side",
        view_estimate="ambiguous",
        episode_count=0,
    )
    assert assessment.quality.analyzable is False
    assert assessment.quality.overall == "unusable"
    assert any(check.blocking and check.status == "fail" for check in assessment.quality.checks)


def test_quality_accepts_tracked_fake_athlete(sample_pose: SelectedPose, sample_info):
    assessment = assess_quality(
        pose=sample_pose,
        source_info=sample_info,
        blur=120.0,
        view="side",
        view_estimate="side",
        episode_count=3,
    )
    assert assessment.quality.analyzable is True
    assert assessment.quality.overall in {"good", "fair", "poor"}


def test_view_estimate_returns_known_label(sample_pose: SelectedPose):
    estimate, confidence = estimate_view(sample_pose)
    assert estimate in {"side", "front", "ambiguous"}
    assert 0.0 <= confidence <= 1.0
