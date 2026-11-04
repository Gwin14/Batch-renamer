import { dateFromFileName, formatDate } from './date';
import { applyCase, formatBytes, kindOf, removeAccents, splitName } from './text';
import { m, tr } from '../i18n/core';

import type { CaseStyle, FileItem, FileKind } from './types';

/** Context available to every variable while computing one file's name. */
export interface TemplateContext {
  file: FileItem;
  /** Current base name (after previous rules) */
  name: string;
  /** Current extension (after previous rules) */
  ext: string;
  /** 0-based index of the file in the batch */
  index: number;
  /** 0-based index inside its folder */
  folderIndex: number;
  total: number;
  now: number;
}

export interface VariableDoc {
  token: string;
  label: string;
  description: string;
  example: string;
  group: 'Nome' | 'Contador' | 'Data' | 'Arquivo' | 'Mídia' | 'Únicos';
}

/** pt-BR source of the variable catalog (variable picker + help). */
const VARIABLE_SOURCE: VariableDoc[] = [
  { token: '{name}', label: m('Nome atual'), description: m('Nome sem extensão, já com as regras anteriores'), example: 'IMG_4821', group: 'Nome' },
  { token: '{original}', label: m('Nome original'), description: m('Nome antes de qualquer regra'), example: 'IMG_4821', group: 'Nome' },
  { token: '{ext}', label: m('Extensão'), description: m('Extensão sem o ponto'), example: 'jpg', group: 'Nome' },
  { token: '{word:1}', label: m('Palavra'), description: m('N-ésima palavra do nome'), example: 'IMG', group: 'Nome' },
  { token: '{n}', label: m('Número'), description: m('Sequência 1, 2, 3…'), example: '1', group: 'Contador' },
  { token: '{n:3}', label: m('Número com zeros'), description: m('Sequência com 3 dígitos'), example: '001', group: 'Contador' },
  { token: '{n:2:10}', label: m('Começando em 10'), description: m('{n:dígitos:início}'), example: '10', group: 'Contador' },
  { token: '{fn:2}', label: m('Número na pasta'), description: m('Recomeça a cada pasta'), example: '01', group: 'Contador' },
  { token: '{total}', label: m('Total'), description: m('Quantidade de arquivos no lote'), example: '24', group: 'Contador' },
  { token: '{taken:YYYY-MM-DD}', label: m('Data da captura'), description: m('EXIF ou data no nome; senão criação'), example: '2024-05-17', group: 'Data' },
  { token: '{created:YYYY-MM-DD}', label: m('Data de criação'), description: m('Quando o arquivo foi criado'), example: '2024-05-17', group: 'Data' },
  { token: '{modified:YYYY-MM-DD}', label: m('Data de modificação'), description: m('Última alteração'), example: '2024-06-02', group: 'Data' },
  { token: '{date:YYYY-MM-DD}', label: m('Hoje'), description: m('Data atual'), example: '2026-11-02', group: 'Data' },
  { token: '{taken:HH-mm-ss}', label: m('Hora da captura'), description: m('Hora, minuto e segundo'), example: '14-22-09', group: 'Data' },
  { token: '{folder}', label: m('Pasta'), description: m('Nome da pasta de origem'), example: m('Viagem'), group: 'Arquivo' },
  { token: '{size}', label: m('Tamanho'), description: m('Tamanho legível'), example: '2,4 MB', group: 'Arquivo' },
  { token: '{type}', label: m('Tipo'), description: m('foto, video, audio, documento…'), example: m('foto'), group: 'Arquivo' },
  { token: '{dims}', label: m('Dimensões'), description: m('Largura x altura'), example: '4032x3024', group: 'Mídia' },
  { token: '{w}', label: m('Largura'), description: m('Largura em pixels'), example: '4032', group: 'Mídia' },
  { token: '{h}', label: m('Altura'), description: m('Altura em pixels'), example: '3024', group: 'Mídia' },
  { token: '{orientation}', label: m('Orientação'), description: m('retrato, paisagem ou quadrado'), example: m('paisagem'), group: 'Mídia' },
  { token: '{duration}', label: m('Duração'), description: m('Duração de vídeo/áudio (mm-ss)'), example: '01-32', group: 'Mídia' },
  { token: '{rand:6}', label: m('Aleatório'), description: m('Letras e números, estável na prévia'), example: 'k3f9qz', group: 'Únicos' },
  { token: '{uid}', label: m('ID curto'), description: m('Identificador único de 8 caracteres'), example: '9f2c7a1b', group: 'Únicos' },
];

