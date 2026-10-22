"""Versioned result contract shared by the Python pipeline and the web app."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid", use_enum_values=True)


class CameraView(StrEnum):
    SIDE = "side"
    FRONT = "front"


class DominantHand(StrEnum):
    LEFT = "left"
    RIGHT = "right"


class MetricUnit(StrEnum):
    DEG = "deg"
    RATIO = "ratio"
    TORSO = "torso_len"
    TORSO_PER_SECOND = "torso_len_per_s"
    SECONDS = "s"
    PIXELS = "px"
    COUNT = "count"


class Reliability(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class EpisodeType(StrEnum):
    OVERHEAD_MOTION = "overhead_motion"
    LUNGE = "lunge"
    READY_STANCE = "ready_stance"


class Severity(StrEnum):
    MAJOR = "major"
    MINOR = "minor"
    INFO = "info"


class QualityStatus(StrEnum):
    PASS = "pass"
    WARN = "warn"
    FAIL = "fail"


class QualityOverall(StrEnum):
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    UNUSABLE = "unusable"


class FaultCode(StrEnum):
    READY_KNEES_TOO_STRAIGHT = "READY_KNEES_TOO_STRAIGHT"
    READY_STANCE_NARROW = "READY_STANCE_NARROW"
    READY_STANCE_ASYMMETRIC = "READY_STANCE_ASYMMETRIC"
    LUNGE_SHALLOW = "LUNGE_SHALLOW"
    LUNGE_TRUNK_LEAN_EXCESSIVE = "LUNGE_TRUNK_LEAN_EXCESSIVE"
    LUNGE_KNEE_TRACKS_INWARD = "LUNGE_KNEE_TRACKS_INWARD"
    OVERHEAD_LOW_REACH = "OVERHEAD_LOW_REACH"
    OVERHEAD_ELBOW_BENT = "OVERHEAD_ELBOW_BENT"
    BALANCE_OUTSIDE_BASE = "BALANCE_OUTSIDE_BASE"


class ObservationKind(StrEnum):
    STRENGTH = "strength"
    NEUTRAL = "neutral"


class ReportStatus(StrEnum):
    PENDING = "pending"
    GENERATING = "generating"
    GENERATED = "generated"
    TEMPLATE = "template"
    FAILED = "failed"
    SKIPPED = "skipped"


class ReportProvider(StrEnum):
    ANTHROPIC = "anthropic"
    TEMPLATE = "template"


class PipelineInfo(ContractModel):
    version: str
    rules_version: str
    pose_backend: str
    pose_model: str
    analysis_fps: int
    device: str


class SourceInfo(ContractModel):
    duration_s: float
    width: int
    height: int
    fps_native: float
    fps_analysis: int
    view: CameraView
    view_source: str = "user"
    view_estimate: str | None = None
    dominant_hand: DominantHand
    mirrored: bool
    frame_count: int


class QualityCheck(ContractModel):
    id: str
    label: str
    status: QualityStatus
    value: float | str | None
    unit: str | None
    threshold: str | None
    message: str
    blocking: bool = False


class SubjectQuality(ContractModel):
    track_id: int | None
    detection_coverage: float
    mean_keypoint_confidence: float
    bbox_height_ratio: float
    multiple_people_detected: bool
    multiple_people_frame_ratio: float


class CaptureQuality(ContractModel):
    overall: QualityOverall
    analyzable: bool
    score: int = Field(ge=0, le=100)
    checks: list[QualityCheck]
    subject: SubjectQuality
    limitations: list[str]


class Metric(ContractModel):
    key: str
    label: str
    value: float | None
    unit: MetricUnit
    view: CameraView | str
    valid: bool
    reliability: Reliability
    n_frames: int


class Episode(ContractModel):
    id: str
    type: EpisodeType
    label: str
    start_s: float
    end_s: float
    key_frame_s: float
    start_frame: int
    end_frame: int
    confidence: float = Field(ge=0, le=1)
    lead_side: str | None
    metrics: list[Metric]


class FaultEvidence(ContractModel):
    metric_key: str
    observed_value: float
    unit: MetricUnit
    threshold_value: float | str
    comparator: str
    view_requirements: list[CameraView]
    frame_count: int
    min_keypoint_confidence: float


class FaultTimeRange(ContractModel):
    start_s: float
    end_s: float


class Fault(ContractModel):
    id: str
    code: FaultCode
    title: str
    category: str
    severity: Severity
    confidence: float = Field(ge=0, le=1)
    reliability: Reliability
    episode_id: str | None
    time_range: FaultTimeRange
    evidence_frames: list[int]
    evidence: FaultEvidence
    description: str
    cue: str


class Observation(ContractModel):
    id: str
    kind: ObservationKind
    title: str
    detail: str
    episode_id: str | None = None
    fault_code: FaultCode | None = None


class Artifacts(ContractModel):
    annotated_video_url: str | None
    thumbnail_url: str | None
    pose_data_url: str | None = None


class ReportError(ContractModel):
    code: str
    message: str


class ReportStrength(ContractModel):
    title: str
    detail: str
    observation_ids: list[str]


class ReportPriority(ContractModel):
    title: str
    detail: str
    fault_ids: list[str]


class ReportCue(ContractModel):
    cue: str
    when: str
    fault_ids: list[str]


class ReportExercisePlanItem(ContractModel):
    exercise_id: str
    focus: str
    related_fault_ids: list[str]


class ReportDraft(ContractModel):
    """Narrow schema requested from the language model."""

    summary: str
    strengths: list[ReportStrength]
    priorities: list[ReportPriority]
    coaching_cues: list[ReportCue]
    exercise_plan: list[ReportExercisePlanItem]
    limitations: list[str]


class ExercisePrescription(ContractModel):
    exercise_id: str
    name: str
    focus: str
    dosage: str
    equipment: str
    instructions: list[str]
    safety_note: str
    related_fault_ids: list[str]


class CoachingReport(ContractModel):
    status: ReportStatus
    provider: ReportProvider | None
    model: str | None
    generated_at: str | None
    summary: str | None
    strengths: list[ReportStrength]
    priorities: list[ReportPriority]
    coaching_cues: list[ReportCue]
    exercise_plan: list[ExercisePrescription]
    limitations: list[str]
    disclaimer: str
    error: ReportError | None = None


class AnalysisResult(ContractModel):
    schema_version: str = "1.0"
    analysis_id: str
    created_at: str
    pipeline: PipelineInfo
    source: SourceInfo
    capture_quality: CaptureQuality
    episodes: list[Episode]
    metrics: list[Metric]
    faults: list[Fault]
    observations: list[Observation]
    artifacts: Artifacts
    report: CoachingReport
    disclaimer: str
