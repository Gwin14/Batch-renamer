import type { CaseStyle, Rule, RuleType } from './types';

export interface RuleMeta {
  type: RuleType;
  title: string;
  description: string;
  /** SF Symbol (iOS) */
  sf: string;
  /** Material Symbol (Android / web) */
  md: string;
  group: 'Texto' | 'Sequência e data' | 'Limpeza' | 'Organização';
}

export const RULES: RuleMeta[] = [
  { type: 'template', title: 'Novo nome', description: 'Monte o nome inteiro com variáveis', sf: 'textformat.abc', md: 'text_fields', group: 'Texto' },
  { type: 'replace', title: 'Substituir', description: 'Trocar texto, com suporte a regex', sf: 'arrow.left.arrow.right', md: 'find_replace', group: 'Texto' },
  { type: 'insert', title: 'Inserir', description: 'Adicionar texto no início, fim ou posição', sf: 'text.insert', md: 'add_notes', group: 'Texto' },
  { type: 'remove', title: 'Remover', description: 'Cortar caracteres, dígitos ou trechos', sf: 'scissors', md: 'content_cut', group: 'Texto' },
  { type: 'case', title: 'Maiúsc. / minúsc.', description: 'Título, kebab-case, snake_case…', sf: 'textformat', md: 'match_case', group: 'Texto' },
  { type: 'swap', title: 'Inverter partes', description: '“Artista - Música” → “Música - Artista”', sf: 'arrow.triangle.swap', md: 'swap_horiz', group: 'Texto' },
  { type: 'numbering', title: 'Numeração', description: 'Sequência, romanos, letras ou hex', sf: 'number', md: 'tag', group: 'Sequência e data' },
  { type: 'date', title: 'Data', description: 'Data da captura, criação ou hoje', sf: 'calendar', md: 'calendar_today', group: 'Sequência e data' },
  { type: 'pad', title: 'Zeros à esquerda', description: '“foto 2” → “foto 002”, ordena certo', sf: 'textformat.123', md: 'pin', group: 'Sequência e data' },
  { type: 'clean', title: 'Limpar', description: 'Espaços, acentos, emoji e “(1)”', sf: 'wand.and.stars', md: 'mop', group: 'Limpeza' },
  { type: 'truncate', title: 'Limitar tamanho', description: 'Cortar nomes longos demais', sf: 'arrow.right.to.line', md: 'short_text', group: 'Limpeza' },
  { type: 'extension', title: 'Extensão', description: 'Minúsculas, trocar ou normalizar', sf: 'doc.badge.gearshape', md: 'extension', group: 'Limpeza' },
  { type: 'folder', title: 'Organizar em pastas', description: 'Mover para subpastas por ano, tipo…', sf: 'folder.badge.plus', md: 'create_new_folder', group: 'Organização' },
];

export const RULE_META: Record<RuleType, RuleMeta> = Object.fromEntries(RULES.map((r) => [r.type, r])) as Record<RuleType, RuleMeta>;

export const CASE_LABELS: Record<CaseStyle, string> = {
  title: 'Título',
  sentence: 'Frase',
  lower: 'minúsculas',
  upper: 'MAIÚSCULAS',
  camel: 'camelCase',
  pascal: 'PascalCase',
  snake: 'snake_case',
  kebab: 'kebab-case',
  invert: 'iNVERTER',
};

const q = (s: string) => `“${s}”`;

/** One-line human summary of a rule, used on rule cards. */
export function summarizeRule(rule: Rule): string {
  switch (rule.type) {
    case 'replace':
      if (!rule.find) return 'Defina o texto a procurar';
      return `${q(rule.find)} → ${rule.replace ? q(rule.replace) : 'nada'}${rule.useRegex ? ' · regex' : ''}`;
    case 'insert': {
      if (!rule.text) return 'Defina o texto';
      const where = rule.position === 'start' ? 'no início' : rule.position === 'end' ? 'no fim' : `na posição ${rule.index}`;
      return `${q(rule.text)} ${where}`;
    }
    case 'remove':
      switch (rule.mode) {
        case 'first':
          return `Primeiros ${rule.count} caracteres`;
        case 'last':
          return `Últimos ${rule.count} caracteres`;
        case 'range':
          return `Caracteres ${rule.from} a ${rule.to}`;
        case 'digits':
          return 'Todos os números';
        case 'letters':
          return 'Todas as letras';
        case 'symbols':
          return 'Símbolos e pontuação';
        case 'between':
          return `Trechos entre ${rule.open} ${rule.close}`;
      }
      return '';
    case 'case':
      return CASE_LABELS[rule.style];
    case 'numbering': {
      const sample = rule.format === 'decimal' ? String(rule.start).padStart(rule.pad, '0') : rule.format === 'roman' ? 'I, II, III' : rule.format === 'alpha' ? 'a, b, c' : 'hex';
      const where = rule.position === 'start' ? 'no início' : rule.position === 'end' ? 'no fim' : 'substitui o nome';
      return `${sample}… ${where}`;
    }
    case 'date': {
      const src = { taken: 'Captura', created: 'Criação', modified: 'Modificação', now: 'Hoje' }[rule.source];
      return `${src} · ${rule.format}`;
    }
    case 'template':
      return rule.template || 'Vazio';
    case 'extension':
      return { lower: '.jpg minúsculas', upper: '.JPG maiúsculas', set: `Trocar para .${rule.value || '?'}`, remove: 'Remover extensão', normalize: '.jpeg → .jpg' }[rule.mode];
    case 'clean': {
      const parts = [
        rule.removeCopySuffix && '“(1)”',
        rule.removeEmoji && 'emoji',
        rule.removeAccents && 'acentos',
        rule.removeSpecial && 'símbolos',
        rule.spaces !== 'keep' && { underscore: 'espaço → _', dash: 'espaço → -', dot: 'espaço → .', remove: 'sem espaços', keep: '' }[rule.spaces],
      ].filter(Boolean);
      return parts.length ? parts.join(' · ') : 'Espaços extras';
    }
    case 'pad':
      return `Números com ${rule.digits} dígitos`;
    case 'swap':
      return `Separador ${q(rule.separator)}`;
    case 'truncate':
      return `Máximo ${rule.max} caracteres`;
    case 'folder':
      return rule.template || 'Defina a pasta';
  }
}
