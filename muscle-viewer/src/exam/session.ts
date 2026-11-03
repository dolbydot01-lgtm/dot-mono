import type { Domain, Paper, Section } from './types';

export type ExamMode = 'practice' | 'exam';

/** One attempt at a paper. Stored in localStorage so a refresh doesn't lose it. */
export interface ExamSession {
  paperId: string;
  mode: ExamMode;
  answers: (number | null)[];
  flagged: boolean[];
  /** Practice mode: questions whose answer has been checked. */
  revealed: boolean[];
  current: number;
  startedAt: number;
  submittedAt: number | null;
}

export interface AttemptRecord {
  paperId: string;
  mode: ExamMode;
  score: number;
  finishedAt: number;
  seconds: number;
}

export const PASS_MARK = 70;

export function newSession(paper: Paper, mode: ExamMode): ExamSession {
  const n = paper.questions.length;
  return {
    paperId: paper.id,
    mode,
    answers: Array(n).fill(null),
    flagged: Array(n).fill(false),
    revealed: Array(n).fill(false),
    current: 0,
    startedAt: Date.now(),
    submittedAt: null,
  };
}

export interface ScoreBreakdown {
  correct: number;
  total: number;
  points: number;
  maxPoints: number;
}

export interface ScoreReport {
  score: number;
  correct: number;
  answered: number;
  total: number;
  bySection: Record<Section, ScoreBreakdown>;
  byDomain: Partial<Record<Domain, ScoreBreakdown>>;
}

const empty = (): ScoreBreakdown => ({ correct: 0, total: 0, points: 0, maxPoints: 0 });

export function scoreSession(paper: Paper, session: ExamSession): ScoreReport {
  const bySection: Record<Section, ScoreBreakdown> = { scientific: empty(), applied: empty() };
  const byDomain: Partial<Record<Domain, ScoreBreakdown>> = {};
  let score = 0;
  let correct = 0;
  let answered = 0;
  paper.questions.forEach((q, i) => {
    const a = session.answers[i];
    const ok = a === q.answer;
    if (a !== null) answered++;
    if (ok) {
      correct++;
      score += q.points;
    }
    for (const bucket of [bySection[q.section], (byDomain[q.domain] ??= empty())]) {
      bucket.total++;
      bucket.maxPoints += q.points;
      if (ok) {
        bucket.correct++;
        bucket.points += q.points;
      }
    }
  });
  return { score: Math.round(score * 10) / 10, correct, answered, total: paper.questions.length, bySection, byDomain };
}

/** Domains sorted from weakest to strongest — what to study next. */
export function weakestDomains(report: ScoreReport): Domain[] {
  return (Object.keys(report.byDomain) as Domain[]).sort((a, b) => {
    const ra = report.byDomain[a]!;
    const rb = report.byDomain[b]!;
    return ra.correct / ra.total - rb.correct / rb.total;
  });
}

// ───────────── persistence (per browser) ─────────────

const KEY = 'anatomy3d.exam.v1';

interface Stored {
  session: ExamSession | null;
  history: AttemptRecord[];
}

export function loadStored(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Stored;
      return { session: parsed.session ?? null, history: Array.isArray(parsed.history) ? parsed.history : [] };
    }
  } catch {
    /* storage unavailable or corrupt */
  }
  return { session: null, history: [] };
}

export function saveStored(stored: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    /* storage unavailable */
  }
}

export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}
