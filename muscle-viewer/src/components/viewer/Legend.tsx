import { JOINT_TYPE_COLORS, JOINT_TYPE_NAMES, PLANE_COLORS, PLANE_NAMES } from '../../data/joints';
import type { JointType, MotionPlane } from '../../data/types';
import { useI18n } from '../../i18n/context';
import { useViewerStore } from '../../store/viewerStore';

const SHOWN_TYPES: JointType[] = ['ball', 'hinge', 'pivot', 'condyloid', 'saddle', 'functional', 'cartilaginous'];

/** Explains joint colours and DOF ring colours; only shown when relevant. */
export function Legend() {
  const { t, l } = useI18n();
  const jointsVisible = useViewerStore((s) => s.layers.joints);
  const jointSelected = useViewerStore((s) => s.selection?.kind === 'joint');
  if (!jointsVisible) return null;

  return (
    <div className="overlay-card legend">
      <h4 className="overlay-card__title">{t('legend.title')}</h4>
      <ul className="legend__list">
        {SHOWN_TYPES.map((type) => (
          <li key={type}>
            <span className="legend__dot" style={{ background: JOINT_TYPE_COLORS[type] }} />
            {l(JOINT_TYPE_NAMES[type])}
          </li>
        ))}
      </ul>
      {jointSelected && (
        <>
          <h4 className="overlay-card__title legend__sub">{t('legend.planes')}</h4>
          <ul className="legend__list">
            {(Object.keys(PLANE_COLORS) as MotionPlane[]).map((p) => (
              <li key={p}>
                <span className="legend__line" style={{ background: PLANE_COLORS[p] }} />
                {l(PLANE_NAMES[p])}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
