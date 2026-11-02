import { applyRule, type WorkingName } from './rules';
import { joinName, sanitize, splitName } from './text';
import type { FileItem, PipelineOptions, PreviewItem, PreviewSummary, Rule } from './types';

export const MAX_NAME_BYTES = 255;

const byteLength = (s: string) => {
  let n = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return n;
};

/** Destination key: case-insensitive (APFS and Android shared storage are case-insensitive). */
const destKey = (folderUri: string, subfolder: string, name: string) =>
  `${folderUri}\u0000${subfolder.toLowerCase()}\u0000${name.normalize('NFC').toLowerCase()}`;

export interface PipelineInput {
  files: FileItem[];
  rules: Rule[];
  options: PipelineOptions;
  /**
   * Names already present in each folder that are NOT part of the batch,
   * keyed by folderUri. Used to flag collisions with untouched files.
   */
  occupied?: Map<string, Set<string>>;
}

export function computeName(file: FileItem, rules: Rule[], index: number, folderIndex: number, total: number, options: PipelineOptions): WorkingName {
  const { base, ext } = splitName(file.name);
  let w: WorkingName = { base, ext, subfolder: '' };
  const now = options.now ?? Date.now();
  for (const rule of rules) {
    if (!rule.enabled) continue;
    w = applyRule(rule, w, { ctx: { file, index, folderIndex, total, now } });
  }
  return w;
}

function withSuffix(name: string, n: number): string {
  const { base, ext } = splitName(name);
  return joinName(`${base} (${n})`, ext);
}

export function runPipeline({ files, rules, options, occupied }: PipelineInput): PreviewSummary {
  const total = files.length;
  const folderCounters = new Map<string, number>();
  const now = options.now ?? Date.now();
  const opts = { ...options, now };

  // 1. compute raw names
  const raw = files.map((file, index) => {
    const fi = folderCounters.get(file.folderUri) ?? 0;
    folderCounters.set(file.folderUri, fi + 1);
    const w = computeName(file, rules, index, fi, total, opts);
    const base = sanitize(w.base);
    const to = joinName(base, sanitize(w.ext));
    return { file, to, subfolder: w.subfolder, base };
  });

  // Files that stay put keep "owning" their current name; everything else is free
  // to be claimed (enables swaps and chains like a→b, b→c).
  const claimed = new Map<string, string>(); // destKey -> file id
  const items: PreviewItem[] = [];

  // Pre-claim names of files that won't move, so movers can't collide into them.
  raw.forEach((r) => {
    if (r.to === r.file.name && !r.subfolder) claimed.set(destKey(r.file.folderUri, '', r.file.name), r.file.id);
  });

  for (const r of raw) {
    const { file, subfolder } = r;
    let to = r.to;
    const unchanged = to === file.name && !subfolder;

    if (!r.base.trim() || to.startsWith('.') && !file.name.startsWith('.')) {
      items.push({ id: file.id, file, from: file.name, to, subfolder, status: 'error', message: 'O nome ficaria vazio' });
      continue;
    }
    if (byteLength(to) > MAX_NAME_BYTES) {
      items.push({ id: file.id, file, from: file.name, to, subfolder, status: 'error', message: 'Nome longo demais (máx. 255 bytes)' });
      continue;
    }
    if (unchanged) {
      items.push({ id: file.id, file, from: file.name, to, subfolder, status: 'unchanged' });
      continue;
    }

    const taken = (name: string) => {
      const key = destKey(file.folderUri, subfolder, name);
      const owner = claimed.get(key);
      if (owner && owner !== file.id) return true;
      // Only collide with outsiders when landing in the source folder (subfolders are created fresh, but may exist).
      const outside = occupied?.get(subfolder ? `${file.folderUri}/${subfolder}` : file.folderUri);
      return !!outside?.has(name.normalize('NFC').toLowerCase());
    };

    if (taken(to)) {
      if (options.conflict === 'suffix') {
        let n = 2;
        while (taken(withSuffix(to, n)) && n < 10000) n++;
        to = withSuffix(to, n);
        claimed.set(destKey(file.folderUri, subfolder, to), file.id);
        items.push({ id: file.id, file, from: file.name, to, subfolder, status: 'resolved', message: 'Sufixo adicionado para evitar duplicidade' });
      } else {
        items.push({ id: file.id, file, from: file.name, to, subfolder, status: 'conflict', message: 'Já existe um arquivo com esse nome' });
      }
      continue;
    }
    claimed.set(destKey(file.folderUri, subfolder, to), file.id);
    items.push({ id: file.id, file, from: file.name, to, subfolder, status: 'changed' });
  }

  return {
    items,
    changed: items.filter((i) => i.status === 'changed').length,
    unchanged: items.filter((i) => i.status === 'unchanged').length,
    conflicts: items.filter((i) => i.status === 'conflict').length,
    errors: items.filter((i) => i.status === 'error').length,
    resolved: items.filter((i) => i.status === 'resolved').length,
  };
}

/** Which items should actually be written given the strategy. */
export function applicableItems(summary: PreviewSummary, strategy: PipelineOptions['conflict']): PreviewItem[] {
  if (strategy === 'stop' && (summary.conflicts > 0 || summary.errors > 0)) return [];
  return summary.items.filter((i) => i.status === 'changed' || i.status === 'resolved');
}

/** Character-level diff: common prefix / suffix, middle is "changed". */
export function diffNames(from: string, to: string): { prefix: string; removed: string; added: string; suffix: string } {
  const a = Array.from(from);
  const b = Array.from(to);
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  return {
    prefix: b.slice(0, p).join(''),
    removed: a.slice(p, a.length - s).join(''),
    added: b.slice(p, b.length - s).join(''),
    suffix: b.slice(b.length - s).join(''),
  };
}
