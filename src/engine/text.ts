import type { CaseStyle, FileKind, NumberFormat } from './types';

/** Characters that are invalid on at least one of iOS / Android / Windows (for exports). */
export const INVALID_CHARS = /[\/\\:*?"<>|\u0000-\u001f]/g;

export function splitName(fullName: string): { base: string; ext: string } {
  // Dotfiles (".env") have no extension; "archive.tar.gz" keeps ".gz" as extension.
  const idx = fullName.lastIndexOf('.');
  if (idx <= 0 || idx === fullName.length - 1) return { base: fullName, ext: '' };
  return { base: fullName.slice(0, idx), ext: fullName.slice(idx + 1) };
}

export function joinName(base: string, ext: string): string {
  return ext ? `${base}.${ext}` : base;
}

export function removeAccents(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/ø/g, 'o')
    .replace(/Ø/g, 'O')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE');
}

const EMOJI = /(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|‍|️)/gu;

export function removeEmoji(input: string): string {
  return input.replace(EMOJI, '');
}

/** Splits into words, understanding camelCase, separators and digit runs. */
export function words(input: string): string[] {
  return input
    .replace(/([a-zà-ÿ])([A-ZÀ-Þ])/g, '$1 $2')
    .replace(/([A-ZÀ-Þ]+)([A-ZÀ-Þ][a-zà-ÿ])/g, '$1 $2')
    .split(/[\s_\-.]+/)
    .filter(Boolean);
}

const capitalize = (w: string) => (w ? w.charAt(0).toLocaleUpperCase('pt-BR') + w.slice(1).toLocaleLowerCase('pt-BR') : w);

/** Short words kept lowercase in Title Case (pt-BR + en) unless first. */
const SMALL_WORDS = new Set(['a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'para', 'por', 'com', 'of', 'the', 'and', 'in', 'on', 'to', 'for']);

export function applyCase(input: string, style: CaseStyle): string {
  switch (style) {
    case 'lower':
      return input.toLocaleLowerCase('pt-BR');
    case 'upper':
      return input.toLocaleUpperCase('pt-BR');
    case 'title':
      return input.replace(/[^\s_\-.]+/g, (w, offset: number) => {
        const lower = w.toLocaleLowerCase('pt-BR');
        if (offset > 0 && SMALL_WORDS.has(lower)) return lower;
        return capitalize(w);
      });
    case 'sentence': {
      const lower = input.toLocaleLowerCase('pt-BR');
      return lower.replace(/\p{L}/u, (c) => c.toLocaleUpperCase('pt-BR'));
    }
    case 'camel': {
      const ws = words(input);
      return ws.map((w, i) => (i === 0 ? w.toLocaleLowerCase('pt-BR') : capitalize(w))).join('');
    }
    case 'pascal':
      return words(input).map(capitalize).join('');
    case 'snake':
      return words(input).map((w) => w.toLocaleLowerCase('pt-BR')).join('_');
    case 'kebab':
      return words(input).map((w) => w.toLocaleLowerCase('pt-BR')).join('-');
    case 'invert':
      return Array.from(input)
        .map((c) => {
          const up = c.toLocaleUpperCase('pt-BR');
          return c === up ? c.toLocaleLowerCase('pt-BR') : up;
        })
        .join('');
  }
}

export function toRoman(n: number): string {
  if (n <= 0 || n >= 4000) return String(n);
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  let rest = n;
  for (const [v, s] of map) {
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  }
  return out;
}

/** 1 → a, 26 → z, 27 → aa (spreadsheet style) */
export function toAlpha(n: number): string {
  if (n <= 0) return String(n);
  let out = '';
  let rest = n;
  while (rest > 0) {
    const r = (rest - 1) % 26;
    out = String.fromCharCode(97 + r) + out;
    rest = Math.floor((rest - 1) / 26);
  }
  return out;
}

export function formatNumber(n: number, format: NumberFormat, pad: number): string {
  let s: string;
  switch (format) {
    case 'roman':
      return toRoman(n);
    case 'alpha':
      return toAlpha(n);
    case 'hex':
      s = Math.abs(n).toString(16).toUpperCase();
      break;
    default:
      s = String(Math.abs(n));
  }
  const padded = s.padStart(Math.max(0, pad), '0');
  return n < 0 ? `-${padded}` : padded;
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Natural, locale-aware comparison: "img2" < "img10" */
const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
export function naturalCompare(a: string, b: string): number {
  return collator.compare(a, b);
}

export function sanitize(name: string): string {
  return name.replace(INVALID_CHARS, '-');
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const rounded = v >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${String(rounded).replace('.', ',')} ${units[i]}`;
}

const KIND_BY_EXT: Record<string, FileKind> = {};
const reg = (kind: FileKind, exts: string) => exts.split(' ').forEach((e) => (KIND_BY_EXT[e] = kind));
reg('image', 'jpg jpeg png gif heic heif webp bmp tiff tif raw dng cr2 nef arw svg avif');
reg('video', 'mp4 mov m4v avi mkv webm 3gp hevc');
reg('audio', 'mp3 m4a wav aac flac ogg opus aiff caf');
reg('document', 'pdf doc docx xls xlsx ppt pptx txt rtf md pages numbers key odt ods csv epub');
reg('archive', 'zip rar 7z tar gz tgz bz2 xz');
reg('code', 'js ts tsx jsx json html css py swift kt java c cpp h rb go rs sh yml yaml xml');

export function kindOf(fileName: string): FileKind {
  const { ext } = splitName(fileName);
  return KIND_BY_EXT[ext.toLowerCase()] ?? 'other';
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', heic: 'image/heic',
  heif: 'image/heif', webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4', mov: 'video/quicktime',
  m4v: 'video/x-m4v', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', pdf: 'application/pdf',
  txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', json: 'application/json', zip: 'application/zip',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function mimeOf(fileName: string): string {
  const { ext } = splitName(fileName);
  return MIME_BY_EXT[ext.toLowerCase()] ?? 'application/octet-stream';
}
