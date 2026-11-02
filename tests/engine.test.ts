/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applicableItems,
  applyCase,
  builtInPresets,
  createRule,
  dateFromFileName,
  diffNames,
  formatDate,
  renderTemplate,
  runPipeline,
  splitName,
  toAlpha,
  toRoman,
  unknownVariables,
  type FileItem,
  type Rule,
} from '../src/engine';

const NOW = new Date(2026, 10, 2, 9, 30, 0).getTime();

let seq = 0;
function file(name: string, extra: Partial<FileItem> = {}): FileItem {
  seq++;
  return {
    id: `f${seq}`,
    uri: `file:///docs/Lote/Viagem/${name}`,
    name,
    size: 2_400_000,
    modifiedAt: new Date(2024, 5, 2, 10, 0, 0).getTime(),
    createdAt: new Date(2024, 4, 17, 14, 22, 9).getTime(),
    folder: 'Viagem',
    folderUri: 'file:///docs/Lote/Viagem',
    source: 'library',
    ...extra,
  };
}

const rule = <T extends Rule['type']>(type: T, patch: Partial<Extract<Rule, { type: T }>> = {}) =>
  ({ ...createRule(type), ...patch }) as Rule;

const run = (names: string[] | FileItem[], rules: Rule[], conflict: 'suffix' | 'skip' | 'stop' = 'suffix') =>
  runPipeline({
    files: names.map((n) => (typeof n === 'string' ? file(n) : n)),
    rules,
    options: { conflict, protectExtension: true, now: NOW },
  });

describe('text', () => {
  it('splits names', () => {
    assert.deepEqual(splitName('IMG_0001.JPG'), { base: 'IMG_0001', ext: 'JPG' });
    assert.deepEqual(splitName('.env'), { base: '.env', ext: '' });
    assert.deepEqual(splitName('backup.tar.gz'), { base: 'backup.tar', ext: 'gz' });
    assert.deepEqual(splitName('LEIAME'), { base: 'LEIAME', ext: '' });
  });

  it('applies case styles', () => {
    assert.equal(applyCase('viagem de férias em lisboa', 'title'), 'Viagem de Férias em Lisboa');
    assert.equal(applyCase('Viagem De Férias', 'kebab'), 'viagem-de-férias');
    assert.equal(applyCase('minhaFotoBonita', 'snake'), 'minha_foto_bonita');
    assert.equal(applyCase('minha foto bonita', 'camel'), 'minhaFotoBonita');
    assert.equal(applyCase('minha foto', 'pascal'), 'MinhaFoto');
    assert.equal(applyCase('ÁGUA viva', 'sentence'), 'Água viva');
    assert.equal(applyCase('AbC', 'invert'), 'aBc');
  });

  it('formats numbers', () => {
    assert.equal(toRoman(14), 'XIV');
    assert.equal(toAlpha(1), 'a');
    assert.equal(toAlpha(28), 'ab');
  });
});

describe('dates', () => {
  it('formats with tokens and literals', () => {
    const t = new Date(2024, 4, 7, 8, 5, 3).getTime();
    assert.equal(formatDate(t, 'YYYY-MM-DD_HH-mm-ss'), '2024-05-07_08-05-03');
    assert.equal(formatDate(t, 'D [de] MMMM [de] YYYY'), '7 de maio de 2024');
    assert.equal(formatDate(t, 'ddd'), 'ter');
  });

  it('extracts dates from file names', () => {
    const d = dateFromFileName('IMG_20240517_142209.jpg');
    assert.equal(formatDate(d!, 'YYYY-MM-DD HH:mm:ss'), '2024-05-17 14:22:09');
    const s = dateFromFileName('Screenshot 2023-01-09 at 10.11.12.png');
    assert.equal(formatDate(s!, 'YYYY-MM-DD HH-mm-ss'), '2023-01-09 10-11-12');
    assert.equal(dateFromFileName('notes.txt'), null);
  });
});

