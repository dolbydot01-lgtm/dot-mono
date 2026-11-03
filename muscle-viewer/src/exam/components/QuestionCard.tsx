import { useI18n } from '../../i18n/context';
import { DOMAIN_NAMES, LEVEL_NAMES, OPTION_LETTERS, SECTION_NAMES, type Question } from '../types';
import { Bi } from './Bilingual';
import { ExamFigure } from './ExamFigure';
import { RelatedLinks } from './RelatedLinks';

interface QuestionCardProps {
  question: Question;
  number: number;
  selected: number | null;
  /** Show correct/incorrect marking and the explanation. */
  showResult: boolean;
  onSelect?: (option: number) => void;
  flagged?: boolean;
  onToggleFlag?: () => void;
}

export function QuestionCard({ question, number, selected, showResult, onSelect, flagged, onToggleFlag }: QuestionCardProps) {
  const { t, l } = useI18n();
  const isCorrect = selected === question.answer;

  return (
    <article className="qcard">
      <header className="qcard__head">
        <h3 className="qcard__number">{t('exam.question', { n: number })}</h3>
        <div className="qcard__tags">
          <span className={`tag tag--${question.section}`}>{l(SECTION_NAMES[question.section])}</span>
          <span className="tag">{l(DOMAIN_NAMES[question.domain])}</span>
          <span className="tag tag--muted">{l(LEVEL_NAMES[question.level])}</span>
        </div>
        {onToggleFlag && (
          <button type="button" className={`flag-btn ${flagged ? 'is-on' : ''}`} onClick={onToggleFlag} aria-pressed={flagged}>
            ⚑ {flagged ? t('exam.flagged') : t('exam.flag')}
          </button>
        )}
      </header>

      <div className="qcard__stem">
        <Bi value={question.stem} />
      </div>

      {question.figure && <ExamFigure figure={question.figure} />}

      <ol className="options" role="radiogroup">
        {question.options.map((opt, i) => {
          const state = showResult ? (i === question.answer ? 'is-correct' : i === selected ? 'is-wrong' : '') : i === selected ? 'is-selected' : '';
          return (
            <li key={i}>
              <button type="button" role="radio" aria-checked={selected === i} className={`option ${state}`} onClick={() => onSelect?.(i)} disabled={!onSelect}>
                <span className="option__letter">{OPTION_LETTERS[i]}</span>
                <Bi value={opt} />
              </button>
            </li>
          );
        })}
      </ol>

      {showResult && (
        <div className={`feedback ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
          <div className="feedback__verdict">
            {selected === null ? t('exam.unanswered') : isCorrect ? `✓ ${t('exam.correct')}` : `✗ ${t('exam.incorrect')}`}
            <span className="feedback__answer">{t('exam.answerIs', { x: OPTION_LETTERS[question.answer] })}</span>
          </div>
          <div className="feedback__body">
            <b>{t('exam.explanation')}：</b>
            <Bi value={question.explanation} />
          </div>
          {question.refs && <RelatedLinks refs={question.refs} />}
        </div>
      )}
    </article>
  );
}
