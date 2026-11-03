import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang, Localized } from '../data/types';
import { MESSAGES, type MessageKey } from './messages';
import { I18nContext, type I18nValue } from './context';

const STORAGE_KEY = 'anatomy3d.lang';

function detectInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
    /* storage unavailable */
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(detectInitialLang);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage unavailable */
    }
  }, [lang]);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => {
      let text: string = MESSAGES[lang][key];
      if (vars) {
        for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, String(v));
      }
      return text;
    },
    [lang],
  );

  const l = useCallback((value: Localized) => value[lang], [lang]);

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, toggle: () => setLang((p) => (p === 'zh' ? 'en' : 'zh')), t, l }),
    [lang, t, l],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
