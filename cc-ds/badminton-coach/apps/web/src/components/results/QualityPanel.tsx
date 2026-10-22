import type { AnalysisResult } from "@/lib/generated/analysis-result";
import { qualityTone } from "@/lib/format";

type Quality = AnalysisResult["capture_quality"];
type QualityCheck = Quality["checks"][number];

function StatusIcon({ status }: { status: string }) {
  if (status === "pass") {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-[var(--aqua)]">
        <path d="m3.2 8.3 3.1 3.1 6.5-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "warn") {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-[var(--amber)]">
        <path d="M8 5.4v3.5M8 11.4v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-[var(--danger)]">
      <path d="m5 5 6 6M11 5l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function valueLabel(check: QualityCheck): string {
  if (check.value == null) return "";
  if (typeof check.value === "number") {
    const unit = check.unit && check.unit !== "frame height" ? ` ${check.unit}` : "";
    return `${Number.isInteger(check.value) ? check.value : check.value.toFixed(1)}${unit}`;
  }
  return check.value;
}

function CheckRow({ check }: { check: QualityCheck }) {
  const tone =
    check.status === "pass" ? "border-white/[0.06]" : check.status === "warn" ? "border-[rgba(245,196,91,0.16)]" : "border-[rgba(255,107,100,0.18)]";
  return (
    <div className={`flex items-start gap-2.5 border-b py-2.5 last:border-b-0 ${tone}`}>
      <span className="mt-0.5">
        <StatusIcon status={check.status} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-[0.72rem] font-semibold text-[var(--paper)]">{check.label}</p>
          <span className="mono text-[0.58rem] text-[var(--muted)]">{valueLabel(check)}</span>
        </div>
        <p className="mt-0.5 text-[0.64rem] leading-relaxed text-[var(--muted)]">{check.message}</p>
      </div>
    </div>
  );
}

export default function QualityPanel({ quality, full = false }: { quality: Quality; full?: boolean }) {
  const issues = quality.checks.filter((check) => check.status !== "pass");
  const visible = full ? quality.checks : issues.length ? issues : quality.checks.slice(0, 3);

  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="quality-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Capture quality</p>
          <h2 id="quality-heading" className="display mt-1 text-xl font-extrabold">
            What the camera allowed
          </h2>
        </div>
        <span className={`badge ${qualityTone(quality.overall)}`}>{quality.overall}</span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="score-ring" style={{ "--score": quality.score } as React.CSSProperties}>
          <span className="text-center">
            <span className="mono block text-lg font-semibold">{quality.score}</span>
            <span className="block text-[0.5rem] font-bold tracking-[0.1em] text-[var(--muted)] uppercase">score</span>
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {quality.checks.filter((check) => check.status === "pass").length} of {quality.checks.length} checks
            passed.
          </p>
          <p className="mt-1 text-[0.68rem] leading-relaxed text-[var(--muted)]">
            {quality.analyzable
              ? "The clip is usable. Lower-quality checks make individual measurements less certain."
              : "One or more blocking checks failed, so a reliable review cannot be produced."}
          </p>
        </div>
      </div>

      <div className="mt-4">
        {visible.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </div>

      {!full && issues.length > 0 && issues.length < quality.checks.length ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-[0.64rem] font-bold tracking-[0.09em] text-[var(--muted)] uppercase hover:text-[var(--paper)]">
            Show all {quality.checks.length} checks
          </summary>
          <div className="mt-2">
            {quality.checks.map((check) => (
              <CheckRow key={check.id} check={check} />
            ))}
          </div>
        </details>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-4">
        <div>
          <p className="text-[0.54rem] font-bold tracking-[0.12em] text-[var(--muted)] uppercase">Track coverage</p>
          <p className="mono mt-1 text-[0.72rem]">{Math.round(quality.subject.detection_coverage * 100)}%</p>
        </div>
        <div>
          <p className="text-[0.54rem] font-bold tracking-[0.12em] text-[var(--muted)] uppercase">Pose confidence</p>
          <p className="mono mt-1 text-[0.72rem]">{quality.subject.mean_keypoint_confidence.toFixed(2)}</p>
        </div>
      </div>
    </section>
  );
}