/** The catalog shown in the UI, translated to the current language. */
export const variables = (): VariableDoc[] => VARIABLE_SOURCE.map((v) => ({ ...v, label: tr(v.label), description: tr(v.description), example: tr(v.example) }));

const FILTER_SOURCE: { token: string; description: string }[] = [
  { token: '|upper', description: m('MAIÚSCULAS') },
  { token: '|lower', description: m('minúsculas') },
  { token: '|title', description: m('Título') },
  { token: '|kebab', description: m('texto-com-hifen') },
  { token: '|snake', description: m('texto_com_underline') },
  { token: '|camel', description: 'camelCase' },
  { token: '|ascii', description: m('Remove acentos') },
  { token: '|slice:0:8', description: m('Recorta caracteres') },
  { token: '|pad:4', description: m('Completa com zeros') },
  { token: '|replace:a:b', description: m('Troca texto') },
  { token: '|default:x', description: m('Valor se vazio') },
];

export const filters = () => FILTER_SOURCE.map((f) => ({ ...f, description: tr(f.description) }));

const KIND_LABEL: Record<FileKind, string> = {
  image: m('foto'),
  video: 'video',
  audio: 'audio',
  document: m('documento'),
  archive: m('arquivo'),
  code: m('codigo'),
  other: m('outro'),
};

/** Deterministic string hash (FNV-1a) so previews equal the applied result. */
export function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function seededChars(seed: string, length: number, alphabet: string): string {
  let state = hash(seed) || 1;
  let out = '';
  for (let i = 0; i < length; i++) {
    // xorshift32
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    out += alphabet[(state >>> 0) % alphabet.length];
  }
  return out;
}

export function resolveCaptureDate(file: FileItem): number | null {
  return file.takenAt ?? dateFromFileName(file.name) ?? file.createdAt ?? file.modifiedAt ?? null;
}

const CASE_FILTERS: Record<string, CaseStyle> = {
  upper: 'upper',
  lower: 'lower',
  title: 'title',
  sentence: 'sentence',
  kebab: 'kebab',
  snake: 'snake',
  camel: 'camel',
  pascal: 'pascal',
};

function applyFilter(value: string, name: string, args: string[]): string {
  if (CASE_FILTERS[name]) return applyCase(value, CASE_FILTERS[name]);
  switch (name) {
    case 'ascii':
      return removeAccents(value);
    case 'trim':
      return value.trim();
    case 'slice': {
      const a = Number(args[0] ?? 0);
      const b = args[1] !== undefined && args[1] !== '' ? Number(args[1]) : undefined;
      return Array.from(value).slice(a, b).join('');
    }
    case 'first':
      return Array.from(value).slice(0, Number(args[0] ?? 1)).join('');
    case 'last':
      return Array.from(value).slice(-Number(args[0] ?? 1)).join('');
    case 'pad':
      return value.padStart(Number(args[0] ?? 2), args[1] ?? '0');
    case 'replace':
      return args[0] ? value.split(args[0]).join(args[1] ?? '') : value;
    case 'default':
      return value === '' ? (args[0] ?? '') : value;
    default:
      return value;
  }
}

function dateVar(epoch: number | null, args: string[]): string {
  if (epoch == null) return '';
  return formatDate(epoch, args.length ? args.join(':') : 'YYYY-MM-DD');
}

