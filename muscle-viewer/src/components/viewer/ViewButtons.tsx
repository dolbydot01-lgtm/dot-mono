import { useI18n } from '../../i18n/context';
import type { MessageKey } from '../../i18n/messages';
import { useViewerStore, type ViewPreset } from '../../store/viewerStore';

const PRESETS: { preset: ViewPreset; label: MessageKey }[] = [
  { preset: 'front', label: 'view.front' },
  { preset: 'back', label: 'view.back' },
  { preset: 'left', label: 'view.left' },
  { preset: 'right', label: 'view.right' },
  { preset: 'reset', label: 'view.reset' },
];

export function ViewButtons() {
  const { t } = useI18n();
  const requestView = useViewerStore((s) => s.requestView);
  return (
    <div className="overlay-card view-buttons">
      {PRESETS.map(({ preset, label }) => (
        <button key={preset} type="button" className="btn btn--small" onClick={() => requestView(preset)}>
          {t(label)}
        </button>
      ))}
    </div>
  );
}
