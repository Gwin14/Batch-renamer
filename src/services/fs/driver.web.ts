/**
 * In-memory driver used on web so the full UI can be exercised in a browser
 * (handy for quick design reviews). Mirrors the native driver's semantics.
 */
import type { Entry, FsDriver } from './types';

export const LIBRARY_DIR = 'Lote';
const ROOT = `memory:///${LIBRARY_DIR}`;

type Node = Entry & { bytes?: Uint8Array };
const nodes = new Map<string, Node>();
const now = () => Date.now();

const parentOf = (uri: string) => uri.slice(0, uri.lastIndexOf('/'));
const join = (dir: string, name: string) => `${dir.replace(/\/+$/, '')}/${name}`;

function put(uri: string, node: Omit<Node, 'uri' | 'name'>) {
  nodes.set(uri, { ...node, uri, name: displayName(uri) });
}

export function displayName(uri: string): string {
  const t = uri.replace(/\/+$/, '');
  return decodeURIComponent(t.slice(t.lastIndexOf('/') + 1));
}

put(ROOT, { isDirectory: true, size: 0, modifiedAt: now(), createdAt: now() });

function relocate(from: string, to: string) {
  const affected = [...nodes.keys()].filter((k) => k === from || k.startsWith(`${from}/`));
  for (const k of affected) {
    const n = nodes.get(k)!;
    nodes.delete(k);
    const nk = to + k.slice(from.length);
    nodes.set(nk, { ...n, uri: nk, name: displayName(nk), modifiedAt: k === from ? now() : n.modifiedAt });
  }
}

export const driver: FsDriver = {
  rootUri: () => ROOT,
  list(dirUri) {
    const base = dirUri.replace(/\/+$/, '');
    return [...nodes.values()].filter((n) => parentOf(n.uri) === base).map(({ bytes, ...e }) => e);
  },
  exists: (uri) => nodes.has(uri.replace(/\/+$/, '')),
  stat(uri) {
    const n = nodes.get(uri.replace(/\/+$/, ''));
    if (!n) return null;
    const { bytes, ...e } = n;
    return e;
  },
  mkdir(parentUri, name) {
    const uri = join(parentUri, name);
    if (!nodes.has(uri)) put(uri, { isDirectory: true, size: 0, modifiedAt: now(), createdAt: now() });
    return uri;
  },
  ensurePath(baseUri, relative) {
    let cur = baseUri;
    for (const seg of relative.split('/').filter(Boolean)) cur = driver.mkdir(cur, seg);
    return cur;
  },
  async rename(uri, newName) {
    const to = join(parentOf(uri), newName);
    if (nodes.has(to) && to.toLowerCase() !== uri.toLowerCase()) throw new Error('Destino já existe');
    relocate(uri, to);
    return to;
  },
  renameInFolder: (uri, _folder, newName) => driver.rename(uri, newName),
  async moveTo(uri, destDirUri, newName) {
    const to = join(destDirUri, newName);
    if (nodes.has(to)) throw new Error('Destino já existe');
    relocate(uri, to);
    return to;
  },
  async copyInto(srcUri, destDirUri, name) {
    const src = nodes.get(srcUri);
    const to = join(destDirUri, name);
    put(to, { isDirectory: false, size: src?.size ?? 0, modifiedAt: src?.modifiedAt ?? now(), createdAt: src?.createdAt ?? now(), bytes: src?.bytes });
    return to;
  },
  remove(uri) {
    for (const k of [...nodes.keys()]) if (k === uri || k.startsWith(`${uri}/`)) nodes.delete(k);
  },
  writeBytes(dirUri, name, bytes) {
    const uri = join(dirUri, name);
    put(uri, { isDirectory: false, size: bytes.byteLength, modifiedAt: now(), createdAt: now(), bytes });
    return uri;
  },
  async readBytes(uri) {
    return nodes.get(uri)?.bytes ?? new Uint8Array();
  },
  pickDirectory: async () => null,
  preview: async () => false,
  cacheUri: () => 'memory:///cache',
  freeSpace: () => null,
};

/** Lets the sample generator give web files realistic timestamps/sizes. */
export function setMeta(uri: string, meta: Partial<Pick<Entry, 'size' | 'modifiedAt' | 'createdAt'>>) {
  const n = nodes.get(uri);
  if (n) nodes.set(uri, { ...n, ...meta });
}
