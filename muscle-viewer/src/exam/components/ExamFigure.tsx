import { useI18n } from '../../i18n/context';
import { Stage } from '../../video/player/Stage';
import '../../video/video.css';
import type { QuestionFigure } from '../types';

/** A still frame from the explainer video, used as a question figure. */
export function ExamFigure({ figure }: { figure: QuestionFigure }) {
  const { t, l } = useI18n();
  return (
    <figure className="exam-figure">
      <div className="exam-figure__frame">
        <Stage time={figure.t} clean={figure.clean} />
      </div>
      {figure.caption && (
        <figcaption>
          {t('exam.figure')} · {l(figure.caption)}
        </figcaption>
      )}
    </figure>
  );
}
