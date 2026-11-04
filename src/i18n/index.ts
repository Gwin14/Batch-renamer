import { getLocales } from 'expo-localization';
import { create } from 'zustand';

import { getLang, matchLang, setLang, type Lang } from './core';

export { LANGS, getLang, langTag, m, tr, trn, type Lang } from './core';

export type LangPref = 'system' | Lang;

const useLangStore = create<{ lang: Lang }>(() => ({ lang: getLang() }));

export const deviceLang = (): Lang => matchLang(getLocales().map((l) => l.languageCode));

/** Applies the preference ("system" follows the device language). */
export function applyLangPref(pref: LangPref) {
  const lang = pref === 'system' ? deviceLang() : pref;
  setLang(lang);
  if (useLangStore.getState().lang !== lang) useLangStore.setState({ lang });
}

/** Subscribes a component to language changes so its tr() calls re-render. */
export const useLang = () => useLangStore((s) => s.lang);
