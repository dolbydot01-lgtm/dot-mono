"use client";

import Link from "next/link";
import type { AnalysisSummary } from "@/lib/api";

const stages = [
  { key: "validating", title: "Check the clip", copy: "Duration, resolution, frame rate, and scene quality." },
  { key: "pose", title: "Track the body", copy: "YOLO pose is finding 17 keypoints and following one athlete." },
  { key: "analyzing", title: "Read the movement", copy: "Finding overhead, lunge, and ready-stance episodes." },
  { key: "rendering", title: "Draw the skeleton", copy: "Building the annotated video and issue timeline." },
];

const stageCopy: Record<string, string> = {
  queued: "Waiting for the worker.",
  starting: "Preparing the analysis pipeline.",
  validating: "Checking the source clip and normalizing frames.",
  pose: "Running pose estimation. The first run may download model weights.",
  analyzing: "Measuring joint angles and checking form rules.",
  rendering: "Rendering the skeleton overlay and thumbnail.",
};

function SkeletonVisual() {
  return (
    <div className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[radial-gradient(circle_at_50%_35%,rgba(99,228,198,0.14),transparent_60%),#081013]">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(171,205,209,0.11)_1px,transparent_1px),linear-gradient(90deg,rgba(171,205,209,0.11)_1px,transparent_1px)] [background-size:32px_32px]" />
      <svg width="180" height="250" viewBox="0 0 180 250" fill="none" aria-hidden="true" className="relative z-10">
        <circle cx="90" cy="35" r="17" stroke="#63e4c6" strokeWidth="1.6" />
        <path d="M90 52v66M90 68 57 94M90 68l36 14M90 118l-29 54M90 118l31 52M61 172l-6 54M121 170l9 56" stroke="#63e4c6" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M124 82l17-38M148 37l8-15" stroke="#cbf56a" strokeWidth="2" strokeLinecap="round" />
        <g fill="#f2f5e9">
          <circle cx="90" cy="52" r="3.2" />
          <circle cx="57" cy="94" r="3.2" />
          <circle cx="126" cy="82" r="3.2" />
          <circle cx="61" cy="172" r="3.2" />
          <circle cx="121" cy="170" r="3.2" />
          <circle cx="55" cy="226" r="3.2" />
          <circle cx="130" cy="226" r="3.2" />
          <circle cx="141" cy="44" r="3.2" />
          <circle cx="156" cy="22" r="3.2" />
        </g>
        <circle cx="156" cy="22" r="8" stroke="#cbf56a" strokeWidth="1.2">
          <animate attributeName="r" values="7;12;7" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0.15;0.9" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[0.62rem] font-bold tracking-[0.14em] text-[var(--aqua)] uppercase">
        <span className="pulse-dot" /> live pipeline
      </div>
    </div>
  );
}

export default function ProcessingView({ analysis }: { analysis: AnalysisSummary }) {
  const currentIndex = stages.findIndex((stage) => stage.key === analysis.stage);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;
  const progress = Math.max(analysis.progress, analysis.status === "queued" ? 2 : 5);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="panel p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Analysis in progress</p>
            <h1 className="display mt-2 text-3xl font-extrabold sm:text-4xl">Reading the movement.</h1>
          </div>
          <span className="badge badge-lime">
            <span className="pulse-dot" /> running
          </span>
        </div>

        <div className="mt-7">
          <div className="mb-2 flex items-center justify-between text-[0.68rem] text-[var(--muted)]">
            <span>{stageCopy[analysis.stage] ?? "Processing clip."}</span>
            <span className="mono">{progress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-7">
          {stages.map((stage, index) => {
            const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "waiting";
            return (
              <div key={stage.key} className="stage-row" data-state={state}>
                <span className="stage-mark">{index < activeIndex ? "✓" : index + 1}</span>
                <div>
                  <p className="font-semibold">{stage.title}</p>
                  <p className="mt-0.5 text-[0.68rem] leading-relaxed text-[var(--muted)]">{stage.copy}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-7 rounded-xl border border-[var(--line)] bg-white/[0.025] p-4 text-[0.7rem] leading-5 text-[var(--muted)]">
          A short clip usually takes one to three minutes. The first analysis can take longer
          while the pose model is downloaded. Keep this tab open; the page updates itself.
        </div>

        <Link href="/" className="mt-5 inline-block text-[0.68rem] font-bold tracking-[0.09em] text-[var(--muted)] uppercase hover:text-[var(--paper)]">
          ← Back to upload
        </Link>
      </div>

      <div className="panel p-4 sm:p-6">
        <SkeletonVisual />
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            ["Athlete", "tracking"],
            ["Skeleton", "17 points"],
            ["Rules", "v1"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[var(--line)] bg-white/[0.02] p-3">
              <p className="text-[0.55rem] font-bold tracking-[0.12em] text-[var(--muted)] uppercase">{label}</p>
              <p className="mono mt-1.5 text-[0.72rem] text-[var(--paper)]">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
