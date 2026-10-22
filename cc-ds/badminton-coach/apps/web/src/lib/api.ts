import type { AnalysisResult } from "@/lib/generated/analysis-result";

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");

export type AnalysisStatus = "queued" | "processing" | "completed" | "failed";
export type ReportStatus = "pending" | "generating" | "generated" | "template" | "failed" | "skipped";

export interface AnalysisSummary {
  id: string;
  created_at: string | null;
  status: AnalysisStatus;
  stage: string;
  progress: number;
  report_status: ReportStatus;
  duration_s: number | null;
  view: "side" | "front";
  dominant_hand: "left" | "right";
  original_filename: string;
  error: { code: string; message: string } | null;
  report_error: string | null;
  has_video: boolean;
  quality: {
    overall: string | null;
    analyzable: boolean | null;
    score: number | null;
  } | null;
}

export interface AnalysisList {
  items: AnalysisSummary[];
}

export class ApiRequestError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

async function readError(response: Response): Promise<ApiRequestError> {
  let message = `Request failed (${response.status})`;
  let code = "REQUEST_FAILED";
  try {
    const body = await response.json();
    if (body?.error?.message) message = body.error.message;
    if (body?.error?.code) code = body.error.code;
    if (body?.detail && typeof body.detail === "string") message = body.detail;
  } catch {
    // Keep the generic message.
  }
  return new ApiRequestError(message, code, response.status);
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}

export function getAnalysis(id: string): Promise<AnalysisSummary> {
  return getJson<AnalysisSummary>(`/api/v1/analyses/${encodeURIComponent(id)}`);
}

export function getResult(id: string): Promise<AnalysisResult> {
  return getJson<AnalysisResult>(`/api/v1/analyses/${encodeURIComponent(id)}/result`);
}

export function listAnalyses(): Promise<AnalysisList> {
  return getJson<AnalysisList>("/api/v1/analyses?limit=12");
}

export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path}`;
}

export function videoUrl(result: AnalysisResult): string | null {
  return assetUrl(result.artifacts.annotated_video_url);
}

export function thumbnailUrl(result: AnalysisResult): string | null {
  return assetUrl(result.artifacts.thumbnail_url);
}

export function uploadAnalysis(input: {
  file: File;
  view: "side" | "front";
  dominantHand: "left" | "right";
  mirrored: boolean;
  onProgress?: (percent: number) => void;
}): Promise<{ id: string; status: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("video", input.file);
    form.append("view", input.view);
    form.append("dominant_hand", input.dominantHand);
    form.append("mirrored", input.mirrored ? "true" : "false");

    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE}/api/v1/analyses`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && input.onProgress) {
        input.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onerror = () => {
      reject(new ApiRequestError("Could not reach the analysis server.", "NETWORK_ERROR", 0));
    };
    request.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(request.responseText);
      } catch {
        // Fall through to the generic error.
      }
      if (request.status >= 200 && request.status < 300) {
        resolve(body as { id: string; status: string });
        return;
      }
      const parsed = body as { error?: { code?: string; message?: string }; detail?: string } | null;
      reject(
        new ApiRequestError(
          parsed?.error?.message ?? parsed?.detail ?? `Upload failed (${request.status})`,
          parsed?.error?.code ?? "UPLOAD_FAILED",
          request.status,
        ),
      );
    };
    request.send(form);
  });
}

export async function retryReport(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/analyses/${encodeURIComponent(id)}/report/retry`, {
    method: "POST",
  });
  if (!response.ok) throw await readError(response);
}
