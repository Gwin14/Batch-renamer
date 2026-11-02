import { createRule } from './rules';
import type { Rule, RuleType } from './types';

export interface Preset {
  id: string;
  name: string;
  description: string;
  sf: string;
  md: string;
  rules: Rule[];
  builtIn: boolean;
  favorite: boolean;
  uses: number;
  lastUsedAt: number | null;
  createdAt: number;
  /** Optional file order applied with the preset (e.g. capture date for photo sequences) */
  sort?: 'name' | 'taken' | 'modified' | 'size' | 'type';
}

type Patch<T extends RuleType> = Partial<Extract<Rule, { type: T }>>;
const r = <T extends RuleType>(type: T, patch: Patch<T> = {}) => ({ ...createRule(type), ...patch }) as Rule;

const builtIn = (id: string, name: string, description: string, sf: string, md: string, rules: Rule[], sort?: Preset['sort']): Preset => ({
  sort,
  id,
  name,
  description,
  sf,
  md,
  rules,
  builtIn: true,
  favorite: false,
  uses: 0,
  lastUsedAt: null,
  createdAt: 0,
});

/** Factory so every load gets fresh rule ids. */
export function builtInPresets(): Preset[] {
  return [
    builtIn('bi-photos-date', 'Fotos por data', '2024-05-17_001.jpg — ordena por captura', 'photo.on.rectangle', 'photo_library', [
      r('template', { template: '{taken:YYYY-MM-DD}_{fn:3}' }),
      r('extension', { mode: 'normalize' }),
    ], 'taken'),
    builtIn('bi-trip', 'Álbum de viagem', 'Lisboa-001.jpg com nome do álbum', 'airplane', 'flight', [
      r('template', { template: 'Viagem_{n:3}' }),
      r('extension', { mode: 'lower' }),
    ], 'taken'),
    builtIn('bi-web', 'Pronto para web', 'minusculas-sem-acentos.jpg', 'globe', 'language', [
      r('clean', { removeAccents: true, removeEmoji: true, removeSpecial: true }),
      r('case', { style: 'kebab' }),
      r('extension', { mode: 'normalize' }),
    ]),
    builtIn('bi-screenshots', 'Limpar capturas de tela', 'Screenshot 2024-05-17 at… → Captura 2024-05-17 14h22', 'camera.viewfinder', 'screenshot_monitor', [
      r('template', { template: 'Captura {taken:YYYY-MM-DD HH[h]mm}' }),
    ]),
    builtIn('bi-copies', 'Remover “(1)” e “cópia”', 'Relatorio (1).pdf → Relatorio.pdf', 'doc.on.doc', 'file_copy', [
      r('clean', { removeCopySuffix: true }),
    ]),
    builtIn('bi-sequence', 'Sequência simples', '001, 002, 003… mantendo a ordem', 'list.number', 'format_list_numbered', [
      r('template', { template: '{n:3}' }),
    ], 'name'),
    builtIn('bi-organize-year', 'Organizar por ano/mês', 'Move para pastas 2024/05', 'folder.badge.gearshape', 'folder_managed', [
      r('folder', { template: '{taken:YYYY}/{taken:MM}' }),
    ]),
    builtIn('bi-docs', 'Documentos de trabalho', '2026-11-02 - Relatório.pdf', 'briefcase', 'work', [
      r('clean', {}),
      r('case', { style: 'title' }),
      r('date', { source: 'modified', format: 'YYYY-MM-DD', position: 'start', separator: ' - ' }),
    ]),
    builtIn('bi-music', 'Música padronizada', 'artista_-_faixa.mp3 → Artista - Faixa.mp3', 'music.note', 'music_note', [
      r('replace', { find: '_', replace: ' ' }),
      r('clean', {}),
      r('case', { style: 'title' }),
    ]),
    builtIn('bi-pad', 'Corrigir ordenação', 'foto 2, foto 10 → foto 002, foto 010', 'arrow.up.arrow.down', 'sort', [
      r('pad', { digits: 3 }),
    ]),
  ];
}

export function clonePresetRules(rules: Rule[]): Rule[] {
  return rules.map((rule) => ({ ...rule, id: createRule(rule.type).id }));
}
