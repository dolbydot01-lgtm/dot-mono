import { PLANE_COLORS, PLANE_NAMES } from '../../data/joints';
import type { DegreeOfFreedom } from '../../data/types';
import { useI18n } from '../../i18n/context';
import { useViewerStore } from '../../store/viewerStore';

/** One row per degree of freedom; hovering a row emphasises its ring in the 3D gizmo. */
export function DofTable({ dofs }: { dofs: DegreeOfFreedom[] }) {
  const { t, l } = useI18n();
  const activeDof = useViewerStore((s) => s.activeDof);
  const setActiveDof = useViewerStore((s) => s.setActiveDof);

  return (
    <div className="dof-table" onMouseLeave={() => setActiveDof(null)}>
      {dofs.map((dof, i) => (
        <div
          key={i}
          className={`dof-row ${activeDof === i ? 'is-active' : ''}`}
          style={{ ['--plane-color' as string]: PLANE_COLORS[dof.plane] }}
          onMouseEnter={() => setActiveDof(i)}
          onFocus={() => setActiveDof(i)}
          tabIndex={0}
        >
          <span className="dof-row__plane">{l(PLANE_NAMES[dof.plane])}</span>
          <span className="dof-row__movement">{l(dof.movement)}</span>
          <span className="dof-row__range">
            {t('joint.range')}: {l(dof.rangeText)}
          </span>
        </div>
      ))}
    </div>
  );
}
