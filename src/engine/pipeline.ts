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

/**
 * Sidecar extensions: files that only make sense next to a "main" file with the
 * same base name (edit recipes, metadata, thumbnails). Never chosen as a pair's lead.
 */
export const SIDECAR_EXTS = new Set(['xmp', 'aae', 'photo', 'dop', 'pp3', 'on1', 'thm', 'lrv', 'json']);

const isSidecar = (name: string) => SIDECAR_EXTS.has(splitName(name).ext.toLowerCase());
const lowerKey = (folderUri: string, name: string) => `${folderUri}\u0000${name.normalize('NFC').toLowerCase()}`;

export interface PairMember {
  file: FileItem;
  /** Set on full-name sidecars (IMG_1.CR2.xmp): id of the file whose new name it extends */
  ref?: string;
}

export interface PairGroup {
  lead: FileItem;
  /** Lead first */
  members: PairMember[];
}

/**
 * Groups files that must keep matching names: same folder + same base name
 * (IMG_1.HEIC, IMG_1.photo, IMG_1.AAE), plus full-name sidecars (IMG_1.CR2.xmp → IMG_1.CR2).
 * Returns one group per lead, in file order; files without companions get a group of one.
 */
export function groupPairs(files: FileItem[], keepPairs: boolean): PairGroup[] {
  if (!keepPairs) return files.map((file) => ({ lead: file, members: [{ file }] }));

  const byFullName = new Map<string, FileItem>();
  for (const f of files) byFullName.set(lowerKey(f.folderUri, f.name), f);

  // A full-name sidecar follows the file it names; everything else groups by base name.
  const refOf = new Map<string, FileItem>();
  const byStem = new Map<string, FileItem[]>();
  for (const f of files) {
    const { base, ext } = splitName(f.name);
    const ref = ext && isSidecar(f.name) ? byFullName.get(lowerKey(f.folderUri, base)) : undefined;
    if (ref && ref.id !== f.id) {
      refOf.set(f.id, ref);
      continue;
    }
    const k = lowerKey(f.folderUri, base);
    const list = byStem.get(k);
    if (list) list.push(f);
    else byStem.set(k, [f]);
  }

  const leadOf = new Map<string, FileItem>();
  for (const list of byStem.values()) {
    const lead = list.find((f) => !isSidecar(f.name)) ?? list[0];
    for (const f of list) leadOf.set(f.id, lead);
  }
  const resolveLead = (f: FileItem): FileItem => {
    let cur = f;
    for (let i = 0; i < 8 && refOf.has(cur.id); i++) cur = refOf.get(cur.id)!;
    return leadOf.get(cur.id) ?? cur;
  };

  const groups = new Map<string, PairGroup>();
  for (const f of files) {
    const lead = resolveLead(f);
    let g = groups.get(lead.id);
    if (!g) {
      g = { lead, members: [] };
      groups.set(lead.id, g);
    }
    g.members.push({ file: f, ref: refOf.get(f.id)?.id });
  }
  for (const g of groups.values()) g.members.sort((a, b) => Number(b.file.id === g.lead.id) - Number(a.file.id === g.lead.id));
  // Numbering follows the lead's position in the visible sort.
  const pos = new Map(files.map((f, i) => [f.id, i]));
  return [...groups.values()].sort((a, b) => pos.get(a.lead.id)! - pos.get(b.lead.id)!);
}

