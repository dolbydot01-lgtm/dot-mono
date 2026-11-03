import { lazy, Suspense } from 'react';
import { useI18n } from '../../i18n/context';
import { LayerPanel } from './LayerPanel';
import { Legend } from './Legend';
import { ViewButtons } from './ViewButtons';
import './viewer.css';

// three.js is the bulk of the bundle; load it after the UI shell renders.
const BodyScene = lazy(() => import('../../scene/BodyScene').then((m) => ({ default: m.BodyScene })));

export function Viewer() {
  const { t } = useI18n();
  return (
    <main className="viewer">
      <Suspense fallback={<div className="viewer__loading">{t('view.loading')}</div>}>
        <BodyScene />
      </Suspense>
      <div className="viewer__overlay viewer__overlay--top-left">
        <LayerPanel />
      </div>
      <div className="viewer__overlay viewer__overlay--top-right">
        <Legend />
      </div>
      <div className="viewer__overlay viewer__overlay--bottom">
        <ViewButtons />
        <p className="viewer__hint">{t('view.hint')}</p>
      </div>
    </main>
  );
}
