"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { uploadAnalysis } from "@/lib/api";

const MAX_BYTES = 200 * 1024 * 1024;
const ACCEPTED = [".mp4", ".mov", ".webm", ".m4v"];

function UploadIcon() {
  return (
    <svg width="27" height="27" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 13.5v4A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AngleGlyph({ front }: { front: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="4.1" r="1.8" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10 6v5.5M10 8l-3.2 2M10 8l3.2 2M10 11.5 7.4 16M10 11.5l2.6 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {front ? (
        <path d="M3 18.5h14" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 2" />
      ) : (
        <path d="M15.5 2.5c2 4.2 2 10.8 0 15" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 2" />
      )}
    </svg>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [view, setView] = useState<"side" | "front">("side");
  const [dominantHand, setDominantHand] = useState<"left" | "right">("right");
  const [mirrored, setMirrored] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function acceptFile(nextFile: File | undefined) {
    setError(null);
    if (!nextFile) return;
    const extension = `.${nextFile.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!ACCEPTED.includes(extension)) {
      setError("Choose an MP4, MOV, WebM, or M4V clip.");
      return;
    }
    if (nextFile.size > MAX_BYTES) {
      setError("Keep the clip under 200 MB.");
      return;
    }
    setFile(nextFile);
    setProgress(0);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || uploading) return;
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const response = await uploadAnalysis({
        file,
        view,
        dominantHand,
        mirrored,
        onProgress: setProgress,
      });
      router.push(`/analyses/${response.id}`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload the clip.");
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel p-4 sm:p-6" id="upload">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">New analysis</p>
          <h2 className="display mt-1 text-2xl font-extrabold">Send a clip to the lab</h2>
        </div>
        <span className="badge">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--aqua)]" />
          local
        </span>
      </div>

      <div
        className="file-drop"
        data-dragging={dragging}
        data-filled={Boolean(file)}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v"
          className="sr-only"
          onChange={(event) => acceptFile(event.target.files?.[0])}
        />
        {file ? (
          <div className="flex flex-col items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[rgba(203,245,106,0.25)] bg-[rgba(203,245,106,0.07)] text-[var(--lime)]">
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="m10 9.4 4.3 2.6L10 14.6V9.4Z" fill="currentColor" />
              </svg>
            </span>
            <div>
              <p className="max-w-[19rem] truncate text-sm font-semibold">{file.name}</p>
              <p className="mono mt-1 text-[0.68rem] text-[var(--muted)]">
                {formatSize(file.size)} · ready for analysis
              </p>
            </div>
            <button
              type="button"
              className="button-secondary"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              Replace clip
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="text-[var(--aqua)]">
              <UploadIcon />
            </span>
            <div>
              <p className="text-sm font-semibold">Drop your technique clip here</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                10–60 seconds · one athlete · full body in frame
              </p>
            </div>
            <button
              type="button"
              className="button-secondary"
              onClick={() => inputRef.current?.click()}
            >
              Choose a video
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <span className="field-label">Camera angle</span>
          <div className="segmented" role="group" aria-label="Camera angle">
            <button
              type="button"
              data-active={view === "side"}
              aria-pressed={view === "side"}
              onClick={() => setView("side")}
            >
              <AngleGlyph front={false} /> Side
            </button>
            <button
              type="button"
              data-active={view === "front"}
              aria-pressed={view === "front"}
              onClick={() => setView("front")}
            >
              <AngleGlyph front /> Front
            </button>
          </div>
          <p className="mt-2 text-[0.66rem] leading-relaxed text-[var(--muted)]">
            Side view reads lunges and torso lean. Front view reads stance width and knee tracking.
          </p>
        </div>

        <div>
          <span className="field-label">Racket hand</span>
          <div className="segmented" role="group" aria-label="Dominant hand">
            <button
              type="button"
              data-active={dominantHand === "left"}
              aria-pressed={dominantHand === "left"}
              onClick={() => setDominantHand("left")}
            >
              Left
            </button>
            <button
              type="button"
              data-active={dominantHand === "right"}
              aria-pressed={dominantHand === "right"}
              onClick={() => setDominantHand("right")}
            >
              Right
            </button>
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-[0.68rem] leading-tight text-[var(--muted)]">
            <input
              type="checkbox"
              checked={mirrored}
              onChange={(event) => setMirrored(event.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--lime)]"
            />
            This clip is mirrored (selfie mode)
          </label>
        </div>
      </div>

      {uploading ? (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-[0.68rem] text-[var(--muted)]">
            <span>Uploading clip</span>
            <span className="mono">{progress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-[rgba(255,107,100,0.28)] bg-[rgba(255,107,100,0.07)] px-3 py-2.5 text-xs leading-relaxed text-[#ffb0a7]">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="hidden text-[0.65rem] text-[var(--muted)] sm:block">
          Submitted clips are analyzed on this machine.
        </span>
        <button type="submit" className="button-primary flex-1 sm:flex-none" disabled={!file || uploading}>
          {uploading ? "Sending…" : "Analyze movement"}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 8h10M9 4.5 12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </form>
  );
}
