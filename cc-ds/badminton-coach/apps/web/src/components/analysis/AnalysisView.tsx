"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect } from "react";
import {
  ApiRequestError,
  getAnalysis,
  getResult,
  retryReport,
  type AnalysisSummary,
} from "@/lib/api";
import ProcessingView from "@/components/analysis/ProcessingView";
import QualityFailure from "@/components/results/QualityFailure";
import ResultsView from "@/components/results/ResultsView";

function ResultLoading() {
  return (
    <div className="space-y-4">
      <div className="panel p-6">
        <div className="shimmer h-3 w-24 rounded-full" />
        <div className="shimmer mt-4 h-12 w-2/3 rounded-xl" />
        <div className="shimmer mt-4 h-3 w-1/2 rounded-full" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="panel aspect-video p-3">
          <div className="shimmer h-full w-full rounded-xl" />
        </div>
        <div className="panel p-5">
          <div className="shimmer h-3 w-1/3 rounded-full" />
          <div className="shimmer mt-4 h-20 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div className="panel p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[rgba(255,107,100,0.3)] bg-[rgba(255,107,100,0.06)] text-[var(--danger)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 7v6M12 17v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M10.3 4.6 3.1 17a2 2 0 0 0 1.7 3h14.4a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </span>
      <h1 className="display mt-5 text-3xl font-extrabold">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {onRetry ? (
          <button type="button" className="button-secondary" onClick={onRetry}>
            Retry
          </button>
        ) : null}
        <Link href="/#upload" className="button-primary">
          New analysis
        </Link>
        <Link href="/analyses" className="button-secondary">
          History
        </Link>
      </div>
    </div>
  );
}

function FailedAnalysis({ analysis }: { analysis: AnalysisSummary }) {
  return (
    <ErrorPanel
      title="This analysis hit a snag"
      message={
        analysis.error?.message ||
        "The pipeline stopped before producing a result. Try the clip again or use a cleaner export."
      }
    />
  );
}

export default function AnalysisView({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => getAnalysis(id),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1500;
      if (data.status === "queued" || data.status === "processing") return 1500;
      if (data.report_status === "pending" || data.report_status === "generating") return 2500;
      return false;
    },
  });

  const analysis = statusQuery.data;
  const resultQuery = useQuery({
    queryKey: ["analysis-result", id],
    queryFn: () => getResult(id),
    enabled: analysis?.status === "completed",
    refetchInterval: (query) => {
      const reportStatus = query.state.data?.report.status;
      return reportStatus === "pending" || reportStatus === "generating" ? 2000 : false;
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => retryReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis", id] });
      queryClient.invalidateQueries({ queryKey: ["analysis-result", id] });
    },
  });

  const reportStatus = analysis?.report_status;
  useEffect(() => {
    if (analysis?.status === "completed") {
      queryClient.invalidateQueries({ queryKey: ["analysis-result", id] });
    }
  }, [analysis?.status, reportStatus, id, queryClient]);

  if (statusQuery.isLoading) {
    return <ResultLoading />;
  }

  if (statusQuery.isError) {
    const error = statusQuery.error;
    if (error instanceof ApiRequestError && error.status === 404) {
      return (
        <ErrorPanel
          title="Analysis not found"
          message="This session may have been deleted or the link is incomplete."
        />
      );
    }
    return (
      <ErrorPanel
        title="The analysis server is offline"
        message="Start the local API and worker, then retry this page."
        onRetry={() => statusQuery.refetch()}
      />
    );
  }

  if (!analysis) {
    return <ResultLoading />;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-[0.64rem] text-[var(--muted)]">
          <Link href="/analyses" className="font-bold tracking-[0.08em] uppercase hover:text-[var(--paper)]">
            ← History
          </Link>
          <span className="h-3 w-px bg-[var(--line-strong)]" />
          <span className="mono">{id.slice(0, 8)}</span>
        </div>
        <p className="mono text-[0.6rem] text-[var(--muted)]">
          {analysis.created_at
            ? new Intl.DateTimeFormat("en", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(analysis.created_at))
            : ""}
        </p>
      </div>

      {analysis.status === "failed" ? <FailedAnalysis analysis={analysis} /> : null}

      {analysis.status === "queued" || analysis.status === "processing" ? (
        <ProcessingView analysis={analysis} />
      ) : null}

      {analysis.status === "completed" ? (
        resultQuery.isLoading ? (
          <ResultLoading />
        ) : resultQuery.isError ? (
          <ErrorPanel
            title="Could not load the result"
            message="The result file may still be finishing. Retry in a moment."
            onRetry={() => resultQuery.refetch()}
          />
        ) : resultQuery.data ? (
          resultQuery.data.capture_quality.analyzable ? (
            <ResultsView
              result={resultQuery.data}
              onRetryReport={() => retryMutation.mutate()}
              retryingReport={retryMutation.isPending}
            />
          ) : (
            <QualityFailure result={resultQuery.data} />
          )
        ) : null
      ) : null}
    </div>
  );
}
