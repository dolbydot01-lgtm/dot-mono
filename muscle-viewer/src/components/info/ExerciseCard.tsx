import type { Exercise } from '../../data/types';
import { useI18n } from '../../i18n/context';

const LEVEL_DOTS: Record<Exercise['level'], number> = { beginner: 1, intermediate: 2, advanced: 3 };

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const { t, l } = useI18n();
  const dots = LEVEL_DOTS[exercise.level];
  return (
    <article className="exercise">
      <header className="exercise__header">
        <h4 className="exercise__name">{l(exercise.name)}</h4>
        <span className={`level level--${exercise.level}`} title={t(`level.${exercise.level}`)}>
          {[1, 2, 3].map((n) => (
            <i key={n} className={n <= dots ? 'is-on' : ''} />
          ))}
          {t(`level.${exercise.level}`)}
        </span>
      </header>
      <p className="exercise__meta">
        {t('muscle.equipment')}: {l(exercise.equipment)}
      </p>
      <p className="exercise__tip">💡 {l(exercise.tip)}</p>
    </article>
  );
}
