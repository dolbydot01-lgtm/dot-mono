import { useState } from 'react';
import { useI18n } from '../../i18n/context';
import { formatDuration, PASS_MARK, scoreSession, weakestDomains, type ExamSession, type ScoreBreakdown } from '../session';
import { DOMAIN_NAMES, SECTION_NAMES, type Domain, type Paper, type Section } from '../types';
import type { ExamApi } from '../useExam';
import { QuestionCard } from './QuestionCard';

function Bar({ label, b }: { label: string; b: ScoreBreakdown }) {
  const pct = b.total ? (b.correct / b.total) * 100 : 0;
  return (
    <div className="score-bar">
      <div className="score-bar__row">
        <span>{label}</span>
        <b>
          {b.correct}/{b.total}
        </b>
      </div>
      <div className="score-bar__track">
        <div className={`score-bar__fill ${pct >= PASS_MARK ? 'is-good' : 'is-weak'}`} style={{ width: `${pct}%` }} />
        <div className="score-bar__mark" style={{ left: `${PASS_MARK}%` }} />
      </div>
    </div>
  );
}

export function ResultView({ paper, session, api, onRetry }: { paper: Paper; session: ExamSession; api: ExamApi; onRetry: () => void }) {
  const { t, l } = useI18n();
  const [wrongOnly, setWrongOnly] = useState(false);
  const report = scoreSession(paper, session);
  const passed = report.score >= PASS_MARK;
  // The result view is only shown for submitted sessions.
  const seconds = ((session.submittedAt ?? session.startedAt) - session.startedAt) / 1000;
  const weak = weakestDomains(report)
    .filter((d) => {
      const b = report.byDomain[d]!;
      return b.correct / b.total < 0.8;
    })
    .slice(0, 3);

  const items = paper.questions.map((q, i) => ({ q, i })).filter(({ q, i }) => !wrongOnly || session.answers[i] !== q.answer);

  return (
    <div className="result">
      <section className="result__summary">
        <div className={`result__score ${passed ? 'is-pass' : 'is-fail'}`}>
          <span className="result__number">{report.score}</span>
          <span className="result__max">/ 100</span>
        </div>
        <div className="result__meta">
          <h2>
            {t('exam.result')} · {l(paper.title)}
          </h2>
          <p className={`result__verdict ${passed ? 'is-pass' : 'is-fail'}`}>{passed ? t('exam.pass') : t('exam.fail')}</p>
          <p className="muted">
            {t('exam.correctCount', { c: report.correct, n: report.total })} · {t('exam.timeUsed')} {formatDuration(seconds)} · {session.mode === 'exam' ? t('exam.mock') : t('exam.practice')}
          </p>
          <p className="muted small">{t('exam.passNote')}</p>
          <div className="result__actions">
            <button type="button" className="btn btn--primary" onClick={onRetry}>
              {t('exam.retry')}
            </button>
            <button type="button" className="btn" onClick={api.exit}>
              {t('exam.backHome')}
            </button>
          </div>
        </div>
      </section>

      <section className="result__breakdown">
        <div>
          <h3>{t('exam.bySection')}</h3>
          {(['scientific', 'applied'] as Section[]).map((s) => (
            <Bar key={s} label={l(SECTION_NAMES[s])} b={report.bySection[s]} />
          ))}
        </div>
        <div>
          <h3>{t('exam.byDomain')}</h3>
          {(Object.keys(report.byDomain) as Domain[]).map((d) => (
            <Bar key={d} label={l(DOMAIN_NAMES[d])} b={report.byDomain[d]!} />
          ))}
        </div>
        {weak.length > 0 && (
          <div className="result__weak">
            <h3>{t('exam.weak')}</h3>
            <ul>
              {weak.map((d) => (
                <li key={d}>{l(DOMAIN_NAMES[d])}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="result__review">
        <header>
          <h3>{t('exam.review')}</h3>
          <label className="toggle">
            <input type="checkbox" checked={wrongOnly} onChange={(e) => setWrongOnly(e.target.checked)} />
            <span>{t('exam.wrongOnly')}</span>
          </label>
        </header>
        {items.map(({ q, i }) => (
          <QuestionCard key={q.id} question={q} number={i + 1} selected={session.answers[i]} showResult />
        ))}
      </section>
    </div>
  );
}