function resolveVariable(key: string, args: string[], ctx: TemplateContext): string | undefined {
  const { file } = ctx;
  switch (key) {
    case 'name':
      return ctx.name;
    case 'original':
      return splitName(file.name).base;
    case 'ext':
      return ctx.ext;
    case 'word': {
      const ws = ctx.name.split(/[\s_\-.]+/).filter(Boolean);
      const i = Number(args[0] ?? 1);
      return i < 0 ? (ws[ws.length + i] ?? '') : (ws[i - 1] ?? '');
    }
    case 'n':
    case 'fn': {
      const digits = Number(args[0] ?? 1);
      const start = args[1] !== undefined ? Number(args[1]) : 1;
      const step = args[2] !== undefined ? Number(args[2]) : 1;
      const idx = key === 'fn' ? ctx.folderIndex : ctx.index;
      return String(start + idx * step).padStart(digits, '0');
    }
    case 'i':
      return String(ctx.index);
    case 'total':
      return String(ctx.total);
    case 'date':
    case 'now':
      return dateVar(ctx.now, args);
    case 'taken':
      return dateVar(resolveCaptureDate(file), args);
    case 'created':
      return dateVar(file.createdAt ?? file.modifiedAt, args);
    case 'modified':
      return dateVar(file.modifiedAt ?? file.createdAt, args);
    case 'folder':
      return file.folder;
    case 'size':
      return formatBytes(file.size);
    case 'bytes':
      return String(file.size);
    case 'type':
      return tr(KIND_LABEL[kindOf(file.name)]);
    case 'w':
      return file.width ? String(file.width) : '';
    case 'h':
      return file.height ? String(file.height) : '';
    case 'dims':
      return file.width && file.height ? `${file.width}x${file.height}` : '';
    case 'orientation':
      if (!file.width || !file.height) return '';
      return file.width === file.height ? tr('quadrado') : file.width > file.height ? tr('paisagem') : tr('retrato');
    case 'duration': {
      if (!file.duration) return '';
      const total = Math.round(file.duration);
      return `${String(Math.floor(total / 60)).padStart(2, '0')}-${String(total % 60).padStart(2, '0')}`;
    }
    case 'rand':
      return seededChars(`${file.id}:${ctx.index}:rand`, Number(args[0] ?? 6), 'abcdefghijkmnpqrstuvwxyz23456789');
    case 'uid':
      return seededChars(`${file.id}:uid`, Number(args[0] ?? 8), '0123456789abcdef');
    default:
      return undefined;
  }
}

/** Splits on ':' keeping empty parts. */
const splitArgs = (s: string) => s.split(':');

/**
 * Renders a template. Unknown variables are left untouched (so the user sees the typo in the preview).
 * Use `{{` and `}}` for literal braces.
 */
export function renderTemplate(template: string, ctx: TemplateContext): string {
  if (!template.includes('{')) return template;
  const OPEN = '\u0001';
  const CLOSE = '\u0002';
  const escaped = template.replace(/\{\{/g, OPEN).replace(/\}\}/g, CLOSE);
  const out = escaped.replace(/\{([^{}]+)\}/g, (whole, body: string) => {
    const [head, ...filters] = body.split('|');
    const [key, ...args] = splitArgs(head.trim());
    let value = resolveVariable(key.trim(), args, ctx);
    if (value === undefined) return whole;
    for (const f of filters) {
      const [fname, ...fargs] = splitArgs(f.trim());
      value = applyFilter(value, fname, fargs);
    }
    return value;
  });
  return out.replace(new RegExp(OPEN, 'g'), '{').replace(new RegExp(CLOSE, 'g'), '}');
}

/** Returns variables used in a template that the engine doesn't know, for inline validation. */
export function unknownVariables(template: string): string[] {
  const known = new Set(['name', 'original', 'ext', 'word', 'n', 'fn', 'i', 'total', 'date', 'now', 'taken', 'created', 'modified', 'folder', 'size', 'bytes', 'type', 'w', 'h', 'dims', 'orientation', 'duration', 'rand', 'uid']);
  const unknown: string[] = [];
  template.replace(/\{\{|\}\}/g, '').replace(/\{([^{}]+)\}/g, (_, body: string) => {
    const key = body.split('|')[0].split(':')[0].trim();
    if (!known.has(key)) unknown.push(key);
    return '';
  });
  return unknown;
}
