"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { listAnalyses, type AnalysisSummary } from "@/lib/api";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function label(item: AnalysisSummary) {
  if (item.status === "queued") return "Queued";
  if (item.status === "processing") return "Analyzing";
  if (item.status === "failed") return "Failed";
  if (item.report_status === "pending" || item.report_status === "generating") return "Writing review";
  if (item.quality?.overall) return `${item.quality.overall} capture`;
  return "Complete";
}

function tone(item: AnalysisSummary) {
  if (item.status === "failed") return "badge-fail";
  if (item.status !== "completed") return "badge-warn";
  if (item.quality?.overall === "good" || item.quality?.overall === "fair") return "badge-pass";
  return "badge-warn";
}

export default function HistoryView() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["analyses"],
    queryFn: listAnalyses,
    refetchInterval: (query) =>
      query.state.data?.items.some((item) => item.status !== "completed" && item.status !== "failed")
        ? 2500
        : false,
  });

  if (isLoading) {
    return (
      <div className="grid gap-3">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="panel-quiet h-24 p-5">
            <div className="shimmer h-3 w-1/4 rounded-full" />
            <div className="shimmer mt-4 h-4 w-1/2 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="panel p-8 text-center">
        <p className="eyebrow">Connection</p>
        <h2 className="display mt-2 text-2xl font-extrabold">The analysis server is offline</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
          Start the local stack with <span className="mono text-[var(--paper)]">npm run dev</span> and
          try again.
        </p>
        <button type="button" className="button-secondary mt-5" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const items = data?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="panel flex flex-col items-center px-6 py-16 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full border border-[var(--line-strong)] bg-white/[0.03] text-[var(--aqua)]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 4.5h14M5 9h14M7 4.5v15M17 4.5v15M5 14h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </span>
        <h2 className="display mt-5 text-2xl font-extrabold">The shelf is empty</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
          Upload your first technique clip to start building a movement history.
        </p>
        <Link href="/#upload" className="button-primary mt-6">
          Analyze a clip
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)]">
      <div className="hidden grid-cols-[1.6fr_0.7fr_0.7fr_0.7fr_2.2rem] gap-4 border-b border-[var(--line)] bg-white/[0.025] px-5 py-3 text-[0.6rem] font-bold tracking-[0.12em] text-[var(--muted)] uppercase md:grid">
        <span>Clip</span>
        <span>Captured</span>
        <span>View</span>
        <span>Status</span>
        <span />
      </div>
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/analyses/${item.id}`}
          className="group grid gap-3 border-b border-[var(--line)] px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.025] md:grid-cols-[1.6fr_0.7fr_0.7fr_0.7fr_2.2rem] md:items-center md:gap-4"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{item.original_filename || "Technique clip"}</p>
            <p className="mono mt-1 text-[0.6rem] text-[var(--muted)]">
              {item.duration_s ? `${item.duration_s.toFixed(1)}s` : "duration pending"} ·{" "}
              {item.dominant_hand}-handed
            </p>
          </div>
          <div className="text-[0.7rem] text-[var(--muted)]">
            <span className="mr-1.5 text-[0.6rem] uppercase md:hidden">Captured</span>
            {formatDate(item.created_at)}
          </div>
          <div className="text-[0.7rem] text-[var(--muted)]">
            <span className="mr-1.5 text-[0.6rem] uppercase md:hidden">View</span>
            {item.view}
          </div>
          <div>
            <span className={`badge ${tone(item)}`}>{label(item)}</span>
          </div>
          <span className="hidden h-8 w-8 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] transition-colors group-hover:border-[var(--aqua)] group-hover:text-[var(--aqua)] md:grid">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
      ))}
    </div>
  );
}
