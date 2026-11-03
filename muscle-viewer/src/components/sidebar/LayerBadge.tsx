import type { MuscleLayer } from '../../data/types';
import { useI18n } from '../../i18n/context';

export function LayerBadge({ layer }: { layer: MuscleLayer }) {
  const { t } = useI18n();
  return (
    <span className={`layer-badge layer-badge--${layer}`}>
      {t(layer === 'deep' ? 'layer.deepShort' : 'layer.superficialShort')}
    </span>
  );
}
