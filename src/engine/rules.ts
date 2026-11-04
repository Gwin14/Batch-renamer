import { tr } from '../i18n/core';
import { formatDate } from './date';
import { renderTemplate, resolveCaptureDate, type TemplateContext } from './template';
import {
  applyCase,
  escapeRegex,
  formatNumber,
  joinName,
  removeAccents,
  removeEmoji,
  splitName,
} from './text';
import type { Rule, RuleTarget, RuleType } from './types';

export interface WorkingName {
  base: string;
  ext: string;
  subfolder: string;
}

/** Applies a transform to the right slice of the name according to the rule target. */
function onTarget(w: WorkingName, target: RuleTarget, fn: (s: string) => string): WorkingName {
  if (target === 'name') return { ...w, base: fn(w.base) };
  if (target === 'extension') return { ...w, ext: fn(w.ext) };
  const full = fn(joinName(w.base, w.ext));
  const { base, ext } = splitName(full);
  return { ...w, base, ext };
}

function buildRegex(find: string, opts: { useRegex: boolean; matchCase: boolean; firstOnly: boolean; wholeWord: boolean }): RegExp | null {
  if (!find) return null;
  let source = opts.useRegex ? find : escapeRegex(find);
  if (opts.wholeWord) source = `(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`;
  const flags = `${opts.firstOnly ? '' : 'g'}${opts.matchCase ? '' : 'i'}u`;
  try {
    return new RegExp(source, flags);
  } catch {
    return null;
  }
}

export function validateRegex(pattern: string): string | null {
  try {
    new RegExp(pattern, 'u');
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : tr('Expressão inválida');
  }
}

function place(base: string, value: string, position: 'start' | 'end' | 'replace', separator: string): string {
  if (position === 'replace') return value;
  if (!base) return value;
  return position === 'start' ? `${value}${separator}${base}` : `${base}${separator}${value}`;
}

export interface RuleRuntime {
  ctx: Omit<TemplateContext, 'name' | 'ext'>;
}

