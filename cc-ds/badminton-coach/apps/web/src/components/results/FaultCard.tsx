"use client";

import type { AnalysisResult } from "@/lib/generated/analysis-result";
import {
  comparisonLabel,
  confidencePercent,
  formatTimestamp,
  formatValue,
  metricLabel,
  severityTone,
} from "@/lib/format";

type Fault = AnalysisResult["faults"][number];

function severityBadge(severity: string) {
  if (severity === "major") return "badge-fail";
  if (severity === "minor") return "badge-warn";
  return "badge-pass";
}

export default function FaultCard({
  fault,
  onSeek,
  occurrences = [],
}: {
  fault: Fault;
  onSeek: (time: number) => void;
  occurrences?: number[];
}) {
  const threshold =
    typeof fault.evidence.threshold_value === "number"
      ? formatValue(fault.evidence.threshold_value, fault.evidence.unit)
      : String(fault.evidence.threshold_value);
  const confidence = confidencePercent(fault.confidence);

  return (
    <article className={`fault-card ${severityTone(fault.severity)} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${severityBadge(fault.severity)}`}>{fault.severity}</span>
          <span className="badge">{fault.reliability} reliability</span>
        </div>
        <button
          type="button"
          onClick={() => onSeek(fault.time_range.start_s)}
          className="text-[0.62rem] font-bold tracking-[0.08em] text-[var(--aqua)] uppercase hover:text-[var(--lime)]"
        >
          Replay {formatTimestamp(fault.time_range.start_s)} ↗
        </button>
      </div>

      <h3 className="mt-4 text-lg font-bold leading-snug">{fault.title}</h3>
      <p className="mt-2 text-[0.78rem] leading-6 text-[var(--muted)]">{fault.description}</p>

      {occurrences.length > 0 ? (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.62rem] text-[var(--muted)]">
          Also detected at
          {occurrences.map((time) => (
            <button
              key={`${fault.id}-${time}`}
              type="button"
              className="mono text-[var(--aqua)] underline decoration-[rgba(99,228,198,0.35)] underline-offset-2 hover:text-[var(--lime)]"
              onClick={() => onSeek(time)}
            >
              {formatTimestamp(time)}
            </button>
          ))}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-[var(--line)] bg-black/15 p-3">
        <div>
          <p className="text-[0.52rem] font-bold tracking-[0.12em] text-[var(--muted)] uppercase">Observed</p>
          <p className="mono mt-1 text-base text-[var(--paper)]">
            {formatValue(fault.evidence.observed_value, fault.evidence.unit)}
          </p>
        </div>
        <span className="mono text-[0.68rem] text-[var(--muted)]">
          {comparisonLabel(fault.evidence.comparator)}
        </span>
        <div className="text-right">
          <p className="text-[0.52rem] font-bold tracking-[0.12em] text-[var(--muted)] uppercase">Guide</p>
          <p className="mono mt-1 text-base text-[var(--paper)]">{threshold}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[0.58rem] text-[var(--muted)]">
        <span>{metricLabel(fault.evidence.metric_key)}</span>
        <span className="mono">{fault.evidence.frame_count} frames</span>
      </div>

      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full bg-[var(--lime)]" style={{ width: confidence }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[0.56rem] text-[var(--muted)]">
        <span>Rule confidence</span>
        <span className="mono">{confidence}</span>
      </div>

      <div className="mt-4 border-t border-[var(--line)] pt-4">
        <p className="text-[0.55rem] font-bold tracking-[0.12em] text-[var(--lime)] uppercase">Coaching cue</p>
        <p className="mt-1.5 text-[0.76rem] leading-5 text-[var(--paper)]">{fault.cue}</p>
      </div>

      {fault.reliability === "low" ? (
        <p className="mt-3 text-[0.6rem] leading-relaxed text-[var(--amber)]">
          Treat this as a possible pattern. The pose evidence was less certain in this clip.
        </p>
      ) : null}
    </article>
  );
}
