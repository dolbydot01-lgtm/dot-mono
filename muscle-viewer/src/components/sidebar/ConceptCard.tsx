import { JOINT_MAP, JOINT_TYPE_COLORS } from '../../data/joints';
import { MUSCLE_MAP } from '../../data/muscles';
import type { Concept } from '../../data/types';
import { useI18n } from '../../i18n/context';
import { useViewerStore } from '../../store/viewerStore';
import { Chip } from '../common/Chip';
import { PALETTE } from '../../scene/palette';

interface ConceptCardProps {
  concept: Concept;
  open: boolean;
  onToggle: () => void;
}

export function ConceptCard({ concept, open, onToggle }: ConceptCardProps) {
  const { t, l } = useI18n();
  const applyConcept = useViewerStore((s) => s.applyConcept);
  const clearHighlight = useViewerStore((s) => s.clearHighlight);
  const isApplied = useViewerStore((s) => s.highlight.conceptId === concept.id);
  const select = useViewerStore((s) => s.select);

  const muscles = concept.related.muscles ?? [];
  const joints = concept.related.joints ?? [];

  return (
    <article className={`concept ${open ? 'is-open' : ''} ${isApplied ? 'is-applied' : ''}`}>
      <button type="button" className="concept__header" onClick={onToggle} aria-expanded={open}>
        <span className="concept__icon" aria-hidden>
          {concept.icon}
        </span>
        <span className="concept__title">{l(concept.title)}</span>
        <span className={`list-group__caret ${open ? 'is-open' : ''}`}>▸</span>
      </button>

      {open && (
        <div className="concept__body">
          <p className="concept__summary">{l(concept.summary)}</p>
          {concept.body.map((p, i) => (
            <p key={i}>{l(p)}</p>
          ))}

          <dl className="concept__points">
            {concept.points.map((pt, i) => (
              <div key={i} className="concept__point">
                <dt>{l(pt.term)}</dt>
                <dd>{l(pt.text)}</dd>
              </div>
            ))}
          </dl>

          {(muscles.length > 0 || joints.length > 0) && (
            <>
              <h4 className="concept__subheading">{t('concept.related')}</h4>
              <div className="chips">
                {muscles.map((id) => (
                  <Chip key={id} color={PALETTE.muscle} onClick={() => select({ kind: 'muscle', id })}>
                    {l(MUSCLE_MAP[id].name)}
                  </Chip>
                ))}
                {joints.map((id) => (
                  <Chip key={id} color={JOINT_TYPE_COLORS[JOINT_MAP[id].type]} onClick={() => select({ kind: 'joint', id })}>
                    {l(JOINT_MAP[id].name)}
                  </Chip>
                ))}
              </div>
            </>
          )}

          <div className="concept__actions">
            <button type="button" className="btn btn--primary" onClick={() => applyConcept(concept)}>
              {t('concept.showIn3d')}
            </button>
            {isApplied && (
              <button type="button" className="btn" onClick={clearHighlight}>
                {t('concept.clear')}
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