export function runPipeline({ files, rules, options, occupied }: PipelineInput): PreviewSummary {
  const folderCounters = new Map<string, number>();
  const now = options.now ?? Date.now();
  const opts = { ...options, now };
  const groups = groupPairs(files, !!options.keepPairs);
  const total = groups.length;

  // 1. compute raw names — once per group, so {n} counts pairs rather than files
  const raw = groups.map((g, index) => {
    const fi = folderCounters.get(g.lead.folderUri) ?? 0;
    folderCounters.set(g.lead.folderUri, fi + 1);
    const w = computeName(g.lead, rules, index, fi, total, opts);
    // Companions take the lead's base but keep their own extension (still run through extension rules).
    const extOf = new Map(
      g.members.map((m) => [m.file.id, m.file.id === g.lead.id ? sanitize(w.ext) : sanitize(computeName(m.file, rules, index, fi, total, opts).ext)]),
    );
    const make = (m: PairMember, base: string): string => {
      const ref = m.ref ? g.members.find((x) => x.file.id === m.ref) : undefined;
      return joinName(ref ? make(ref, base) : base, extOf.get(m.file.id)!);
    };
    const members = g.members.map((m) => ({ file: m.file, make: (base: string) => make(m, base) }));
    return { lead: g.lead, base: sanitize(w.base), subfolder: w.subfolder, members };
  });

  // Files that stay put keep "owning" their current name; everything else is free
  // to be claimed (enables swaps and chains like a→b, b→c).
  const claimed = new Map<string, string>(); // destKey -> file id
  const byId = new Map<string, PreviewItem>();

  // Pre-claim names of files that won't move, so movers can't collide into them.
  for (const r of raw) {
    for (const m of r.members) {
      if (m.make(r.base) === m.file.name && !r.subfolder) claimed.set(destKey(m.file.folderUri, '', m.file.name), m.file.id);
    }
  }

  for (const r of raw) {
    const { lead, subfolder, members } = r;
    const paired = members.length > 1;
    const push = (m: (typeof members)[number], to: string, status: PreviewItem['status'], message?: string) => {
      const item: PreviewItem = { id: m.file.id, file: m.file, from: m.file.name, to, subfolder, status, message };
      if (paired && m.file.id === lead.id) item.companions = members.length - 1;
      else if (paired) item.pairedWith = lead.name;
      byId.set(m.file.id, item);
    };
    const pushAll = (base: string, status: PreviewItem['status'], message?: string) => members.forEach((m) => push(m, m.make(base), status, message));

    const leadTo = members[0].make(r.base);
    if (!r.base.trim() || (leadTo.startsWith('.') && !lead.name.startsWith('.'))) {
      pushAll(r.base, 'error', 'O nome ficaria vazio');
      continue;
    }
    if (members.some((m) => byteLength(m.make(r.base)) > MAX_NAME_BYTES)) {
      pushAll(r.base, 'error', 'Nome longo demais (máx. 255 bytes)');
      continue;
    }

    const taken = (m: (typeof members)[number], name: string) => {
      const key = destKey(m.file.folderUri, subfolder, name);
      const owner = claimed.get(key);
      if (owner && owner !== m.file.id) return true;
      // Only collide with outsiders when landing in the source folder (subfolders are created fresh, but may exist).
      const outside = occupied?.get(subfolder ? `${m.file.folderUri}/${subfolder}` : m.file.folderUri);
      return !!outside?.has(name.normalize('NFC').toLowerCase());
    };
    const anyTaken = (base: string) => members.some((m) => !(m.make(base) === m.file.name && !subfolder) && taken(m, m.make(base)));
    const claimAll = (base: string) => members.forEach((m) => claimed.set(destKey(m.file.folderUri, subfolder, m.make(base)), m.file.id));
    const settle = (base: string, status: 'changed' | 'resolved', message?: string) =>
      members.forEach((m) => {
        const to = m.make(base);
        if (to === m.file.name && !subfolder) push(m, to, 'unchanged');
        else push(m, to, status, message);
      });

    if (members.every((m) => m.make(r.base) === m.file.name) && !subfolder) {
      pushAll(r.base, 'unchanged');
      continue;
    }

    if (anyTaken(r.base)) {
      if (options.conflict === 'suffix') {
        let n = 2;
        while (anyTaken(`${r.base} (${n})`) && n < 10000) n++;
        const base = `${r.base} (${n})`;
        claimAll(base);
        settle(base, 'resolved', 'Sufixo adicionado para evitar duplicidade');
      } else {
        pushAll(r.base, 'conflict', 'Já existe um arquivo com esse nome');
      }
      continue;
    }
    claimAll(r.base);
    settle(r.base, 'changed');
  }

  const items = files.map((f) => byId.get(f.id)!).filter(Boolean);
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
