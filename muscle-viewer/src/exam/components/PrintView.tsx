import { useState } from 'react';
import { useI18n } from '../../i18n/context';
import { OPTION_LETTERS, SECTION_NAMES, type Paper, type Section } from '../types';
import { Bi } from './Bilingual';
import { ExamFigure } from './ExamFigure';

/** A printable paper (and optional answer key). Use the browser's "Save as PDF" for a file. */
export function PrintView({ paper, onBack }: { paper: Paper; onBack: () => void }) {
  const { t, l } = useI18n();
  const [withKey, setWithKey] = useState(true);
  const sections: Section[] = ['scientific', 'applied'];

  return (
    <div className="print-view">
      <div className="print-toolbar">
        <button type="button" className="btn" onClick={onBack}>
          ← {t('exam.backHome')}
        </button>
        <label className="toggle">
          <input type="checkbox" checked={withKey} onChange={(e) => setWithKey(e.target.checked)} />
          <span>{t('exam.printAnswerKey')}</span>
        </label>
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          {t('exam.printButton')}
        </button>
      </div>

      <div className="paper-sheet">
        <header className="paper-sheet__head">
          <h1>{l(paper.title)}</h1>
          <p>
            {t('exam.questions', { n: paper.questions.length })} · {t('exam.points', { n: paper.totalPoints })} · {t('exam.minutes', { n: paper.minutes })}
          </p>
          <div className="paper-sheet__fields">
            <span>{t('exam.printName')}：________________</span>
            <span>{t('exam.printDate')}：____________</span>
            <span>{t('exam.printScore')}：______ / 100</span>
          </div>
          <p className="paper-sheet__instructions">{t('exam.printInstructions')}</p>
        </header>

        {sections.map((s) => (
          <section key={s}>
            <h2 className="paper-sheet__section">{l(SECTION_NAMES[s])}</h2>
            {paper.questions.map((q, i) =>
              q.section !== s ? null : (
                <div key={q.id} className="print-q">
                  <div className="print-q__stem">
                    <b>{i + 1}.</b> <Bi value={q.stem} />
                  </div>
                  {q.figure && <ExamFigure figure={q.figure} />}
                  <ol className="print-q__options">
                    {q.options.map((o, k) => (
                      <li key={k}>
                        <b>{OPTION_LETTERS[k]}.</b> <Bi value={o} />
                      </li>
                    ))}
                  </ol>
                </div>
              ),
            )}
          </section>
        ))}

        {withKey && (
          <section className="answer-key">
            <h2 className="paper-sheet__section">{t('exam.printKey')}</h2>
            <div className="answer-key__grid">
              {paper.questions.map((q, i) => (
                <span key={q.id}>
                  {i + 1}. <b>{OPTION_LETTERS[q.answer]}</b>
                </span>
              ))}
            </div>
            {paper.questions.map((q, i) => (
              <p key={q.id} className="answer-key__item">
                <b>
                  {i + 1}. {OPTION_LETTERS[q.answer]}
                </b>{' '}
                <Bi value={q.explanation} />
              </p>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
