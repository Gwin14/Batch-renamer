import { getLang, m, tr, type Lang } from '../i18n/core';

/** Month and weekday names follow the app language (used by MMMM / dddd in names). */
const MONTHS: Record<Lang, string[]> = {
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
};
const WEEKDAYS: Record<Lang, string[]> = {
  pt: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
};

const pad = (n: number, l = 2) => String(n).padStart(l, '0');

/**
 * Formats a date using tokens:
 * YYYY YY MMMM MMM MM M DD D dddd ddd HH H hh mm ss A Q W
 * Text inside [brackets] is kept literally.
 */
export function formatDate(epoch: number, format: string): string {
  const d = new Date(epoch);
  if (Number.isNaN(d.getTime())) return '';
  const months = MONTHS[getLang()];
  const weekdays = WEEKDAYS[getLang()];
  const tokens: Record<string, () => string> = {
    YYYY: () => String(d.getFullYear()),
    YY: () => String(d.getFullYear()).slice(-2),
    MMMM: () => months[d.getMonth()],
    MMM: () => months[d.getMonth()].slice(0, 3),
    MM: () => pad(d.getMonth() + 1),
    M: () => String(d.getMonth() + 1),
    DD: () => pad(d.getDate()),
    D: () => String(d.getDate()),
    dddd: () => weekdays[d.getDay()],
    ddd: () => weekdays[d.getDay()].slice(0, 3),
    HH: () => pad(d.getHours()),
    H: () => String(d.getHours()),
    hh: () => pad(d.getHours() % 12 || 12),
    mm: () => pad(d.getMinutes()),
    ss: () => pad(d.getSeconds()),
    A: () => (d.getHours() < 12 ? 'AM' : 'PM'),
    Q: () => String(Math.floor(d.getMonth() / 3) + 1),
    W: () => pad(isoWeek(d)),
  };
  return format.replace(/\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|DD|D|dddd|ddd|HH|H|hh|mm|ss|A|Q|W/g, (m, literal) => {
    if (literal !== undefined) return literal;
    return tokens[m]?.() ?? m;
  });
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Date presets offered in the rule editor; labels and the long format follow the app language. */
export const dateFormats = (): { format: string; label: string }[] => [
  { format: 'YYYY-MM-DD', label: 'ISO' },
  { format: 'YYYYMMDD', label: tr('Compacto') },
  { format: 'DD-MM-YYYY', label: tr('Brasileiro') },
  { format: 'YYYY-MM-DD_HH-mm-ss', label: tr('Com hora') },
  { format: 'YYYY/MM', label: tr('Ano/Mês') },
  { format: tr(m('D [de] MMMM [de] YYYY')), label: tr('Por extenso') },
];

/** Parses EXIF "2024:05:17 14:22:09" into epoch ms (local time). */
export function parseExifDate(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = value.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, da, h, mi, s] = m.map(Number);
  const t = new Date(y, mo - 1, da, h, mi, s).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Pulls a capture date from common filename patterns (IMG_20240517_142209, Screenshot 2024-05-17 at 14.22.09). */
export function dateFromFileName(name: string): number | null {
  const m = name.match(/(20\d{2}|19\d{2})[-_.]?(\d{2})[-_.]?(\d{2})(?:[ _T-]*(?:at )?(\d{2})[-_.:h]?(\d{2})[-_.:m]?(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m;
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const t = new Date(Number(y), month - 1, day, Number(h), Number(mi), Number(s)).getTime();
  return Number.isNaN(t) ? null : t;
}
