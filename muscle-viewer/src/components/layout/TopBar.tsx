import { useI18n } from '../../i18n/context';
import { LanguageSwitch } from './LanguageSwitch';
import './layout.css';

export type AppMode = 'explore' | 'video' | 'exam';

const MODE_LABELS = { explore: 'mode.explore', video: 'mode.video', exam: 'mode.exam' } as const;

export function TopBar({ mode, onModeChange }: { mode: AppMode; onModeChange: (mode: AppMode) => void }) {
  const { t } = useI18n();
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <img src="/favicon.svg" alt="" className="topbar__logo" />
        <div>
          <h1 className="topbar__title">{t('app.title')}</h1>
          <p className="topbar__subtitle">{t('app.subtitle')}</p>
        </div>
      </div>
      <nav className="mode-switch" aria-label="Mode">
        {(['explore', 'video', 'exam'] as const).map((m) => (
          <button key={m} type="button" className={`mode-switch__btn ${mode === m ? 'is-active' : ''}`} aria-current={mode === m} onClick={() => onModeChange(m)}>
            {t(MODE_LABELS[m])}
          </button>
        ))}
      </nav>
      <LanguageSwitch />
    </header>
  );
}
