import { useContext } from 'react';
import type { Localized } from '../../data/types';
import { useI18n } from '../../i18n/context';
import { BilingualContext } from './bilingualContext';

export function Bi({ value, className = '' }: { value: Localized; className?: string }) {
  const { lang } = useI18n();
  const both = useContext(BilingualContext);
  const other = lang === 'zh' ? 'en' : 'zh';
  return (
    <span className={`bi ${className}`}>
      <span className="bi__main">{value[lang]}</span>
      {both && value[other] !== value[lang] && <span className="bi__alt">{value[other]}</span>}
    </span>
  );
}
