import { JOINT_TYPE_COLORS, JOINT_TYPE_NAMES } from '../../data/joints';
import { MUSCLES } from '../../data/muscles';
import type { JointInfo } from '../../data/types';
import { useI18n } from '../../i18n/context';
import { PALETTE } from '../../scene/palette';
import { useViewerStore } from '../../store/viewerStore';
import { Chip } from '../common/Chip';
import { Section } from '../common/Section';
import { DetailHeader } from './DetailHeader';
import { DofTable } from './DofTable';

export function JointDetail({ joint }: { joint: JointInfo }) {
  const { t, l } = useI18n();
  const select = useViewerStore((s) => s.select);
  const muscles = MUSCLES.filter((m) => m.joints.includes(joint.id));
  const color = JOINT_TYPE_COLORS[joint.type];

  return (
    <div className="detail">
      <DetailHeader
        title={l(joint.name)}
        accent={color}
        tags={
          <>
            <Chip color={color}>{l(JOINT_TYPE_NAMES[joint.type])}</Chip>
            <Chip>{t('joint.dofCount', { n: joint.dofs.length })}</Chip>
          </>
        }
      />
      <p className="detail__summary">{l(joint.summary)}</p>

      <Section title={t('joint.dof')}>
        <p className="muted small">{t('joint.dofHint')}</p>
        <DofTable dofs={joint.dofs} />
      </Section>

      <Section title={t('joint.notes')}>
        <ul className="bullet-list">
          {joint.notes.map((n, i) => (
            <li key={i}>{l(n)}</li>
          ))}
        </ul>
      </Section>

      {muscles.length > 0 && (
        <Section title={t('joint.muscles')}>
          <div className="chips">
            {muscles.map((m) => (
              <Chip
                key={m.id}
                color={m.layer === 'deep' ? PALETTE.deepMuscle : PALETTE.muscle}
                onClick={() => select({ kind: 'muscle', id: m.id })}
              >
                {l(m.name)}
              </Chip>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
