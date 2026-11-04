import { m, tr } from '../i18n/core';

import type { CaseStyle, Rule, RuleType } from './types';

export interface RuleMeta {
  type: RuleType;
  title: string;
  description: string;
  /** SF Symbol (iOS) */
  sf: string;
  /** Material Symbol (Android / web) */
  md: string;
  /** pt-BR group name (translate with tr when shown) */
  group: 'Texto' | 'Sequência e data' | 'Limpeza' | 'Organização';
}

/** Title and description are pt-BR source strings, translated on every read. */
const meta = (type: RuleType, title: string, description: string, sf: string, md: string, group: RuleMeta['group']): RuleMeta => ({
  type,
  sf,
  md,
  group,
  get title() {
    return tr(title);
  },
  get description() {
    return tr(description);
  },
});

export const RULES: RuleMeta[] = [
  meta('template', m('Novo nome'), m('Monte o nome inteiro com variáveis'), 'textformat.abc', 'text_fields', 'Texto'),
  meta('replace', m('Substituir'), m('Trocar texto, com suporte a regex'), 'arrow.left.arrow.right', 'find_replace', 'Texto'),
  meta('insert', m('Inserir'), m('Adicionar texto no início, fim ou posição'), 'text.insert', 'add_notes', 'Texto'),
  meta('remove', m('Remover'), m('Cortar caracteres, dígitos ou trechos'), 'scissors', 'content_cut', 'Texto'),
  meta('case', m('Maiúsc. / minúsc.'), m('Título, kebab-case, snake_case…'), 'textformat', 'match_case', 'Texto'),
  meta('swap', m('Inverter partes'), m('“Artista - Música” → “Música - Artista”'), 'arrow.triangle.swap', 'swap_horiz', 'Texto'),
  meta('numbering', m('Numeração'), m('Sequência, romanos, letras ou hex'), 'number', 'tag', 'Sequência e data'),
  meta('date', m('Data'), m('Data da captura, criação ou hoje'), 'calendar', 'calendar_today', 'Sequência e data'),
  meta('pad', m('Zeros à esquerda'), m('“foto 2” → “foto 002”, ordena certo'), 'textformat.123', 'pin', 'Sequência e data'),
  meta('clean', m('Limpar'), m('Espaços, acentos, emoji e “(1)”'), 'wand.and.stars', 'mop', 'Limpeza'),
  meta('truncate', m('Limitar tamanho'), m('Cortar nomes longos demais'), 'arrow.right.to.line', 'short_text', 'Limpeza'),
  meta('extension', m('Extensão'), m('Minúsculas, trocar ou normalizar'), 'doc.badge.gearshape', 'extension', 'Limpeza'),
  meta('folder', m('Organizar em pastas'), m('Mover para subpastas por ano, tipo…'), 'folder.badge.plus', 'create_new_folder', 'Organização'),
];

export const RULE_META: Record<RuleType, RuleMeta> = Object.fromEntries(RULES.map((r) => [r.type, r])) as Record<RuleType, RuleMeta>;

const CASE_SOURCE: Record<CaseStyle, string> = {
  title: m('Título'),
  sentence: m('Frase'),
  lower: m('minúsculas'),
  upper: m('MAIÚSCULAS'),
  camel: 'camelCase',
  pascal: 'PascalCase',
  snake: 'snake_case',
  kebab: 'kebab-case',
  invert: m('iNVERTER'),
};

/** Localized labels for each case style. */
export const CASE_LABELS = new Proxy(CASE_SOURCE, { get: (src, k: string) => tr(src[k as CaseStyle] ?? k) });

const q = (s: string) => `“${s}”`;

/** One-line human summary of a rule, used on rule cards. */
export function summarizeRule(rule: Rule): string {
  switch (rule.type) {
    case 'replace':
      if (!rule.find) return tr('Defina o texto a procurar');
      return `${q(rule.find)} → ${rule.replace ? q(rule.replace) : tr('nada')}${rule.useRegex ? ' · regex' : ''}`;
    case 'insert': {
      if (!rule.text) return tr('Defina o texto');
      const where = rule.position === 'start' ? tr('no início') : rule.position === 'end' ? tr('no fim') : tr('na posição {{i}}', { i: rule.index });
      return `${q(rule.text)} ${where}`;
    }
    case 'remove':
      switch (rule.mode) {
        case 'first':
          return tr('Primeiros {{n}} caracteres', { n: rule.count });
        case 'last':
          return tr('Últimos {{n}} caracteres', { n: rule.count });
        case 'range':
          return tr('Caracteres {{from}} a {{to}}', { from: rule.from, to: rule.to });
        case 'digits':
          return tr('Todos os números');
        case 'letters':
          return tr('Todas as letras');
        case 'symbols':
          return tr('Símbolos e pontuação');
        case 'between':
          return tr('Trechos entre {{open}} {{close}}', { open: rule.open, close: rule.close });
      }
      return '';
    case 'case':
      return CASE_LABELS[rule.style];
    case 'numbering': {
      const sample = rule.format === 'decimal' ? String(rule.start).padStart(rule.pad, '0') : rule.format === 'roman' ? 'I, II, III' : rule.format === 'alpha' ? 'a, b, c' : 'hex';
      const where = rule.position === 'start' ? tr('no início') : rule.position === 'end' ? tr('no fim') : tr('substitui o nome');
      return `${sample}… ${where}`;
    }
    case 'date': {
      const src = tr({ taken: m('Captura'), created: m('Criação'), modified: m('Modificação'), now: m('Hoje') }[rule.source]);
      return `${src} · ${rule.format}`;
    }
    case 'template':
      return rule.template || tr('Vazio');
    case 'extension':
      return { lower: tr('.jpg minúsculas'), upper: tr('.JPG maiúsculas'), set: tr('Trocar para .{{ext}}', { ext: rule.value || '?' }), remove: tr('Remover extensão'), normalize: '.jpeg → .jpg' }[rule.mode];
    case 'clean': {
      const parts = [
        rule.removeCopySuffix && '“(1)”',
        rule.removeEmoji && 'emoji',
        rule.removeAccents && tr('acentos'),
        rule.removeSpecial && tr('símbolos'),
        rule.spaces !== 'keep' && { underscore: tr('espaço → _'), dash: tr('espaço → -'), dot: tr('espaço → .'), remove: tr('sem espaços'), keep: '' }[rule.spaces],
      ].filter(Boolean);
      return parts.length ? parts.join(' · ') : tr('Espaços extras');
    }
    case 'pad':
      return tr('Números com {{n}} dígitos', { n: rule.digits });
    case 'swap':
      return tr('Separador {{sep}}', { sep: q(rule.separator) });
    case 'truncate':
      return tr('Máximo {{n}} caracteres', { n: rule.max });
    case 'folder':
      return rule.template || tr('Defina a pasta');
  }
}
