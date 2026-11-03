import { useState } from 'react';
import { useI18n } from '../../i18n/context';
import type { MessageKey } from '../../i18n/messages';
import { PALETTE } from '../../scene/palette';
import { useViewerStore, type LayerKey } from '../../store/viewerStore';

const LAYERS: { key: LayerKey; label: MessageKey; color: string }[] = [
  { key: 'skeleton', label: 'layer.skeleton', color: PALETTE.bone },
  { key: 'superficial', label: 'layer.superficial', color: PALETTE.muscle },
  { key: 'deep', label: 'layer.deep', color: PALETTE.deepMuscle },
  { key: 'joints', label: 'layer.joints', color: '#4fc3f7' },
];

// Start collapsed on phones so the panel doesn't cover the model.
const startCollapsed = () => window.matchMedia('(max-width: 760px)').matches;

export function LayerPanel() {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(startCollapsed);
  const layers = useViewerStore((s) => s.layers);
  const setLayer = useViewerStore((s) => s.setLayer);
  const opacity = useViewerStore((s) => s.superficialOpacity);
  const setOpacity = useViewerStore((s) => s.setSuperficialOpacity);
  const showFibers = useViewerStore((s) => s.showFibers);
  const setShowFibers = useViewerStore((s) => s.setShowFibers);

  return (
    <div className="overlay-card layer-panel">
      <button
        type="button"
        className="overlay-card__title overlay-card__toggle"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <span className={`list-group__caret ${collapsed ? '' : 'is-open'}`}>▸</span>
        {t('layer.title')}
      </button>
      {!collapsed && (
        <>
          {LAYERS.map(({ key, label, color }) => (
            <label key={key} className="toggle">
              <input type="checkbox" checked={layers[key]} onChange={(e) => setLayer(key, e.target.checked)} />
              <span className="toggle__swatch" style={{ background: color }} />
              <span>{t(label)}</span>
            </label>
          ))}
          <label className="toggle toggle--divided">
            <input type="checkbox" checked={showFibers} onChange={(e) => setShowFibers(e.target.checked)} />
            <span className="toggle__swatch toggle__swatch--fibers" />
            <span>{t('layer.fibers')}</span>
          </label>
          <label className={`slider ${layers.superficial ? '' : 'is-disabled'}`}>
            <span className="slider__label">
              {t('layer.opacity')} <b>{Math.round(opacity * 100)}%</b>
            </span>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={opacity}
              disabled={!layers.superficial}
              onChange={(e) => setOpacity(Number(e.target.value))}
            />
          </label>
        </>
      )}
    </div>
  );
}
