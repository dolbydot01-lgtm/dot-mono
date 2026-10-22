"use client";

import type { AnalysisResult } from "@/lib/generated/analysis-result";

type Report = AnalysisResult["report"];

function SkeletonLine({ width }: { width: string }) {
  return <div className="shimmer h-3 rounded-full" style={{ width }} />;
}

function PendingReport() {
  return (
    <div>
      <div className="flex items-center gap-2 text-[0.62rem] font-bold tracking-[0.12em] text-[var(--aqua)] uppercase">
        <span className="pulse-dot" /> coach is writing
      </div>
      <div className="mt-5 space-y-3">
        <SkeletonLine width="100%" />
        <SkeletonLine width="93%" />
        <SkeletonLine width="78%" />
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {[0, 1].map((index) => (
          <div key={index} className="panel-quiet p-4">
            <SkeletonLine width="45%" />
            <div className="mt-3 space-y-2">
              <SkeletonLine width="100%" />
              <SkeletonLine width="82%" />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-[var(--muted)]">
        The measured faults and exercise list are ready. The written review is being generated
        from those findings and will appear here automatically.
      </p>
    </div>
  );
}

export default function ReportPanel({
  report,
  onRetry,
  retrying,
}: {
  report: Report;
  onRetry: () => void;
  retrying: boolean;
}) {
  const isPending = report.status === "pending" || report.status === "generating";
  const isFailed = report.status === "failed";
  const providerLabel =
    report.provider === "anthropic"
      ? `Claude${report.model ? ` · ${report.model}` : ""}`
      : report.provider === "template"
        ? "Local coaching template"
        : "Coach";

  return (
    <section className="panel p-5 sm:p-7" aria-labelledby="report-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Coach&apos;s read</p>
          <h2 id="report-heading" className="display mt-1 text-2xl font-extrabold">
            The review
          </h2>
        </div>
        <span className={`badge ${report.status === "generated" ? "badge-lime" : report.status === "failed" ? "badge-fail" : ""}`}>
          {isPending ? "generating" : report.status}
        </span>
      </div>

      {isPending ? <div className="mt-5"><PendingReport /></div> : null}

      {isFailed ? (
        <div className="mt-6 rounded-xl border border-[rgba(255,107,100,0.22)] bg-[rgba(255,107,100,0.055)] p-4">
          <p className="text-sm font-semibold">The written review did not finish.</p>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
            {report.error?.message || "The report provider returned an error. The measured findings below are still valid."}
          </p>
          <button type="button" className="button-secondary mt-4" onClick={onRetry} disabled={retrying}>
            {retrying ? "Retrying…" : "Try the review again"}
          </button>
        </div>
      ) : null}

      {!isPending && !isFailed ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="badge">{providerLabel}</span>
            <span className="badge">{report.status === "template" ? "grounded template" : "AI-assisted"}</span>
          </div>

          <p className="mt-5 max-w-3xl text-[0.95rem] leading-7 text-[var(--paper)]">
            {report.summary}
          </p>

          {report.strengths.length > 0 ? (
            <div className="mt-7">
              <p className="text-[0.58rem] font-bold tracking-[0.14em] text-[var(--aqua)] uppercase">
                Keep doing
              </p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {report.strengths.map((strength) => (
                  <div key={`${strength.title}-${strength.observation_ids.join("-")}`} className="rounded-xl border border-[rgba(99,228,198,0.16)] bg-[rgba(99,228,198,0.035)] p-3.5">
                    <p className="text-[0.78rem] font-semibold">{strength.title}</p>
                    <p className="mt-1 text-[0.7rem] leading-5 text-[var(--muted)]">{strength.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {report.priorities.length > 0 ? (
            <div className="mt-7">
              <p className="text-[0.58rem] font-bold tracking-[0.14em] text-[var(--coral)] uppercase">
                Focus order
              </p>
              <div className="mt-3 space-y-3">
                {report.priorities.map((priority, index) => (
                  <div key={`${priority.title}-${index}`} className="flex gap-3">
                    <span className="mono mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full border border-[rgba(255,129,102,0.28)] text-[0.6rem] text-[var(--coral)]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-[0.82rem] font-semibold">{priority.title}</p>
                      <p className="mt-1 text-[0.72rem] leading-5 text-[var(--muted)]">{priority.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {report.coaching_cues.length > 0 ? (
            <div className="mt-7">
              <p className="text-[0.58rem] font-bold tracking-[0.14em] text-[var(--lime)] uppercase">
                Cues for the next rep
              </p>
              <div className="mt-3 grid gap-2.5">
                {report.coaching_cues.map((cue, index) => (
                  <div key={`${cue.cue}-${index}`} className="rounded-xl border border-[var(--line)] bg-white/[0.02] p-3.5">
                    <p className="text-[0.8rem] font-medium leading-5">{cue.cue}</p>
                    <p className="mt-1.5 text-[0.63rem] leading-5 text-[var(--muted)]">{cue.when}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {report.limitations.length > 0 ? (
            <div className="mt-7 border-t border-[var(--line)] pt-4">
              <p className="text-[0.55rem] font-bold tracking-[0.13em] text-[var(--muted)] uppercase">
                Read with this context
              </p>
              <ul className="mt-2 space-y-1.5">
                {report.limitations.map((limitation) => (
                  <li key={limitation} className="flex gap-2 text-[0.66rem] leading-5 text-[var(--muted)]">
                    <span className="mt-[0.45rem] h-1 w-1 flex-none rounded-full bg-[var(--muted)]" />
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {report.status === "template" ? (
        <p className="mt-5 rounded-xl border border-[var(--line)] bg-white/[0.02] p-3 text-[0.63rem] leading-5 text-[var(--muted)]">
          This review was assembled locally from the measured rules. Set{" "}
          <span className="mono text-[var(--paper)]">ANTHROPIC_API_KEY</span> to enable an
          AI-written version.
        </p>
      ) : null}
    </section>
  );
}
