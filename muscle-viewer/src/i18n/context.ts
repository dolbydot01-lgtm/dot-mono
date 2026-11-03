import { createContext, useContext } from 'react';
import type { Lang, Localized } from '../data/types';
import type { MessageKey } from './messages';

export interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  /** Translate a UI string. */
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  /** Pick the current language from a localized data value. */
  l: (value: Localized) => string;
}

export const I18nContext = createContext<I18nValue | null>(null);

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
