import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/context';
import { formatDuration, type ExamSession } from '../session';
import type { Paper } from '../types';
import type { ExamApi } from '../useExam';
import { Navigator } from './Navigator';
import { QuestionCard } from './QuestionCard';

/** Ticks once a second so the clock stays live. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function SessionView({ paper, session, api, onExit }: { paper: Paper; session: ExamSession; api: ExamApi; onExit: () => void }) {
  const { t, l } = useI18n();
  const now = useNow();
  const i = session.current;
  const q = paper.questions[i];
  const isExam = session.mode === 'exam';
  const elapsed = (now - session.startedAt) / 1000;
  const remaining = paper.minutes * 60 - elapsed;
  const revealed = !isExam && session.revealed[i];
  const unanswered = session.answers.filter((a) => a === null).length;

  // Mock exams submit themselves when time runs out.
  useEffect(() => {
    if (isExam && remaining <= 0) api.submit();
  }, [isExam, remaining, api]);

  const submit = () => {
    if (unanswered > 0 && !window.confirm(t('exam.confirmSubmit', { n: unanswered }))) return;
    api.submit();
  };

  return (
    <div className="session">
      <header className="session__bar">
        <div>
          <div className="session__title">{l(paper.title)}</div>
          <div className="session__mode">{isExam ? t('exam.mock') : t('exam.practice')}</div>
        </div>
        <div className={`session__clock ${isExam && remaining < 300 ? 'is-low' : ''}`}>
          <span>{isExam ? t('exam.timeLeft') : t('exam.elapsed')}</span>
          <b>{formatDuration(isExam ? remaining : elapsed)}</b>
        </div>
        <div className="session__progress">
          <div className="session__progress-bar" style={{ width: `${((paper.questions.length - unanswered) / paper.questions.length) * 100}%` }} />
        </div>
        <button type="button" className="btn" onClick={onExit}>
          {t('exam.exit')}
        </button>
      </header>

      <div className="session__body">
        <main className="session__main">
          <QuestionCard
            key={q.id}
            question={q}
            number={i + 1}
            selected={session.answers[i]}
            showResult={revealed}
            onSelect={revealed ? undefined : (opt) => api.answer(i, opt)}
            flagged={session.flagged[i]}
            onToggleFlag={() => api.toggleFlag(i)}
          />
          <footer className="session__nav">
            <button type="button" className="btn" onClick={() => api.goTo(i - 1)} disabled={i === 0}>
              ← {t('exam.prev')}
            </button>
            {!isExam && !revealed && (
              <button type="button" className="btn btn--primary" onClick={() => api.reveal(i)} disabled={session.answers[i] === null}>
                {t('exam.check')}
              </button>
            )}
            {i < paper.questions.length - 1 ? (
              <button type="button" className={`btn ${isExam || revealed ? 'btn--primary' : ''}`} onClick={() => api.goTo(i + 1)}>
                {t('exam.next')} →
              </button>
            ) : (
              <button type="button" className="btn btn--primary" onClick={submit}>
                {isExam ? t('exam.submit') : t('exam.finish')}
              </button>
            )}
          </footer>
        </main>
        <aside className="session__side">
          <Navigator paper={paper} session={session} onGo={api.goTo} />
          <button type="button" className="btn btn--primary session__submit" onClick={submit}>
            {isExam ? t('exam.submit') : t('exam.finish')}
          </button>
        </aside>
      </div>
    </div>
  );
}
