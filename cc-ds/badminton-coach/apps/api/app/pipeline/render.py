from __future__ import annotations

import subprocess
from collections.abc import Callable
from pathlib import Path

import cv2
import numpy as np

from app.contracts.analysis_result import Episode, Fault
from app.pipeline.media import MediaError
from app.pipeline.subject import SelectedPose

SKELETON = (
    (5, 6),
    (5, 7),
    (7, 9),
    (6, 8),
    (8, 10),
    (5, 11),
    (6, 12),
    (11, 12),
    (11, 13),
    (13, 15),
    (12, 14),
    (14, 16),
    (5, 0),
    (6, 0),
)

RIGHT_ARM = {6, 8, 10}
LEFT_ARM = {5, 7, 9}

COLOR_SKELETON = (235, 235, 235)
COLOR_RIGHT = (72, 214, 255)
COLOR_LEFT = (112, 210, 128)
COLOR_JOINT = (255, 255, 255)
COLOR_TEXT = (255, 255, 255)
COLOR_BAD = (86, 86, 240)


def _dominant_colors(dominant_hand: str) -> tuple[tuple[int, int, int], tuple[int, int, int]]:
    if dominant_hand == "left":
        return COLOR_LEFT, COLOR_RIGHT
    return COLOR_RIGHT, COLOR_LEFT


def _active_items(
    timestamp: float,
    episodes: list[Episode],
    faults: list[Fault],
) -> tuple[list[Episode], list[Fault]]:
    active_episodes = [
        episode for episode in episodes if episode.start_s <= timestamp <= episode.end_s
    ]
    active_faults = [
        fault
        for fault in faults
        if fault.time_range.start_s <= timestamp <= fault.time_range.end_s
    ]
    return active_episodes, active_faults


def _draw_overlay(
    frame: np.ndarray,
    pose: SelectedPose,
    frame_index: int,
    timestamp: float,
    episodes: list[Episode],
    faults: list[Fault],
    dominant_hand: str,
    duration: float,
) -> np.ndarray:
    height, width = frame.shape[:2]
    scale = max(0.45, min(1.0, width / 1280.0))
    dominant_color, support_color = _dominant_colors(dominant_hand)

    if frame_index < len(pose.keypoints):
        keypoints = pose.keypoints[frame_index]
        usable = pose.usable[frame_index]
        for first, second in SKELETON:
            if first >= len(keypoints) or second >= len(keypoints):
                continue
            if not (usable[first] and usable[second]):
                continue
            point_a, point_b = keypoints[first], keypoints[second]
            if not (np.isfinite(point_a).all() and np.isfinite(point_b).all()):
                continue
            if first in RIGHT_ARM or second in RIGHT_ARM:
                color = dominant_color if dominant_hand == "right" else support_color
            elif first in LEFT_ARM or second in LEFT_ARM:
                color = dominant_color if dominant_hand == "left" else support_color
            else:
                color = COLOR_SKELETON
            cv2.line(
                frame,
                (int(point_a[0]), int(point_a[1])),
                (int(point_b[0]), int(point_b[1])),
                color,
                max(2, int(3 * scale)),
                cv2.LINE_AA,
            )
        for index in range(min(17, len(keypoints))):
            if not usable[index]:
                continue
            point = keypoints[index]
            if not np.isfinite(point).all():
                continue
            radius = max(3, int(4 * scale))
            cv2.circle(
                frame,
                (int(point[0]), int(point[1])),
                radius,
                COLOR_JOINT,
                -1,
                cv2.LINE_AA,
            )

    active_episodes, active_faults = _active_items(timestamp, episodes, faults)
    text_scale = max(0.5, 0.55 * scale)
    label_parts = [episode.label for episode in active_episodes[:2]]
    if label_parts:
        label_height = max(30, int(36 * scale))
        cv2.rectangle(
            frame,
            (14, 14),
            (min(width - 14, 14 + int(380 * scale)), 14 + label_height),
            (20, 24, 30),
            -1,
        )
        cv2.putText(
            frame,
            " | ".join(label_parts),
            (24, 14 + int(label_height * 0.68)),
            cv2.FONT_HERSHEY_SIMPLEX,
            text_scale,
            COLOR_TEXT,
            max(1, int(1.2 * scale)),
            cv2.LINE_AA,
        )

    if active_faults:
        worst = active_faults[0]
        label = worst.title
        label_height = max(40, int(54 * scale))
        cv2.rectangle(
            frame,
            (14, height - label_height),
            (min(width - 14, 14 + int(620 * scale)), height - 14),
            (25, 25, 40),
            -1,
        )
        cv2.putText(
            frame,
            label[:72],
            (24, height - int(label_height * 0.42)),
            cv2.FONT_HERSHEY_SIMPLEX,
            text_scale,
            COLOR_BAD,
            max(1, int(1.2 * scale)),
            cv2.LINE_AA,
        )

    bar_y = height - 8
    cv2.line(frame, (14, bar_y), (width - 14, bar_y), (60, 60, 60), 2)
    if duration > 0:
        for fault in faults:
            x1 = 14 + int((width - 28) * max(0.0, fault.time_range.start_s / duration))
            x2 = 14 + int((width - 28) * min(1.0, fault.time_range.end_s / duration))
            cv2.line(frame, (x1, bar_y), (max(x1 + 3, x2), bar_y), COLOR_BAD, 3)
        playhead = 14 + int((width - 28) * min(1.0, max(0.0, timestamp / duration)))
        cv2.circle(frame, (playhead, bar_y), 5, (255, 255, 255), -1, cv2.LINE_AA)

    return frame


