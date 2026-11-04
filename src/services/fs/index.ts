import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { zipSync, type Zippable } from 'fflate';

import { parseExifDate } from '@/engine/date';
import { joinName, kindOf, splitName } from '@/engine/text';
import type { FileItem, FileSource, PreviewItem } from '@/engine/types';
import { tr } from '@/i18n';
import { isWeb } from '@/services/env';
import { displayName, driver, LIBRARY_DIR, setMeta } from './driver';
import { SAMPLE_FILES, sampleBytes } from './samples';
import type { Entry } from './types';

export type { Entry } from './types';
export { driver, displayName, LIBRARY_DIR };

let idCounter = 0;
export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}${(idCounter++).toString(36)}`;

export const libraryRoot = () => driver.rootUri();

export function isInLibrary(uri: string) {
  return uri.startsWith(libraryRoot());
}

/** Turns a directory entry into a rename-able FileItem. */
export function toFileItem(entry: Entry, folderUri: string, source: FileSource, extra: Partial<FileItem> = {}): FileItem {
  const folder = folderUri === libraryRoot() ? LIBRARY_DIR : displayName(folderUri);
  return {
    id: newId(),
    uri: entry.uri,
    name: entry.name,
    size: entry.size,
    modifiedAt: entry.modifiedAt,
    createdAt: entry.createdAt,
    folder,
    folderUri,
    source,
    ...extra,
  };
}

export function uniqueName(dirUri: string, name: string): string {
  const existing = new Set(driver.list(dirUri).map((e) => e.name.toLowerCase()));
  if (!existing.has(name.toLowerCase())) return name;
  const { base, ext } = splitName(name);
  let n = 2;
  while (existing.has(joinName(`${base} (${n})`, ext).toLowerCase())) n++;
  return joinName(`${base} (${n})`, ext);
}

export function folderFor(name: string): string {
  return driver.mkdir(libraryRoot(), name);
}

/** Folder tree helpers for the Files tab. */
export function listFolder(dirUri: string): Entry[] {
  try {
    return driver.list(dirUri);
  } catch {
    return [];
  }
}

export function countItems(dirUri: string): number {
  return listFolder(dirUri).length;
}

export function listFilesRecursive(dirUri: string, recursive: boolean, depth = 0): { entry: Entry; folderUri: string }[] {
  const out: { entry: Entry; folderUri: string }[] = [];
  for (const e of listFolder(dirUri)) {
    if (e.isDirectory) {
      if (recursive && depth < 6) out.push(...listFilesRecursive(e.uri, true, depth + 1));
    } else out.push({ entry: e, folderUri: dirUri });
  }
  return out;
}

/* ───────────── Imports ───────────── */

export async function importDocuments(destFolderUri: string): Promise<FileItem[]> {
  const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: '*/*' });
  if (res.canceled) return [];
  const items: FileItem[] = [];
  for (const asset of res.assets) {
    const name = uniqueName(destFolderUri, asset.name || `${tr('arquivo')}-${items.length + 1}`);
    const uri = await driver.copyInto(asset.uri, destFolderUri, name);
    const entry = driver.stat(uri) ?? { uri, name, isDirectory: false, size: asset.size ?? 0, modifiedAt: null, createdAt: null };
    items.push(
      toFileItem({ ...entry, name }, destFolderUri, 'library', {
        size: asset.size ?? entry.size,
        modifiedAt: asset.lastModified ?? entry.modifiedAt,
        mimeType: asset.mimeType ?? null,
      }),
    );
  }
  return items;
}

function mediaToItem(asset: ImagePicker.ImagePickerAsset, uri: string, name: string, destFolderUri: string): FileItem {
  const entry = driver.stat(uri);
  const exifDate = parseExifDate(asset.exif?.DateTimeOriginal ?? asset.exif?.['{Exif}']?.DateTimeOriginal ?? asset.exif?.DateTime);
  return toFileItem(entry ?? { uri, name, isDirectory: false, size: asset.fileSize ?? 0, modifiedAt: null, createdAt: null }, destFolderUri, 'library', {
    name,
    size: asset.fileSize ?? entry?.size ?? 0,
    takenAt: exifDate,
    width: asset.width || null,
    height: asset.height || null,
    duration: asset.duration ? asset.duration / 1000 : null,
    mimeType: asset.mimeType ?? null,
  });
}

export async function importMedia(destFolderUri: string): Promise<FileItem[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    selectionLimit: 0,
    exif: true,
    quality: 1,
    orderedSelection: true,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
  });
  if (res.canceled) return [];
  const items: FileItem[] = [];
  for (const asset of res.assets) {
    const fallbackExt = asset.type === 'video' ? 'mov' : 'jpg';
    const original = asset.fileName || displayName(asset.uri) || `midia-${items.length + 1}.${fallbackExt}`;
    const name = uniqueName(destFolderUri, original);
    const uri = await driver.copyInto(asset.uri, destFolderUri, name);
    items.push(mediaToItem(asset, uri, name, destFolderUri));
  }
  return items;
}

/** Captures a photo; the caller names it right away with the active pipeline ("câmera com nome"). */
export async function captureWithCamera(destFolderUri: string): Promise<FileItem | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('CAMERA_DENIED');
  const res = await ImagePicker.launchCameraAsync({ exif: true, quality: 0.92 });
  if (res.canceled || !res.assets[0]) return null;
  const asset = res.assets[0];
  const name = uniqueName(destFolderUri, asset.fileName || `${tr('Foto')} ${new Date().toISOString().slice(0, 10)}.jpg`);
  const uri = await driver.copyInto(asset.uri, destFolderUri, name);
  const item = mediaToItem(asset, uri, name, destFolderUri);
  return { ...item, takenAt: item.takenAt ?? Date.now() };
}

/** Copies files received from the share sheet into the library. One bad file never drops the rest. */
export async function importShared(payloads: { uri: string; name: string | null; size: number | null; mimeType: string | null }[]): Promise<{ items: FileItem[]; failed: number }> {
  const dest = folderFor(tr('Compartilhados'));
  const items: FileItem[] = [];
  let failed = 0;
  for (const p of payloads) {
    try {
      const name = uniqueName(dest, p.name || displayName(p.uri) || `${tr('arquivo')}-${items.length + 1}`);
      const uri = await driver.copyInto(p.uri, dest, name);
      const entry = driver.stat(uri) ?? { uri, name, isDirectory: false, size: p.size ?? 0, modifiedAt: Date.now(), createdAt: Date.now() };
      items.push(toFileItem({ ...entry, name }, dest, 'library', { mimeType: p.mimeType }));
      // The extension's copy in the App Group container is no longer needed.
      if (p.uri.includes('/AppGroup/')) {
        try {
          driver.remove(p.uri);
        } catch {}
      }
    } catch (e) {
      failed++;
      if (__DEV__) console.warn('[share] could not copy', p.uri, e);
    }
  }
  return { items, failed };
}

export async function pickDeviceFolder(recursive: boolean): Promise<{ name: string; uri: string; files: FileItem[] } | null> {
  const picked = await driver.pickDirectory();
  if (!picked) return null;
  const files = listFilesRecursive(picked.uri, recursive).map(({ entry, folderUri }) => toFileItem(entry, folderUri, 'device-folder'));
  return { ...picked, files };
}

export function createSampleFiles(): FileItem[] {
  const dest = folderFor(tr('Exemplos'));
  // fresh set every time
  for (const e of driver.list(dest)) driver.remove(e.uri);
  return SAMPLE_FILES.map((spec) => {
    const uri = driver.writeBytes(dest, spec.name, sampleBytes(spec));
    setMeta(uri, { size: spec.size, modifiedAt: spec.takenAt + 3_600_000, createdAt: spec.takenAt });
    const entry = driver.stat(uri)!;
    return toFileItem(entry, dest, 'library', {
      size: spec.size,
      takenAt: kindOf(spec.name) === 'image' ? spec.takenAt : null,
      createdAt: spec.takenAt,
      modifiedAt: spec.takenAt + 3_600_000,
      width: spec.width ?? null,
      height: spec.height ?? null,
      duration: spec.duration ?? null,
    });
  });
}

/* ───────────── Apply / undo ───────────── */

export interface MoveOp {
  id: string;
  uri: string;
  /** current folder */
  folderUri: string;
  /** destination folder */
  destFolderUri: string;
  fromName: string;
  toName: string;
}

export interface MoveResult extends MoveOp {
  ok: boolean;
  newUri: string;
  error?: string;
}

const key = (folder: string, name: string) => `${folder}\u0000${name.normalize('NFC').toLowerCase()}`;

/**
 * Executes renames/moves safely:
 * 1. ops whose target collides with another batch file's *current* name (swaps, chains a→b→c)
 *    or that only change letter case go through a temporary name first;
 * 2. everything is then moved to its final name.
 * Failures are isolated per file and reported.
 */
export async function executeMoves(ops: MoveOp[], onProgress?: (done: number, total: number) => void): Promise<MoveResult[]> {
  const current = new Set(ops.map((o) => key(o.folderUri, o.fromName)));
  const state = ops.map((op) => ({ op, uri: op.uri, tmp: false }));
  const results: MoveResult[] = [];
  const total = ops.length;
  let done = 0;

  // Phase 1 — park conflicting files on temp names
  for (const s of state) {
    const { op } = s;
    const target = key(op.destFolderUri, op.toName);
    const selfKey = key(op.folderUri, op.fromName);
    const caseOnly = target === selfKey && op.toName !== op.fromName;
    if ((current.has(target) && target !== selfKey) || caseOnly) {
      try {
        const { ext } = splitName(op.fromName);
        s.uri = await driver.renameInFolder(s.uri, op.folderUri, joinName(`.lote-tmp-${op.id}`, ext));
        s.tmp = true;
      } catch {
        /* falls through to direct attempt */
      }
    }
  }

  // Phase 2 — final names
  for (const s of state) {
    const { op } = s;
    try {
      let newUri: string;
      if (op.destFolderUri === op.folderUri) newUri = await driver.renameInFolder(s.uri, op.folderUri, op.toName);
      else newUri = await driver.moveTo(s.uri, op.destFolderUri, op.toName);
      results.push({ ...op, ok: true, newUri });
    } catch (e) {
      if (s.tmp) {
        try {
          s.uri = await driver.renameInFolder(s.uri, op.folderUri, op.fromName);
        } catch {}
      }
      results.push({ ...op, ok: false, newUri: s.uri, error: e instanceof Error ? e.message : String(e) });
    }
    done++;
    onProgress?.(done, total);
  }
  return results;
}

export function opsFromPreview(items: PreviewItem[]): MoveOp[] {
  return items.map((i) => ({
    id: i.file.id,
    uri: i.file.uri,
    folderUri: i.file.folderUri,
    destFolderUri: i.subfolder ? driver.ensurePath(i.file.folderUri, i.subfolder) : i.file.folderUri,
    fromName: i.from,
    toName: i.to,
  }));
}

/** Names in each folder that are not part of the batch, for collision checks. */
export function occupiedNames(files: FileItem[]): Map<string, Set<string>> {
  const batch = new Set(files.map((f) => f.uri));
  const out = new Map<string, Set<string>>();
  const folders = new Set(files.map((f) => f.folderUri));
  for (const folder of folders) {
    const names = new Set<string>();
    for (const e of listFolder(folder)) if (!batch.has(e.uri) && !e.isDirectory) names.add(e.name.normalize('NFC').toLowerCase());
    out.set(folder, names);
  }
  return out;
}

/* ───────────── Export ───────────── */

export async function shareFiles(uris: string[], zipName = 'Lote'): Promise<void> {
  if (isWeb || !(await Sharing.isAvailableAsync())) throw new Error('SHARE_UNAVAILABLE');
  if (uris.length === 1) return Sharing.shareAsync(uris[0], { dialogTitle: tr('Compartilhar arquivo') });
  const zip = await makeZip(uris, zipName);
  await Sharing.shareAsync(zip, { mimeType: 'application/zip', UTI: 'public.zip-archive', dialogTitle: 'Compartilhar ZIP' });
}

export async function makeZip(uris: string[], zipName: string): Promise<string> {
  const entries: Zippable = {};
  for (const uri of uris) {
    const name = uniqueKey(entries, displayName(uri));
    entries[name] = [await driver.readBytes(uri), { level: kindOf(name) === 'document' || kindOf(name) === 'code' ? 6 : 0 }];
  }
  const bytes = zipSync(entries);
  return driver.writeBytes(driver.cacheUri(), `${zipName.replace(/[\/\\:*?"<>|]/g, '-')}.zip`, bytes);
}

function uniqueKey(obj: object, name: string) {
  if (!(name in obj)) return name;
  const { base, ext } = splitName(name);
  let n = 2;
  while (joinName(`${base} (${n})`, ext) in obj) n++;
  return joinName(`${base} (${n})`, ext);
}

export async function exportToFolder(uris: string[]): Promise<{ count: number; folder: string } | null> {
  const picked = await driver.pickDirectory();
  if (!picked) return null;
  let count = 0;
  for (const uri of uris) {
    await driver.copyInto(uri, picked.uri, displayName(uri));
    count++;
  }
  return { count, folder: picked.name };
}

export async function saveToPhotos(uris: string[]): Promise<number> {
  const { Asset, requestPermissionsAsync } = await import('expo-media-library');
  const perm = await requestPermissionsAsync(true);
  if (!perm.granted) throw new Error('PHOTOS_DENIED');
  let saved = 0;
  for (const uri of uris) {
    const k = kindOf(displayName(uri));
    if (k !== 'image' && k !== 'video') continue;
    await Asset.create(uri);
    saved++;
  }
  return saved;
}

export async function previewFile(uri: string): Promise<boolean> {
  try {
    return await driver.preview(uri);
  } catch {
    return false;
  }
}

export function deleteEntries(uris: string[]) {
  for (const uri of uris) {
    try {
      driver.remove(uri);
    } catch {}
  }
}
