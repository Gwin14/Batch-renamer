/**
 * App-level use cases that orchestrate the file system, stores, haptics and widgets.
 * Screens call these; they never talk to the driver directly.
 */
import { RULE_META } from '@/engine/catalog';
import { applicableItems, runPipeline } from '@/engine/pipeline';
import type { PreviewSummary } from '@/engine/types';
import {
  captureWithCamera,
  displayName,
  driver,
  executeMoves,
  folderFor,
  importDocuments,
  importMedia,
  importShared,
  isInLibrary,
  libraryRoot,
  LIBRARY_DIR,
  occupiedNames,
  opsFromPreview,
  pickDeviceFolder,
  type MoveOp,
  type MoveResult,
} from '@/services/fs';
import { haptics } from '@/services/haptics';
import { findPreset, usePresets } from '@/store/presets';
import { useHistory, type HistoryBatch } from '@/store/history';
import { useSettings } from '@/store/settings';
import { useStudio } from '@/store/studio';

function batchLabel(rules: { type: string; enabled: boolean }[]) {
  const active = rules.filter((r) => r.enabled);
  if (active.length === 1) return RULE_META[active[0].type as keyof typeof RULE_META]?.title ?? 'Regra única';
  return `${active.length} regras`;
}

export type ImportKind = 'photos' | 'files' | 'camera' | 'folder';

export function computePreview(now = Date.now()): PreviewSummary {
  const { files, rules } = useStudio.getState();
  const { conflict, keepPairs } = useSettings.getState();
  return runPipeline({ files, rules, options: { conflict, protectExtension: true, keepPairs, now }, occupied: occupiedNames(files) });
}

const folderLabel = (uri: string) => (uri === libraryRoot() ? LIBRARY_DIR : displayName(uri));

export async function importInto(kind: ImportKind): Promise<{ added: number; folder?: string }> {
  const studio = useStudio.getState();
  const dest = folderFor(useSettings.getState().importFolder || 'Importados');
  switch (kind) {
    case 'photos': {
      const items = await importMedia(dest);
      return { added: studio.addFiles(items) };
    }
    case 'files': {
      const items = await importDocuments(dest);
      return { added: studio.addFiles(items) };
    }
    case 'camera': {
      const item = await captureWithCamera(dest);
      return { added: item ? studio.addFiles([item]) : 0 };
    }
    case 'folder': {
      const picked = await pickDeviceFolder(useSettings.getState().includeSubfolders);
      if (!picked) return { added: 0 };
      studio.setDeviceFolder({ uri: picked.uri, name: picked.name });
      return { added: studio.addFiles(picked.files), folder: picked.name };
    }
  }
}

export async function importSharedPayloads(payloads: Parameters<typeof importShared>[0]) {
  const items = await importShared(payloads);
  return useStudio.getState().addFiles(items);
}

export interface ApplyOutcome {
  batch: HistoryBatch | null;
  ok: number;
  failed: MoveResult[];
}

export async function applyPreview(summary: PreviewSummary, onProgress?: (done: number, total: number) => void): Promise<ApplyOutcome> {
  const { conflict } = useSettings.getState();
  const items = applicableItems(summary, conflict);
  if (!items.length) return { batch: null, ok: 0, failed: [] };

  const results = await executeMoves(opsFromPreview(items), onProgress);
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  useStudio.getState().applyMoved(
    ok.map((r) => ({ id: r.id, newUri: r.newUri, toName: r.toName, destFolderUri: r.destFolderUri, folder: folderLabel(r.destFolderUri) })),
  );

  const studio = useStudio.getState();
  const presets = usePresets.getState();
  const preset = findPreset(presets, studio.presetId);
  if (preset && !studio.dirty) presets.markUsed(preset.id);

  const batch = ok.length
    ? useHistory.getState().add({
        label: preset ? (studio.dirty ? `${preset.name} (editado)` : preset.name) : batchLabel(studio.rules),
        presetId: preset?.id ?? null,
        failed: failed.length,
        ops: ok.map((r) => ({ id: r.id, fromName: r.fromName, toName: r.toName, folderUri: r.folderUri, destFolderUri: r.destFolderUri, uri: r.newUri })),
      })
    : null;

  useSettings.getState().set({ batches: useSettings.getState().batches + 1 });
  if (failed.length && !ok.length) haptics.error();
  else if (failed.length) haptics.warning();
  else haptics.success();
  return { batch, ok: ok.length, failed };
}

export async function undoBatch(batch: HistoryBatch): Promise<{ restored: number; missing: number; failed: number }> {
  const present = batch.ops.filter((o) => driver.exists(o.uri));
  const missing = batch.ops.length - present.length;
  const ops: MoveOp[] = present.map((o) => ({
    id: o.id,
    uri: o.uri,
    folderUri: o.destFolderUri,
    destFolderUri: o.folderUri,
    fromName: o.toName,
    toName: o.fromName,
  }));
  const results = await executeMoves(ops);
  const ok = results.filter((r) => r.ok);
  useHistory.getState().markUndone(batch.id, ok.map((r) => ({ id: r.id, uri: r.newUri })));
  useStudio.getState().applyMoved(ok.map((r) => ({ id: r.id, newUri: r.newUri, toName: r.toName, destFolderUri: r.destFolderUri, folder: folderLabel(r.destFolderUri) })));
  // Remove now-empty subfolders created by "Organizar em pastas"
  const cleaned = new Set<string>();
  for (const o of present) {
    let dir = o.destFolderUri;
    // walk up 2026/07 → 2026 while empty, never above the original folder
    while (dir !== o.folderUri && dir.startsWith(o.folderUri) && isInLibrary(dir) && !cleaned.has(dir)) {
      try {
        if (driver.list(dir).length > 0) break;
        driver.remove(dir);
        cleaned.add(dir);
      } catch {
        break;
      }
      dir = dir.replace(/\/+$/, '').replace(/\/[^/]*$/, '');
    }
  }
  if (ok.length) haptics.success();
  else haptics.error();
  return { restored: ok.length, missing, failed: results.length - ok.length };
}

/** Drops studio files that were deleted/moved outside the app. */
export function revalidateStudio() {
  const { files, replaceFiles } = useStudio.getState();
  const alive = files.filter((f) => f.source === 'device-folder' || driver.exists(f.uri));
  if (alive.length !== files.length) replaceFiles(alive);
}
