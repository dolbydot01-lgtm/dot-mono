import type { BoneInfo } from '../../data/types';
import { useI18n } from '../../i18n/context';
import { PALETTE } from '../../scene/palette';
import { Chip } from '../common/Chip';
import { Section } from '../common/Section';
import { DetailHeader } from './DetailHeader';

export function BoneDetail({ bone }: { bone: BoneInfo }) {
  const { t, l } = useI18n();
  return (
    <div className="detail">
      <DetailHeader
        title={l(bone.name)}
        subtitle={bone.latin}
        accent={PALETTE.bone}
        tags={
          <>
            <Chip>{t(bone.category === 'axial' ? 'bone.axial' : 'bone.appendicular')}</Chip>
            <Chip>
              {t('bone.count')}: {bone.count}
            </Chip>
          </>
        }
      />
      <p className="detail__summary">{l(bone.summary)}</p>
      <Section title={t('bone.features')}>
        <ul className="bullet-list">
          {bone.features.map((f, i) => (
            <li key={i}>{l(f)}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
