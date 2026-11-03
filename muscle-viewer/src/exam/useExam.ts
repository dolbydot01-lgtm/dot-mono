import { useCallback, useEffect, useState } from 'react';
import { PAPER_MAP } from './papers';
import { loadStored, newSession, saveStored, scoreSession, type AttemptRecord, type ExamMode, type ExamSession } from './session';

/** State and actions for the exam module, persisted to localStorage. */
export function useExam() {
  const [stored, setStored] = useState(loadStored);
  const { session, history } = stored;

  useEffect(() => saveStored(stored), [stored]);

  const update = useCallback((fn: (s: ExamSession) => ExamSession) => {
    setStored((prev) => (prev.session ? { ...prev, session: fn(prev.session) } : prev));
  }, []);

  const start = useCallback((paperId: string, mode: ExamMode) => {
    const paper = PAPER_MAP[paperId];
    setStored((prev) => ({ ...prev, session: newSession(paper, mode) }));
  }, []);

  const answer = useCallback(
    (index: number, option: number) =>
      update((s) => {
        // In practice mode an answer is locked once it has been checked.
        if (s.submittedAt || (s.mode === 'practice' && s.revealed[index])) return s;
        const answers = [...s.answers];
        answers[index] = option;
        return { ...s, answers };
      }),
    [update],
  );

  const reveal = useCallback(
    (index: number) =>
      update((s) => {
        const revealed = [...s.revealed];
        revealed[index] = true;
        return { ...s, revealed };
      }),
    [update],
  );

  const toggleFlag = useCallback(
    (index: number) =>
      update((s) => {
        const flagged = [...s.flagged];
        flagged[index] = !flagged[index];
        return { ...s, flagged };
      }),
    [update],
  );

  const goTo = useCallback((index: number) => update((s) => ({ ...s, current: Math.max(0, Math.min(index, s.answers.length - 1)) })), [update]);

  const submit = useCallback(() => {
    setStored((prev) => {
      if (!prev.session || prev.session.submittedAt) return prev;
      const finishedAt = Date.now();
      const paper = PAPER_MAP[prev.session.paperId];
      const report = scoreSession(paper, prev.session);
      const record: AttemptRecord = {
        paperId: paper.id,
        mode: prev.session.mode,
        score: report.score,
        finishedAt,
        seconds: (finishedAt - prev.session.startedAt) / 1000,
      };
      return { session: { ...prev.session, submittedAt: finishedAt }, history: [record, ...prev.history].slice(0, 50) };
    });
  }, []);

  const exit = useCallback(() => setStored((prev) => ({ ...prev, session: null })), []);

  return { session, history, start, answer, reveal, toggleFlag, goTo, submit, exit };
}

export type ExamApi = ReturnType<typeof useExam>;