describe('template', () => {
  const ctx = { file: file('IMG_4821.JPG', { width: 4032, height: 3024 }), name: 'IMG_4821', ext: 'JPG', index: 4, folderIndex: 1, total: 12, now: NOW };

  it('renders variables, args and filters', () => {
    assert.equal(renderTemplate('{folder|upper}_{n:3}', ctx), 'VIAGEM_005');
    assert.equal(renderTemplate('{n:2:10:5}', ctx), '30');
    assert.equal(renderTemplate('{fn:2}', ctx), '02');
    assert.equal(renderTemplate('{taken:YYYY}', ctx), '2024');
    assert.equal(renderTemplate('{dims}-{orientation}', ctx), '4032x3024-paisagem');
    assert.equal(renderTemplate('{name|slice:0:3|lower}', ctx), 'img');
    assert.equal(renderTemplate('{date:DD/MM}', ctx), '02/11');
    assert.equal(renderTemplate('{{literal}}', ctx), '{literal}');
    assert.equal(renderTemplate('{nope}', ctx), '{nope}');
  });

  it('random tokens are stable', () => {
    assert.equal(renderTemplate('{rand:6}', ctx), renderTemplate('{rand:6}', ctx));
    assert.equal(renderTemplate('{rand:6}', ctx).length, 6);
  });

  it('reports unknown variables', () => {
    assert.deepEqual(unknownVariables('{name}_{nmae}_{n:3}'), ['nmae']);
  });
});

describe('rules', () => {
  it('replace: literal, case-insensitive, regex, whole word', () => {
    assert.equal(run(['IMG_0001.jpg'], [rule('replace', { find: 'img_', replace: 'Foto ' })]).items[0].to, 'Foto 0001.jpg');
    assert.equal(run(['a1b22c333.txt'], [rule('replace', { find: '\\d+', replace: '#', useRegex: true })]).items[0].to, 'a#b#c#.txt');
    assert.equal(run(['cat catalog.txt'], [rule('replace', { find: 'cat', replace: 'dog', wholeWord: true })]).items[0].to, 'dog catalog.txt');
    assert.equal(run(['(2024) show.mp4'], [rule('replace', { find: '\\((\\d+)\\) (.*)', replace: '$2 $1', useRegex: true })]).items[0].to, 'show 2024.mp4');
  });

  it('insert and remove', () => {
    assert.equal(run(['foto.jpg'], [rule('insert', { text: '{n:2}_', position: 'start' })]).items[0].to, '01_foto.jpg');
    assert.equal(run(['abcdef.txt'], [rule('insert', { text: '-', position: 'index', index: 2, fromEnd: true })]).items[0].to, 'abcd-ef.txt');
    assert.equal(run(['IMG_0001.jpg'], [rule('remove', { mode: 'first', count: 4 })]).items[0].to, '0001.jpg');
    assert.equal(run(['Song (Remastered) [HD].mp3'], [rule('remove', { mode: 'between', open: '(', close: ')' })]).items[0].to, 'Song [HD].mp3');
  });

  it('numbering formats and per folder', () => {
    const files = [file('a.jpg'), file('b.jpg'), file('c.jpg', { folderUri: 'file:///x', folder: 'x' })];
    const res = run(files, [rule('numbering', { position: 'replace', pad: 2, perFolder: true })]);
    assert.deepEqual(res.items.map((i) => i.to), ['01.jpg', '02.jpg', '01.jpg']);
    const roman = run(['a.jpg', 'b.jpg'], [rule('numbering', { format: 'roman', separator: ' ', position: 'end' })]);
    assert.deepEqual(roman.items.map((i) => i.to), ['a I.jpg', 'b II.jpg']);
  });

  it('clean removes copy suffixes, emoji and spaces', () => {
    const c = rule('clean', { spaces: 'underscore', removeAccents: true });
    assert.equal(run(['Relatório final (1).pdf'], [c]).items[0].to, 'Relatorio_final.pdf');
    assert.equal(run(['Foto 🌅  praia - Cópia.jpg'], [c]).items[0].to, 'Foto_praia.jpg');
  });

  it('extension, pad, swap, truncate', () => {
    assert.equal(run(['x.JPEG'], [rule('extension', { mode: 'normalize' })]).items[0].to, 'x.jpg');
    assert.equal(run(['foto 2 v10.jpg'], [rule('pad', { digits: 3 })]).items[0].to, 'foto 002 v010.jpg');
    assert.equal(run(['Artista - Música.mp3'], [rule('swap', { separator: ' - ' })]).items[0].to, 'Música - Artista.mp3');
    assert.equal(run(['abcdefghij.txt'], [rule('truncate', { max: 4 })]).items[0].to, 'abcd.txt');
  });

  it('folder rule computes sanitized subfolders', () => {
    const res = run(['IMG_20240517_142209.jpg'], [rule('folder', { template: '{taken:YYYY}/../{taken:MM}' })]);
    assert.equal(res.items[0].subfolder, '2024/05');
    assert.equal(res.items[0].status, 'changed');
  });

  it('disabled rules are ignored', () => {
    assert.equal(run(['a.txt'], [rule('template', { template: 'b', enabled: false })]).items[0].status, 'unchanged');
  });
});

