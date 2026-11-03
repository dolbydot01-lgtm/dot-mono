import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/context';
import { useViewerStore } from '../../store/viewerStore';

interface DetailHeaderProps {
  title: string;
  subtitle?: string;
  tags?: ReactNode;
  accent: string;
}

export function DetailHeader({ title, subtitle, tags, accent }: DetailHeaderProps) {
  const { t } = useI18n();
  const select = useViewerStore((s) => s.select);
  return (
    <header className="detail-header" style={{ ['--detail-accent' as string]: accent }}>
      <div className="detail-header__main">
        <h2 className="detail-header__title">{title}</h2>
        {subtitle && <p className="detail-header__subtitle">{subtitle}</p>}
        {tags && <div className="chips detail-header__tags">{tags}</div>}
      </div>
      <button type="button" className="icon-btn" onClick={() => select(null)} aria-label={t('info.close')} title={t('info.close')}>
        ✕
      </button>
    </header>
  );
}
