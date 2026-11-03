import { useI18n } from '../../i18n/context';

export function EmptyState() {
  const { t } = useI18n();
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden>
        🫀
      </div>
      <h2>{t('info.empty.title')}</h2>
      <p>{t('info.empty.body')}</p>
      <ul>
        <li>{t('info.empty.tip1')}</li>
        <li>{t('info.empty.tip2')}</li>
        <li>{t('info.empty.tip3')}</li>
      </ul>
    </div>
  );
}
