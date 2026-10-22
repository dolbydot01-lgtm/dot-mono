export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return minutes > 0 ? `${minutes}:${String(remainder).padStart(2, "0")}` : `${remainder}s`;
}

export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, seconds);
  const minutes = Math.floor(total / 60);
  const remainder = Math.floor(total % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function formatValue(value: number, unit: string | null | undefined): string {
  if (!Number.isFinite(value)) return "—";
  switch (unit) {
    case "deg":
      return `${Math.round(value)}°`;
    case "ratio":
      return value.toFixed(2);
    case "torso_len":
      return `${value.toFixed(2)} torso`;
    case "torso_len_per_s":
      return `${value.toFixed(2)} torso/s`;
    case "s":
      return `${value.toFixed(1)}s`;
    case "count":
      return `${Math.round(value)}`;
    default:
      return value.toFixed(2);
  }
}

export function comparisonLabel(comparator: string | null | undefined): string {
  switch (comparator) {
    case "gt":
      return ">";
    case "gte":
      return "≥";
    case "lt":
      return "<";
    case "lte":
      return "≤";
    default:
      return "vs";
  }
}

export function metricLabel(key: string): string {
  const labels: Record<string, string> = {
    peak_wrist_height: "Peak racket-hand height",
    elbow_angle_at_peak: "Elbow angle at peak",
    arm_elevation_at_peak: "Arm elevation at peak",
    lead_knee_min_angle: "Lead knee depth",
    trunk_lean_at_deepest: "Torso lean at deepest lunge",
    knee_ankle_alignment_ratio: "Knee tracking over foot",
    com_beyond_front_ankle: "Hip position vs front foot",
    ready_knee_angle: "Ready-stance knee bend",
    ready_stance_width_ratio: "Stance width vs shoulders",
    ready_knee_asymmetry: "Left/right knee difference",
    episode_duration: "Episode duration",
    lunge_duration: "Lunge duration",
  };
  return labels[key] ?? key.replaceAll("_", " ");
}

export function confidencePercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function qualityTone(overall: string | null | undefined): "badge-pass" | "badge-warn" | "badge-fail" | "" {
  if (overall === "good" || overall === "fair") return "badge-pass";
  if (overall === "poor") return "badge-warn";
  if (overall === "unusable") return "badge-fail";
  return "";
}

export function severityTone(severity: string): "fault-major" | "fault-minor" | "fault-info" {
  if (severity === "major") return "fault-major";
  if (severity === "minor") return "fault-minor";
  return "fault-info";
}
