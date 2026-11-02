/**
 * Native file-system driver (iOS / Android) on top of the object API of expo-file-system.
 * A memory driver with the same surface lives in driver.web.ts (Metro picks it on web).
 */
import { Directory, File, Paths } from 'expo-file-system';

import { mimeOf } from '@/engine/text';

import type { Entry, FsDriver } from './types';

export const LIBRARY_DIR = 'Lote';

const isContent = (uri: string) => uri.startsWith('content://');

/** Best-effort display name, including Android SAF document URIs. */
export function displayName(uri: string): string {
  const trimmed = uri.replace(/\/+$/, '');
  const last = trimmed.slice(trimmed.lastIndexOf('/') + 1);
  let decoded = last;
  try {
    decoded = decodeURIComponent(last);
  } catch {}
  const parts = decoded.split(/[/:]/);
  return parts[parts.length - 1] || decoded;
}

function toEntry(item: File | Directory): Entry {
  if (item instanceof Directory) {
    return { uri: item.uri, name: displayName(item.uri), isDirectory: true, size: 0, modifiedAt: null, createdAt: null };
  }
  let size = 0;
  let modifiedAt: number | null = null;
  let createdAt: number | null = null;
  try {
    size = item.size ?? 0;
    modifiedAt = item.modificationTime ?? null;
    createdAt = item.creationTime ?? null;
  } catch {}
  return { uri: item.uri, name: displayName(item.uri), isDirectory: false, size, modifiedAt, createdAt };
}

function libraryRoot(): Directory {
  const dir = new Directory(Paths.document, LIBRARY_DIR);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function childDirectory(parentUri: string, name: string): Directory {
  const parent = new Directory(parentUri);
  if (isContent(parentUri)) {
    const existing = parent.list().find((e) => e instanceof Directory && displayName(e.uri) === name);
    return (existing as Directory) ?? parent.createDirectory(name);
  }
  const dir = new Directory(parent, name);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

async function copyContents(src: File, dest: File) {
  try {
    await src.readableStream().pipeTo(dest.writableStream());
  } catch {
    dest.write(await src.bytes());
  }
}

export const driver: FsDriver = {
  rootUri() {
    return libraryRoot().uri;
  },

  list(dirUri) {
    const dir = new Directory(dirUri);
    if (!isContent(dirUri) && !dir.exists) return [];
    return dir
      .list()
      .map(toEntry)
      .filter((e) => !e.name.startsWith('.lote-tmp-') && e.name !== '.DS_Store');
  },

  exists(uri) {
    try {
      return new File(uri).exists || new Directory(uri).exists;
    } catch {
      return false;
    }
  },

  stat(uri) {
    try {
      const f = new File(uri);
      if (f.exists) return toEntry(f);
      const d = new Directory(uri);
      if (d.exists) return toEntry(d);
    } catch {}
    return null;
  },

  mkdir(parentUri, name) {
    return childDirectory(parentUri, name).uri;
  },

  ensurePath(baseUri, relative) {
    let current = baseUri;
    for (const seg of relative.split('/').filter(Boolean)) current = childDirectory(current, seg).uri;
    return current;
  },

  async rename(uri, newName) {
    if (!isContent(uri)) {
      const f = new File(uri);
      if (f.exists) {
        f.rename(newName);
        return f.uri;
      }
      const d = new Directory(uri);
      d.rename(newName);
      return d.uri;
    }
    // Android SAF: no in-place rename in the object API → recreate in the same folder and delete the source.
    throw new Error('SAF_RENAME_REQUIRES_PARENT');
  },

  async renameInFolder(uri, folderUri, newName) {
    if (!isContent(uri)) return driver.rename(uri, newName);
    const src = new File(uri);
    const parent = new Directory(folderUri);
    const dest = parent.createFile(newName, mimeOf(newName));
    await copyContents(src, dest);
    src.delete();
    return dest.uri;
  },

  async moveTo(uri, destDirUri, newName) {
    const src = new File(uri);
    if (isContent(uri) || isContent(destDirUri)) {
      const dest = new Directory(destDirUri).createFile(newName, mimeOf(newName));
      await copyContents(src, dest);
      src.delete();
      return dest.uri;
    }
    const dest = new File(new Directory(destDirUri), newName);
    await src.move(dest);
    return src.uri;
  },

  async copyInto(srcUri, destDirUri, name) {
    const src = new File(srcUri);
    if (isContent(destDirUri)) {
      const dest = new Directory(destDirUri).createFile(name, mimeOf(name));
      await copyContents(src, dest);
      return dest.uri;
    }
    const dest = new File(new Directory(destDirUri), name);
    await src.copy(dest);
    return dest.uri;
  },

  remove(uri) {
    const f = new File(uri);
    if (f.exists) return f.delete();
    const d = new Directory(uri);
    if (d.exists) d.delete();
  },

  writeBytes(dirUri, name, bytes) {
    const f = new File(new Directory(dirUri), name);
    f.create({ overwrite: true });
    f.write(bytes);
    return f.uri;
  },

  async readBytes(uri) {
    return new File(uri).bytes();
  },

  async pickDirectory() {
    try {
      const dir = await Directory.pickDirectoryAsync();
      if (!dir) return null;
      return { uri: dir.uri, name: displayName(dir.uri) };
    } catch (e) {
      if (e instanceof Error && /cancel/i.test(e.message)) return null;
      throw e;
    }
  },

  async preview(uri) {
    const f = new File(uri);
    if (await f.canPreview()) {
      await f.preview();
      return true;
    }
    return false;
  },

  cacheUri() {
    return Paths.cache.uri;
  },

  freeSpace() {
    try {
      return Paths.availableDiskSpace;
    } catch {
      return null;
    }
  },
};

/** Web-only helper in driver.web.ts; native timestamps come from the file system. */
export function setMeta(_uri: string, _meta: Partial<Pick<Entry, 'size' | 'modifiedAt' | 'createdAt'>>) {}
