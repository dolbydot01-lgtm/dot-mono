import { useI18n } from '../../i18n/context';
import { PAPER_MAP, PAPERS } from '../papers';
import { formatDuration, PASS_MARK, type AttemptRecord, type ExamMode, type ExamSession } from '../session';

interface ExamHomeProps {
  history: AttemptRecord[];
  pending: ExamSession | null;
  onStart: (paperId: string, mode: ExamMode) => void;
  onResume: () => void;
  onDiscard: () => void;
  onPrint: (paperId: string) => void;
}

export function ExamHome({ history, pending, onStart, onResume, onDiscard, onPrint }: ExamHomeProps) {
  const { t, l, lang } = useI18n();
  const date = (ms: number) => new Date(ms).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="exam-home">
      <header className="exam-home__header">
        <h2>{t('exam.title')}</h2>
        <p>{t('exam.intro')}</p>
      </header>

      {pending && !pending.submittedAt && (
        <div className="resume-banner">
          <span>
            {t('exam.inProgress', {
              title: l(PAPER_MAP[pending.paperId].title),
              mode: pending.mode === 'exam' ? t('exam.mock') : t('exam.practice'),
              n: pending.answers.filter((a) => a !== null).length,
            })}
          </span>
          <button type="button" className="btn btn--primary" onClick={onResume}>
            {t('exam.resume')}
          </button>
          <button type="button" className="btn" onClick={onDiscard}>
            {t('exam.discard')}
          </button>
        </div>
      )}

      <section className="format-card">
        <h3>{t('exam.formatTitle')}</h3>
        <ul>
          <li>{t('exam.format1')}</li>
          <li>{t('exam.format2')}</li>
          <li>{t('exam.format3')}</li>
        </ul>
      </section>

      <div className="paper-grid">
        {PAPERS.map((p, idx) => {
          const attempts = history.filter((h) => h.paperId === p.id);
          const best = attempts.length ? Math.max(...attempts.map((a) => a.score)) : null;
          return (
            <article key={p.id} className="paper-card">
              <div className="paper-card__index">{String(idx + 1).padStart(2, '0')}</div>
              <h3>{l(p.title)}</h3>
              <p className="paper-card__focus">{l(p.focus)}</p>
              <div className="paper-card__meta">
                <span>{t('exam.questions', { n: p.questions.length })}</span>
                <span>{t('exam.points', { n: p.totalPoints })}</span>
                <span>{t('exam.minutes', { n: p.minutes })}</span>
              </div>
              <div className="paper-card__best">
                {best === null ? (
                  <span className="muted">{t('exam.noAttempts')}</span>
                ) : (
                  <>
                    <span className={best >= PASS_MARK ? 'good' : 'weak'}>
                      {t('exam.best')} {best}
                    </span>
                    <span className="muted">{t('exam.attempts', { n: attempts.length })}</span>
                  </>
                )}
              </div>
              <div className="paper-card__actions">
                <button type="button" className="btn" onClick={() => onStart(p.id, 'practice')} title={t('exam.practiceDesc')}>
                  {t('exam.practice')}
                </button>
                <button type="button" className="btn btn--primary" onClick={() => onStart(p.id, 'exam')} title={t('exam.mockDesc')}>
                  {t('exam.mock')}
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => onPrint(p.id)}>
                  {t('exam.print')}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {history.length > 0 && (
        <section className="history">
          <h3>{t('exam.history')}</h3>
          <table>
            <tbody>
              {history.slice(0, 8).map((h, i) => (
                <tr key={i}>
                  <td>{date(h.finishedAt)}</td>
                  <td>{l(PAPER_MAP[h.paperId]?.title ?? { zh: h.paperId, en: h.paperId })}</td>
                  <td>{h.mode === 'exam' ? t('exam.mock') : t('exam.practice')}</td>
                  <td className={h.score >= PASS_MARK ? 'good' : 'weak'}>{h.score}</td>
                  <td className="muted">{formatDuration(h.seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