export function applyRule(rule: Rule, w: WorkingName, rt: RuleRuntime): WorkingName {
  const ctx = (cur: WorkingName): TemplateContext => ({ ...rt.ctx, name: cur.base, ext: cur.ext });

  switch (rule.type) {
    case 'replace': {
      const re = buildRegex(rule.find, rule);
      if (!re) return w;
      const replacement = rule.replace.includes('{') ? renderTemplate(rule.replace, ctx(w)) : rule.replace;
      return onTarget(w, rule.target, (s) =>
        rule.useRegex ? s.replace(re, replacement) : s.replace(re, () => replacement),
      );
    }
    case 'insert': {
      const text = renderTemplate(rule.text, ctx(w));
      const chars = Array.from(w.base);
      if (rule.position === 'start') return { ...w, base: text + w.base };
      if (rule.position === 'end') return { ...w, base: w.base + text };
      const raw = Math.max(0, Math.min(chars.length, rule.index));
      const at = rule.fromEnd ? chars.length - raw : raw;
      return { ...w, base: chars.slice(0, at).join('') + text + chars.slice(at).join('') };
    }
    case 'remove': {
      const chars = Array.from(w.base);
      switch (rule.mode) {
        case 'first':
          return { ...w, base: chars.slice(Math.max(0, rule.count)).join('') };
        case 'last':
          return { ...w, base: chars.slice(0, Math.max(0, chars.length - Math.max(0, rule.count))).join('') };
        case 'range': {
          const from = Math.max(1, rule.from) - 1;
          const to = Math.max(from, rule.to);
          return { ...w, base: chars.slice(0, from).join('') + chars.slice(to).join('') };
        }
        case 'digits':
          return { ...w, base: w.base.replace(/\p{N}/gu, '') };
        case 'letters':
          return { ...w, base: w.base.replace(/\p{L}/gu, '') };
        case 'symbols':
          return { ...w, base: w.base.replace(/[^\p{L}\p{N}\s]/gu, '') };
        case 'between': {
          if (!rule.open || !rule.close) return w;
          const re = new RegExp(`\\s*${escapeRegex(rule.open)}[^${escapeRegex(rule.close)}]*${escapeRegex(rule.close)}`, 'g');
          return { ...w, base: w.base.replace(re, '') };
        }
      }
      return w;
    }
    case 'case':
      return onTarget(w, rule.target, (s) => applyCase(s, rule.style));
    case 'numbering': {
      const idx = rule.perFolder ? rt.ctx.folderIndex : rt.ctx.index;
      const value = formatNumber(rule.start + idx * rule.step, rule.format, rule.pad);
      return { ...w, base: place(w.base, value, rule.position, rule.separator) };
    }
    case 'date': {
      const file = rt.ctx.file;
      const epoch =
        rule.source === 'now'
          ? rt.ctx.now
          : rule.source === 'taken'
            ? resolveCaptureDate(file)
            : rule.source === 'created'
              ? (file.createdAt ?? file.modifiedAt)
              : (file.modifiedAt ?? file.createdAt);
      if (epoch == null) return w;
      return { ...w, base: place(w.base, formatDate(epoch, rule.format || 'YYYY-MM-DD'), rule.position, rule.separator) };
    }
    case 'template': {
      if (!rule.template.trim()) return w;
      return { ...w, base: renderTemplate(rule.template, ctx(w)) };
    }
    case 'extension': {
      switch (rule.mode) {
        case 'lower':
          return { ...w, ext: w.ext.toLowerCase() };
        case 'upper':
          return { ...w, ext: w.ext.toUpperCase() };
        case 'remove':
          return { ...w, ext: '' };
        case 'set':
          return { ...w, ext: rule.value.replace(/^\.+/, '').trim() };
        case 'normalize': {
          const e = w.ext.toLowerCase();
          const map: Record<string, string> = { jpeg: 'jpg', jpe: 'jpg', tiff: 'tif', htm: 'html', mpeg: 'mpg', yml: 'yaml' };
          return { ...w, ext: map[e] ?? e };
        }
      }
      return w;
    }
    case 'clean': {
      let s = w.base;
      if (rule.removeCopySuffix) {
        s = s
          .replace(/\s*\((?:\d+|c[oó]pia|copy)\)\s*$/i, '')
          .replace(/\s*[-–]\s*(?:c[oó]pia|copy)(?:\s*\(?\d+\)?)?\s*$/i, '')
          .replace(/\s+(?:c[oó]pia|copy)(?:\s+\d+)?\s*$/i, '');
      }
      if (rule.removeEmoji) s = removeEmoji(s);
      if (rule.removeAccents) s = removeAccents(s);
      if (rule.removeSpecial) s = s.replace(/[^\p{L}\p{N}\s_\-.()]/gu, '');
      if (rule.collapseSpaces) s = s.replace(/\s{2,}/g, ' ');
      if (rule.trim) s = s.trim().replace(/^[\s_\-.]+|[\s_\-.]+$/g, '');
      const spaceMap = { keep: null, underscore: '_', dash: '-', dot: '.', remove: '' } as const;
      const rep = spaceMap[rule.spaces];
      if (rep !== null) s = s.replace(/\s+/g, rep);
      return { ...w, base: s };
    }
    case 'pad': {
      const digits = Math.max(1, Math.min(12, rule.digits));
      return { ...w, base: w.base.replace(/\d+/g, (m) => m.padStart(digits, '0')) };
    }
    case 'swap': {
      if (!rule.separator) return w;
      const i = w.base.indexOf(rule.separator);
      if (i < 0) return w;
      const left = w.base.slice(0, i);
      const right = w.base.slice(i + rule.separator.length);
      return { ...w, base: `${right.trim()}${rule.separator}${left.trim()}` };
    }
    case 'truncate': {
      const chars = Array.from(w.base);
      if (chars.length <= rule.max) return w;
      return { ...w, base: (rule.from === 'end' ? chars.slice(0, rule.max) : chars.slice(chars.length - rule.max)).join('').trim() };
    }
    case 'folder': {
      const raw = renderTemplate(rule.template, ctx(w));
      const clean = raw
        .split('/')
        .map((seg) => seg.replace(/[\\:*?"<>|]/g, '-').trim())
        .filter((seg) => seg && seg !== '.' && seg !== '..')
        .join('/');
      return { ...w, subfolder: clean };
    }
  }
}

let counter = 0;
export const newRuleId = () => `r${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Factory with sensible defaults for every rule type. */
export function createRule(type: RuleType): Rule {
  const base = { id: newRuleId(), enabled: true };
  switch (type) {
    case 'replace':
      return { ...base, type, find: '', replace: '', matchCase: false, useRegex: false, firstOnly: false, wholeWord: false, target: 'name' };
    case 'insert':
      return { ...base, type, text: '', position: 'start', index: 0, fromEnd: false };
    case 'remove':
      return { ...base, type, mode: 'first', count: 1, from: 1, to: 1, open: '(', close: ')' };
    case 'case':
      return { ...base, type, style: 'title', target: 'name' };
    case 'numbering':
      return { ...base, type, start: 1, step: 1, pad: 3, position: 'end', separator: '_', format: 'decimal', perFolder: false };
    case 'date':
      return { ...base, type, source: 'taken', format: 'YYYY-MM-DD', position: 'start', separator: '_' };
    case 'template':
      return { ...base, type, template: '{name}' };
    case 'extension':
      return { ...base, type, mode: 'lower', value: '' };
    case 'clean':
      return { ...base, type, trim: true, collapseSpaces: true, spaces: 'keep', removeAccents: false, removeEmoji: true, removeCopySuffix: true, removeSpecial: false };
    case 'pad':
      return { ...base, type, digits: 3 };
    case 'swap':
      return { ...base, type, separator: ' - ' };
    case 'truncate':
      return { ...base, type, max: 40, from: 'end' };
    case 'folder':
      return { ...base, type, template: '{taken:YYYY}/{taken:MM}' };
  }
}
