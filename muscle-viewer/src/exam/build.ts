import type { Localized } from '../data/types';
import type { Paper, PaperSource, Question, QuestionSource } from './types';

export const L = (zh: string, en: string): Localized => ({ zh, en });

/** Stable 32-bit hash of a string. */
function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Seeded RNG so answer positions are identical on every load and in print. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Insert the correct answer among the distractors at position `answer`. */
function placeAnswer(src: QuestionSource, answer: number, points: number): Question {
  const { correct, distractors, ...rest } = src;
  const options = [...distractors];
  options.splice(answer, 0, correct);
  return { ...rest, options, answer, points };
}

/**
 * Build a paper: points are spread evenly to total 100, and the correct
 * answers are distributed evenly across A–D in a shuffled, deterministic order.
 */
export function buildPaper(src: PaperSource): Paper {
  const n = src.questions.length;
  const positions = Array.from({ length: n }, (_, i) => i % 4);
  const rand = rng(hashString(src.id));
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  const points = 100 / n;
  return {
    ...src,
    questions: src.questions.map((q, i) => placeAnswer(q, positions[i], points)),
    totalPoints: 100,
  };
}
