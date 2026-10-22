from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from fractions import Fraction
from pathlib import Path

import cv2


class MediaError(Exception):
    def __init__(self, code: str, message: str, *, retryable: bool = False) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable


@dataclass(frozen=True)
class MediaInfo:
    duration_s: float
    width: int
    height: int
    fps: float
    frame_count: int
    codec: str
    has_audio: bool


def _parse_rate(value: str | None) -> float:
    if not value:
        return 0.0
    try:
        return float(Fraction(value))
    except (ValueError, ZeroDivisionError):
        return 0.0


def ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def probe_media(path: Path) -> MediaInfo:
    if not ffmpeg_available():
        raise MediaError("FFMPEG_MISSING", "ffmpeg and ffprobe are required for video analysis.")

    command = [
        "ffprobe",
        "-v",
        "error",
        "-show_streams",
        "-show_format",
        "-of",
        "json",
        str(path),
    ]
    try:
        completed = subprocess.run(command, capture_output=True, text=True, timeout=60, check=False)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise MediaError("PROBE_FAILED", "The video could not be inspected.") from exc

    if completed.returncode != 0:
        raise MediaError(
            "INVALID_VIDEO",
            "The file could not be decoded as a video. Try exporting it as MP4 (H.264).",
        )

    payload = json.loads(completed.stdout or "{}")
    streams = payload.get("streams", [])
    video = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
    if video is None:
        raise MediaError("NO_VIDEO_STREAM", "The uploaded file does not contain a video stream.")

    width = int(video.get("width") or 0)
    height = int(video.get("height") or 0)
    fps = _parse_rate(video.get("avg_frame_rate")) or _parse_rate(video.get("r_frame_rate"))

    duration = 0.0
    for value in (payload.get("format", {}).get("duration"), video.get("duration")):
        try:
            duration = float(value)
        except (TypeError, ValueError):
            continue
        if duration > 0:
            break

    frame_count = int(video.get("nb_frames") or 0)
    if frame_count <= 0 and duration > 0 and fps > 0:
        frame_count = int(round(duration * fps))

    if duration <= 0 or fps <= 0:
        capture = cv2.VideoCapture(str(path))
        if not capture.isOpened():
            raise MediaError("INVALID_VIDEO", "The video could not be opened for analysis.")
        fps = fps or float(capture.get(cv2.CAP_PROP_FPS) or 0)
        frame_count = frame_count or int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        if duration <= 0 and fps > 0 and frame_count > 0:
            duration = frame_count / fps
        capture.release()

    if width <= 0 or height <= 0 or duration <= 0 or fps <= 0:
        raise MediaError("INVALID_VIDEO", "The video metadata is incomplete or unsupported.")

    has_audio = any(stream.get("codec_type") == "audio" for stream in streams)
    return MediaInfo(
        duration_s=duration,
        width=width,
        height=height,
        fps=fps,
        frame_count=frame_count,
        codec=str(video.get("codec_name") or "unknown"),
        has_audio=has_audio,
    )


def validate_source(info: MediaInfo) -> None:
    if info.duration_s < 5:
        raise MediaError("VIDEO_TOO_SHORT", "Use a clip between 10 and 60 seconds.")
    if info.duration_s > 65:
        raise MediaError("VIDEO_TOO_LONG", "Use a clip between 10 and 60 seconds.")
    if info.height < 360:
        raise MediaError("VIDEO_TOO_SMALL", "Use a clip that is at least 360p tall.")
    if info.fps < 15:
        raise MediaError("VIDEO_FPS_LOW", "Use a clip recorded at 15 fps or higher.")


def normalize_video(source: Path, destination: Path, *, max_width: int, fps: int) -> MediaInfo:
    if not ffmpeg_available():
        raise MediaError("FFMPEG_MISSING", "ffmpeg and ffprobe are required for video analysis.")

    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(".tmp.mp4")
    scale_filter = (
        f"scale=w='trunc(min({max_width},iw)/2)*2':h=-2,fps={fps},format=yuv420p"
    )
    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(source),
        "-map",
        "0:v:0",
        "-map_metadata",
        "-1",
        "-an",
        "-vf",
        scale_filter,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-movflags",
        "+faststart",
        str(temporary),
    ]
    try:
        completed = subprocess.run(command, capture_output=True, text=True, timeout=300, check=False)
    except (OSError, subprocess.TimeoutExpired) as exc:
        temporary.unlink(missing_ok=True)
        raise MediaError("NORMALIZE_FAILED", "The video could not be prepared for analysis.") from exc

    if completed.returncode != 0:
        temporary.unlink(missing_ok=True)
        raise MediaError(
            "NORMALIZE_FAILED",
            "The video could not be prepared for analysis. Try a standard MP4 export.",
        )

    temporary.replace(destination)
    return probe_media(destination)


def extract_frame(video_path: Path, timestamp_s: float, destination: Path) -> None:
    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-ss",
        f"{max(0.0, timestamp_s):.3f}",
        "-i",
        str(video_path),
        "-frames:v",
        "1",
        "-q:v",
        "3",
        str(destination),
    ]
    subprocess.run(command, capture_output=True, text=True, timeout=60, check=False)
