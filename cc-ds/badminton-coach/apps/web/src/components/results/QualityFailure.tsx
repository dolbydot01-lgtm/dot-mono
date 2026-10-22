import Link from "next/link";
import type { AnalysisResult } from "@/lib/generated/analysis-result";
import QualityPanel from "./QualityPanel";

export default function QualityFailure({ result }: { result: AnalysisResult }) {
  const blocking = result.capture_quality.checks.filter(
    (check) => check.blocking && check.status === "fail",
  );
  const issues = blocking.length
    ? blocking
    : result.capture_quality.checks.filter((check) => check.status === "fail");

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="panel relative overflow-hidden p-6 sm:p-8">
        <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full border border-[rgba(255,107,100,0.18)]" />
        <div className="absolute -right-10 -top-16 h-52 w-52 rounded-full border border-[rgba(255,107,100,0.12)]" />

        <span className="badge badge-fail">Clip not analyzable</span>
        <h1 className="display mt-5 max-w-lg text-4xl font-extrabold leading-[0.95] sm:text-5xl">
          The camera didn&apos;t give us a fair read.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--muted)]">
          The clip was processed, but one or more blocking quality checks failed. Rather than
          invent a review, the app stopped here. Re-record with these fixes and try again.
        </p>

        <div className="mt-7 space-y-2.5">
          {issues.map((issue) => (
            <div key={issue.id} className="rounded-xl border border-[rgba(255,107,100,0.18)] bg-[rgba(255,107,100,0.045)] p-4">
              <p className="text-sm font-semibold">{issue.label}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{issue.message}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 grid gap-2 border-t border-[var(--line)] pt-5 sm:grid-cols-3">
          {[
            ["Track coverage", `${Math.round(result.capture_quality.subject.detection_coverage * 100)}%`],
            ["Pose confidence", result.capture_quality.subject.mean_keypoint_confidence.toFixed(2)],
            ["Frame size", `${Math.round(result.capture_quality.subject.bbox_height_ratio * 100)}%`],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[0.54rem] font-bold tracking-[0.12em] text-[var(--muted)] uppercase">{label}</p>
              <p className="mono mt-1.5 text-sm">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/#upload" className="button-primary">
            Record another clip
          </Link>
          <Link href="/analyses" className="button-secondary">
            Analysis history
          </Link>
        </div>
      </section>

      <QualityPanel quality={result.capture_quality} full />
    </div>
  );
}