describe('conflicts', () => {
  it('suffixes duplicates', () => {
    const res = run(['a.jpg', 'b.jpg', 'c.jpg'], [rule('template', { template: 'foto' })]);
    assert.deepEqual(res.items.map((i) => i.to), ['foto.jpg', 'foto (2).jpg', 'foto (3).jpg']);
    assert.equal(res.resolved, 2);
  });

  it('skip / stop strategies', () => {
    const skip = run(['a.jpg', 'b.jpg'], [rule('template', { template: 'foto' })], 'skip');
    assert.equal(skip.conflicts, 1);
    assert.equal(applicableItems(skip, 'skip').length, 1);
    const stop = run(['a.jpg', 'b.jpg'], [rule('template', { template: 'foto' })], 'stop');
    assert.equal(applicableItems(stop, 'stop').length, 0);
  });

  it('allows swaps between batch files and case-only renames', () => {
    const res = run(['a.txt', 'b.txt'], [rule('replace', { find: '^(a|b)$', replace: '', useRegex: true }), rule('insert', { text: '{n}' })]);
    assert.equal(res.conflicts + res.resolved, 0);
    const caseOnly = run(['foto.JPG'], [rule('extension', { mode: 'lower' })]);
    assert.equal(caseOnly.items[0].status, 'changed');
  });

  it('collides with occupied names outside the batch', () => {
    const res = runPipeline({
      files: [file('a.jpg')],
      rules: [rule('template', { template: 'existe' })],
      options: { conflict: 'suffix', protectExtension: true, now: NOW },
      occupied: new Map([['file:///docs/Lote/Viagem', new Set(['existe.jpg'])]]),
    });
    assert.equal(res.items[0].to, 'existe (2).jpg');
  });

  it('flags empty names', () => {
    const res = run(['abc.txt'], [rule('remove', { mode: 'first', count: 10 })]);
    assert.equal(res.items[0].status, 'error');
  });
});

describe('presets & diff', () => {
  it('built-in presets all run', () => {
    for (const p of builtInPresets()) {
      const res = run(['IMG_20240517_142209.JPEG', 'Screenshot 2023-01-09 at 10.11.12.png', 'Relatório (1).pdf'], p.rules);
      assert.equal(res.errors, 0, p.name);
    }
  });

  it('diffs names', () => {
    assert.deepEqual(diffNames('IMG_0001.jpg', 'Viagem_0001.jpg'), { prefix: '', removed: 'IMG', added: 'Viagem', suffix: '_0001.jpg' });
  });
});