def _thumbnail_frame(
    pose: SelectedPose,
    faults: list[Fault],
    episodes: list[Episode],
) -> int:
    if faults:
        fault = faults[0]
        episode = next((item for item in episodes if item.id == fault.episode_id), None)
        if episode is not None:
            return int(round(episode.key_frame_s * pose.fps))
        if fault.evidence_frames:
            return int(fault.evidence_frames[0])
    if episodes:
        return int(round(episodes[0].key_frame_s * pose.fps))
    present = np.flatnonzero(pose.present)
    return int(present[0]) if present.size else 0


def render_annotated_video(
    *,
    source_video: Path,
    output_video: Path,
    thumbnail_path: Path,
    pose: SelectedPose,
    episodes: list[Episode],
    faults: list[Fault],
    dominant_hand: str,
    duration: float,
    progress_callback: Callable[[float], None] | None = None,
) -> None:
    capture = cv2.VideoCapture(str(source_video))
    if not capture.isOpened():
        raise MediaError("RENDER_FAILED", "The normalized video could not be opened for rendering.")

    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or pose.width)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or pose.height)
    width -= width % 2
    height -= height % 2
    fps = pose.fps
    output_video.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_video.with_suffix(".tmp.mp4")
    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "bgr24",
        "-s",
        f"{width}x{height}",
        "-r",
        f"{fps:g}",
        "-i",
        "-",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "22",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(temporary),
    ]
    process = subprocess.Popen(
        command,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    thumbnail_index = _thumbnail_frame(pose, faults, episodes)
    saved_thumbnail = False
    frame_index = 0
    try:
        while True:
            ok, frame = capture.read()
            if not ok or frame is None:
                break
            if frame.shape[1] != width or frame.shape[0] != height:
                frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
            timestamp = frame_index / fps
            rendered = _draw_overlay(
                frame,
                pose,
                frame_index,
                timestamp,
                episodes,
                faults,
                dominant_hand,
                duration,
            )
            if frame_index == thumbnail_index and not saved_thumbnail:
                thumbnail_path.parent.mkdir(parents=True, exist_ok=True)
                cv2.imwrite(str(thumbnail_path), rendered, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
                saved_thumbnail = True
            if process.stdin is None:
                raise MediaError("RENDER_FAILED", "The video encoder stopped unexpectedly.")
            process.stdin.write(rendered.tobytes())
            frame_index += 1
            if progress_callback and frame_index % 15 == 0:
                progress_callback(frame_index)
    finally:
        capture.release()
        if process.stdin is not None:
            process.stdin.close()
        stderr = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
        return_code = process.wait(timeout=120)
        if return_code != 0:
            temporary.unlink(missing_ok=True)
            raise MediaError("RENDER_FAILED", f"Video rendering failed. {stderr[:300]}")

    if not saved_thumbnail:
        capture = cv2.VideoCapture(str(source_video))
        ok, frame = capture.read()
        capture.release()
        if ok and frame is not None:
            cv2.imwrite(str(thumbnail_path), frame, [int(cv2.IMWRITE_JPEG_QUALITY), 88])

    temporary.replace(output_video)
