/**
 * Framework-free translation core (also used by the engine and its tests).
 * Portuguese (pt-BR) is the source language: the pt string itself is the key,
 * and each locale maps it to a translation. Missing keys fall back to Portuguese.
 */
import de from './locales/de';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';

export type Lang = 'pt' | 'en' | 'es' | 'fr' | 'de';
export type Dictionary = Record<string, string>;

export const LANGS: { code: Lang; name: string; tag: string }[] = [
  { code: 'en', name: 'English', tag: 'en-US' },
  { code: 'pt', name: 'Português (Brasil)', tag: 'pt-BR' },
  { code: 'es', name: 'Español', tag: 'es-ES' },
  { code: 'fr', name: 'Français', tag: 'fr-FR' },
  { code: 'de', name: 'Deutsch', tag: 'de-DE' },
];

export const DICTIONARIES: Record<Exclude<Lang, 'pt'>, Dictionary> = { en, es, fr, de };

let current: Lang = 'pt';

export const getLang = () => current;
export const setLang = (lang: Lang) => {
  current = lang;
};
/** BCP 47 tag for Intl / toLocaleString. */
export const langTag = () => LANGS.find((l) => l.code === current)!.tag;

/** Picks the first supported language from the device's preference list. */
export function matchLang(codes: (string | null | undefined)[]): Lang {
  for (const code of codes) {
    const c = code?.toLowerCase().split(/[-_]/)[0];
    if (c && LANGS.some((l) => l.code === c)) return c as Lang;
  }
  return 'en';
}

/** Translates a pt-BR source string. `{{key}}` placeholders are filled from params. */
export function tr(source: string, params?: Record<string, string | number>): string {
  const text = current === 'pt' ? source : (DICTIONARIES[current][source] ?? source);
  if (!params) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (whole, k: string) => (k in params ? String(params[k]) : whole));
}

/** Plural helper: picks the singular source when n === 1 and passes {{n}}. */
export function trn(n: number, one: string, other: string, params?: Record<string, string | number>): string {
  return tr(n === 1 ? one : other, { n: n.toLocaleString(langTag()), ...params });
}

/** Marks a string for extraction without translating it yet (translate at display time with tr). */
export const m = (source: string) => source;
