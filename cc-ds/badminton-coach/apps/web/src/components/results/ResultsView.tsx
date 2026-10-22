"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { thumbnailUrl, videoUrl } from "@/lib/api";
import type { AnalysisResult } from "@/lib/generated/analysis-result";
import { formatDuration, formatTimestamp, qualityTone } from "@/lib/format";
import ExercisePlan from "./ExercisePlan";
import FaultCard from "./FaultCard";
import IssueTimeline from "./IssueTimeline";
import QualityPanel from "./QualityPanel";
import ReportPanel from "./ReportPanel";

type Fault = AnalysisResult["faults"][number];

function resultTitle(faultCount: number, episodeCount: number) {
  if (episodeCount === 0) return "No movement episodes found";
  if (faultCount === 0) return "The movement holds up";
  if (faultCount === 1) return "One pattern to sharpen";
  return `${faultCount} patterns to sharpen`;
}

export default function ResultsView({
  result,
  onRetryReport,
  retryingReport,
}: {
  result: AnalysisResult;
  onRetryReport: () => void;
  retryingReport: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const source = videoUrl(result);
  const poster = thumbnailUrl(result);
  const reportPending = ["pending", "generating"].includes(result.report.status);
  const faultGroups = new Map<string, Fault[]>();
  for (const fault of result.faults) {
    const existing = faultGroups.get(fault.code) ?? [];
    existing.push(fault);
    faultGroups.set(fault.code, existing);
  }
  const groupedFaults = Array.from(faultGroups.values());
  const uniqueFaultCount = groupedFaults.length;

  function seekTo(time: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(time, result.source.duration_s));
    setCurrentTime(video.currentTime);
    void video.play().catch(() => {
      // Autoplay can be blocked; the timeline still moved the video.
    });
  }

  const topFault = groupedFaults[0]?.[0];
  const summary = reportPending
    ? "The skeleton video and measured findings are ready. The written review is being generated."
    : topFault
      ? `${result.episodes.length} movement episodes were measured. Start with: ${topFault.title}. Use the timeline and the review below to connect it to a moment in the clip.`
      : "No form fault passed the confidence threshold in the recognized movement episodes. Review the capture quality, then consider filming from the other angle for a fuller picture.";

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="panel relative overflow-hidden p-5 sm:p-7">
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full border border-[rgba(203,245,106,0.12)]" />
        <div className="absolute right-8 top-4 h-44 w-44 rounded-full border border-[rgba(99,228,198,0.08)]" />

        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${qualityTone(result.capture_quality.overall)}`}>
                {result.capture_quality.overall} capture
              </span>
              <span className="badge">{result.source.view} view</span>
              <span className="badge">{result.source.dominant_hand}-handed</span>
              <span className="badge">{formatDuration(result.source.duration_s)}</span>
            </div>

            <h1 className="display mt-5 max-w-4xl text-[clamp(2.5rem,5.4vw,4.9rem)] font-extrabold leading-[0.92] tracking-[-0.055em]">
              {resultTitle(uniqueFaultCount, result.episodes.length)}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">{summary}</p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <a href="#findings" className="button-secondary">Findings</a>
              <a href="#review" className="button-secondary">Review</a>
              <a href="#plan" className="button-secondary">Exercise plan</a>
            </div>
          </div>

          <div className="flex items-center gap-4 lg:flex-col lg:items-end lg:gap-3">
            <div className="score-ring" style={{ "--score": result.capture_quality.score } as React.CSSProperties}>
              <span className="text-center">
                <span className="mono block text-xl font-semibold">{result.capture_quality.score}</span>
                <span className="block text-[0.5rem] font-bold tracking-[0.12em] text-[var(--muted)] uppercase">capture</span>
              </span>
            </div>
            <div className="text-right">
              <p className="mono text-[0.6rem] text-[var(--muted)]">
                {result.episodes.length} episodes · {uniqueFaultCount} finding
                {uniqueFaultCount === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-[0.58rem] tracking-[0.08em] text-[var(--muted)] uppercase">
                {result.report.exercise_plan.length} exercises prescribed
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.55fr]">
        <div className="space-y-3">
          <div className="video-shell">
            {source ? (
              <video
                ref={videoRef}
                src={source}
                poster={poster ?? undefined}
                controls
                playsInline
                preload="metadata"
                aria-label="Annotated skeleton video"
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                onSeeked={(event) => setCurrentTime(event.currentTarget.currentTime)}
              />
            ) : (
              <div className="grid aspect-video place-items-center px-6 text-center text-sm text-[var(--muted)]">
                No annotated video is available for this clip.
              </div>
            )}
          </div>
          <IssueTimeline
            episodes={result.episodes}
            faults={result.faults}
            duration={result.source.duration_s}
            currentTime={currentTime}
            onSeek={seekTo}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[0.6rem] text-[var(--muted)]">
            <span>
              Skeleton overlay shows the tracked athlete. Playhead:{" "}
              <span className="mono text-[var(--paper)]">{formatTimestamp(currentTime)}</span>
            </span>
            <span className="mono">
              {result.pipeline.pose_backend} · {result.pipeline.pose_model} · {result.pipeline.analysis_fps} fps
            </span>
          </div>
        </div>

        <QualityPanel quality={result.capture_quality} />
      </section>

      <section id="findings" className="scroll-mt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Measured findings</p>
            <h2 className="display mt-1 text-3xl font-extrabold sm:text-4xl">What the rules found</h2>
          </div>
          <p className="text-[0.65rem] text-[var(--muted)]">
            Rules v{result.pipeline.rules_version}
          </p>
        </div>

        {uniqueFaultCount > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {groupedFaults.map((group) => (
              <FaultCard
                key={group[0].id}
                fault={group[0]}
                occurrences={group.slice(1).map((fault) => fault.time_range.start_s)}
                onSeek={seekTo}
              />
            ))}
          </div>
        ) : (
          <div className="panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-semibold">No form fault passed the confidence threshold.</p>
              <p className="mt-1 max-w-2xl text-xs leading-6 text-[var(--muted)]">
                That is not a form certificate. It means this clip, from this angle, did not
                contain enough evidence for a rule to flag a problem. A second angle or a
                clearer repetition can reveal more.
              </p>
            </div>
            <span className="badge badge-pass self-start sm:self-auto">no flagged patterns</span>
          </div>
        )}
      </section>

      <section id="review" className="grid scroll-mt-6 gap-5 xl:grid-cols-[1.45fr_0.55fr]">
        <ReportPanel
          report={result.report}
          onRetry={onRetryReport}
          retrying={retryingReport}
        />

        <div className="space-y-5">
          <section className="panel p-5">
            <p className="eyebrow">Session facts</p>
            <h2 className="display mt-1 text-xl font-extrabold">The raw read</h2>
            <div className="mt-4 divide-y divide-[var(--line)]">
              {[
                ["Frames analyzed", `${result.source.frame_count}`],
                ["Native frame rate", `${result.source.fps_native.toFixed(0)} fps`],
                ["Analysis rate", `${result.source.fps_analysis} fps`],
                ["View estimate", result.source.view_estimate ?? "—"],
                ["Device", result.pipeline.device],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-2.5 text-[0.7rem]">
                  <span className="text-[var(--muted)]">{label}</span>
                  <span className="mono">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Method</p>
            <h2 className="display mt-1 text-xl font-extrabold">How to read this</h2>
            <div className="mt-4 space-y-3 text-[0.68rem] leading-5 text-[var(--muted)]">
              <p>
                Every finding compares a measured pose value with a versioned coaching threshold.
                Low-confidence measurements are suppressed, not guessed.
              </p>
              <p>
                The analyzer recognizes overhead, lunge, and ready-stance episodes. It does not
                identify badminton shots, tactics, or injury risk.
              </p>
              <p>
                Use the confidence label on each finding as evidence quality, not as a grade of
                your technique.
              </p>
            </div>
          </section>
        </div>
      </section>

      <div id="plan" className="scroll-mt-6">
        <ExercisePlan
          exercises={result.report.exercise_plan}
          faults={result.faults}
          reportStatus={result.report.status}
        />
      </div>

      <section className="panel flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
        <div>
          <p className="eyebrow">Next capture</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Film the same movement from the other angle to cover the metrics this view cannot see.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/#upload" className="button-primary">Analyze another clip</Link>
          <Link href="/analyses" className="button-secondary">History</Link>
        </div>
      </section>

      <p className="disclaimer">
        {result.disclaimer} This review was generated from a {result.source.view}-view clip by{" "}
        {result.report.provider === "anthropic" ? "Claude using measured pose findings" : "a local rules-based template"}.{" "}
        {result.pipeline.pose_backend === "ultralytics"
          ? "Pose detection uses an Ultralytics model; see the README for licensing."
          : null}
      </p>
    </div>
  );
}
