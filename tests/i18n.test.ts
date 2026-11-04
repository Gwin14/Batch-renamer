/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { formatDate } from '../src/engine';
import { DICTIONARIES, matchLang, setLang, tr, trn } from '../src/i18n/core';

/** Every pt-BR source string passed to tr(), trn() or m() in src/. */
function sourceKeys(): Set<string> {
  const lit = String.raw`'((?:[^'\\\n]|\\.)*)'`;
  const patterns = [new RegExp(String.raw`\btr\(\s*` + lit, 'g'), new RegExp(String.raw`\bm\(\s*` + lit, 'g'), new RegExp(String.raw`\btrn\([^;]*?,\s*` + lit + String.raw`,\s*` + lit, 'g')];
  const unescape = (s: string) => s.replace(/\\(.)/g, (_, c: string) => (c === 'n' ? '\n' : c));
  const keys = new Set<string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        if (name !== 'locales') walk(path);
      } else if (/\.tsx?$/.test(name)) {
        const src = readFileSync(path, 'utf8');
        for (const re of patterns) for (const match of src.matchAll(re)) match.slice(1).forEach((k) => keys.add(unescape(k)));
      }
    }
  };
  walk(join(__dirname, '..', 'src'));
  return keys;
}

const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();

describe('i18n', () => {
  const keys = sourceKeys();

  for (const [lang, dict] of Object.entries(DICTIONARIES)) {
    it(`${lang} translates every source string with the same placeholders`, () => {
      const missing = [...keys].filter((k) => !(k in dict));
      assert.deepEqual(missing, [], `missing in ${lang}`);
      for (const k of keys) assert.deepEqual(placeholders(dict[k]), placeholders(k), `placeholders differ in ${lang}: ${k}`);
    });

    it(`${lang} has no stale keys`, () => {
      assert.deepEqual(Object.keys(dict).filter((k) => !keys.has(k)), []);
    });
  }

  it('matches the device language list, falling back to English', () => {
    assert.equal(matchLang(['pt-BR']), 'pt');
    assert.equal(matchLang(['ja-JP', 'de-AT']), 'de');
    assert.equal(matchLang(['ja-JP']), 'en');
    assert.equal(matchLang([null]), 'en');
  });

  it('interpolates, pluralizes and localizes dates', () => {
    const may7 = new Date(2024, 4, 7).getTime();
    try {
      setLang('en');
      assert.equal(trn(1, '{{n}} arquivo', '{{n}} arquivos'), '1 file');
      assert.equal(trn(2, '{{n}} arquivo', '{{n}} arquivos'), '2 files');
      assert.equal(tr('Pasta “{{name}}” criada', { name: 'Trip' }), 'Folder “Trip” created');
      assert.equal(formatDate(may7, tr('D [de] MMMM [de] YYYY')), 'May 7, 2024');
      setLang('fr');
      assert.equal(formatDate(may7, tr('D [de] MMMM [de] YYYY')), '7 mai 2024');
      assert.equal(tr('texto que não existe'), 'texto que não existe');
    } finally {
      setLang('pt');
    }
  });
});
