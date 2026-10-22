"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { listAnalyses, type AnalysisSummary } from "@/lib/api";

function formatDate(value: string | null) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(item: AnalysisSummary) {
  if (item.status === "failed") return "Failed";
  if (item.status !== "completed") return "Processing";
  if (item.quality?.overall) {
    return `${item.quality.overall} capture`;
  }
  return item.report_status === "pending" || item.report_status === "generating"
    ? "Writing review"
    : "Complete";
}

function statusTone(item: AnalysisSummary) {
  if (item.status === "failed") return "badge-fail";
  if (item.status !== "completed") return "badge-warn";
  if (item.quality?.overall === "good" || item.quality?.overall === "fair") return "badge-pass";
  return "badge-warn";
}

export default function RecentAnalyses() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analyses"],
    queryFn: listAnalyses,
  });

  const items = data?.items?.slice(0, 4) ?? [];

  return (
    <section className="mt-20" aria-labelledby="recent-heading">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Recent work</p>
          <h2 id="recent-heading" className="display mt-1 text-2xl font-extrabold sm:text-3xl">
            Your analysis shelf
          </h2>
        </div>
        <Link href="/analyses" className="text-[0.68rem] font-bold tracking-[0.1em] text-[var(--muted)] uppercase hover:text-[var(--paper)]">
          View all →
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((index) => (
            <div key={index} className="panel-quiet h-[5.7rem] p-4">
              <div className="shimmer h-3 w-1/3 rounded-full" />
              <div className="shimmer mt-3 h-3 w-2/3 rounded-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="panel-quiet p-4 text-xs text-[var(--muted)]">
          The analysis server is not reachable. Start the API and worker with <span className="mono text-[var(--paper)]">npm run dev</span>.
        </div>
      ) : items.length === 0 ? (
        <div className="panel-quiet flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
          <p className="max-w-md text-sm leading-relaxed text-[var(--muted)]">
            No clips yet. Upload a ready stance, lunge, or overhead movement to begin.
          </p>
          <Link href="/#upload" className="button-secondary">
            Upload first clip
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/analyses/${item.id}`}
              className="panel-quiet group flex items-center justify-between gap-4 p-4 transition-colors hover:border-[var(--line-strong)]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`badge ${statusTone(item)}`}>{statusLabel(item)}</span>
                  <span className="mono text-[0.58rem] text-[var(--muted)]">
                    {item.duration_s ? `${item.duration_s.toFixed(0)}s` : "—"}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-semibold">
                  {item.original_filename || "Technique clip"}
                </p>
                <p className="mt-1 text-[0.65rem] text-[var(--muted)]">
                  {formatDate(item.created_at)} · {item.view} view
                </p>
              </div>
              <span className="grid h-8 w-8 flex-none place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] transition-colors group-hover:border-[var(--aqua)] group-hover:text-[var(--aqua)]">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
