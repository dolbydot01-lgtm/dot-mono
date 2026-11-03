import { useI18n } from '../../i18n/context';
import type { ExamSession } from '../session';
import type { Paper } from '../types';

/** The answer-sheet grid: jump to any question and see its status. */
export function Navigator({ paper, session, onGo }: { paper: Paper; session: ExamSession; onGo: (i: number) => void }) {
  const { t } = useI18n();
  const showMarks = session.mode === 'practice';

  const sections = [
    { key: 'scientific', from: 0 },
    { key: 'applied', from: paper.questions.findIndex((q) => q.section === 'applied') },
  ];

  return (
    <nav className="navigator" aria-label={t('exam.navigator')}>
      <h4>{t('exam.navigator')}</h4>
      {sections.map((sec, si) => {
        const to = si === 0 ? sections[1].from : paper.questions.length;
        return (
          <div key={sec.key} className="navigator__grid">
            {paper.questions.slice(sec.from, to).map((q, k) => {
              const i = sec.from + k;
              const answered = session.answers[i] !== null;
              const checked = showMarks && session.revealed[i];
              const cls = [
                'nav-cell',
                i === session.current ? 'is-current' : '',
                checked ? (session.answers[i] === q.answer ? 'is-correct' : 'is-wrong') : answered ? 'is-answered' : '',
                session.flagged[i] ? 'is-flagged' : '',
              ].join(' ');
              return (
                <button key={q.id} type="button" className={cls} onClick={() => onGo(i)} aria-label={t('exam.question', { n: i + 1 })}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        );
      })}
      <ul className="navigator__legend">
        <li>
          <i className="nav-cell is-answered" /> {t('exam.legendAnswered')}
        </li>
        <li>
          <i className="nav-cell is-flagged" /> {t('exam.legendFlagged')}
        </li>
        {showMarks && (
          <>
            <li>
              <i className="nav-cell is-correct" /> {t('exam.legendCorrect')}
            </li>
            <li>
              <i className="nav-cell is-wrong" /> {t('exam.legendWrong')}
            </li>
          </>
        )}
        <li>
          <i className="nav-cell" /> {t('exam.legendUnanswered')}
        </li>
      </ul>
    </nav>
  );
}
