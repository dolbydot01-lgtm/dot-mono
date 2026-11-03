import { JOINT_MAP, JOINT_TYPE_COLORS } from '../../data/joints';
import { REGIONS } from '../../data/regions';
import type { MuscleInfo } from '../../data/types';
import { useI18n } from '../../i18n/context';
import { PALETTE } from '../../scene/palette';
import { useViewerStore } from '../../store/viewerStore';
import { Chip } from '../common/Chip';
import { Section } from '../common/Section';
import { LayerBadge } from '../sidebar/LayerBadge';
import { DetailHeader } from './DetailHeader';
import { ExerciseCard } from './ExerciseCard';

export function MuscleDetail({ muscle }: { muscle: MuscleInfo }) {
  const { t, l } = useI18n();
  const select = useViewerStore((s) => s.select);
  const region = REGIONS.find((r) => r.id === muscle.region);

  return (
    <div className="detail">
      <DetailHeader
        title={l(muscle.name)}
        subtitle={muscle.latin}
        accent={muscle.layer === 'deep' ? PALETTE.deepMuscle : PALETTE.muscle}
        tags={
          <>
            <LayerBadge layer={muscle.layer} />
            {region && <Chip>{l(region.name)}</Chip>}
          </>
        }
      />
      <p className="detail__summary">{l(muscle.summary)}</p>

      <Section title={t('muscle.functions')}>
        <ul className="bullet-list">
          {muscle.functions.map((f, i) => (
            <li key={i}>{l(f)}</li>
          ))}
        </ul>
      </Section>

      <Section title={t('muscle.originInsertion')}>
        <dl className="kv">
          <dt>{t('muscle.origin')}</dt>
          <dd>{l(muscle.origin)}</dd>
          <dt>{t('muscle.insertion')}</dt>
          <dd>{l(muscle.insertion)}</dd>
        </dl>
      </Section>

      <Section title={t('muscle.joints')}>
        <div className="chips">
          {muscle.joints.map((id) => (
            <Chip key={id} color={JOINT_TYPE_COLORS[JOINT_MAP[id].type]} onClick={() => select({ kind: 'joint', id })}>
              {l(JOINT_MAP[id].name)}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title={t('muscle.exercises')}>
        <div className="exercise-list">
          {muscle.exercises.map((ex, i) => (
            <ExerciseCard key={i} exercise={ex} />
          ))}
        </div>
      </Section>
    </div>
  );
}
