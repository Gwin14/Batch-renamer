import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createRule } from '@/engine/rules';
import { naturalCompare } from '@/engine/text';
import type { FileItem, Rule, RuleType } from '@/engine/types';
import type { Preset } from '@/engine/presets';
import { clonePresetRules } from '@/engine/presets';
import { resolveCaptureDate } from '@/engine/template';

import { storage } from './storage';

export type SortKey = 'manual' | 'name' | 'taken' | 'modified' | 'size' | 'type';

export interface MovedFile {
  id: string;
  newUri: string;
  toName: string;
  destFolderUri: string;
  folder: string;
}

interface StudioState {
  files: FileItem[];
  rules: Rule[];
  sort: SortKey;
  sortDesc: boolean;
  /** preset the pipeline came from, and whether rules diverged since */
  presetId: string | null;
  presetName: string | null;
  dirty: boolean;
  /** device folder being edited in place (Android SAF / iOS picker) */
  deviceFolder: { uri: string; name: string } | null;

  addFiles: (files: FileItem[]) => number;
  replaceFiles: (files: FileItem[]) => void;
  removeFiles: (ids: string[]) => void;
  clearFiles: () => void;
  moveFile: (from: number, to: number) => void;
  setSort: (key: SortKey, desc?: boolean) => void;
  patchFile: (id: string, patch: Partial<FileItem>) => void;
  applyMoved: (moved: MovedFile[]) => void;
  setDeviceFolder: (f: { uri: string; name: string } | null) => void;

  addRule: (type: RuleType) => Rule;
  insertRule: (rule: Rule, index?: number) => void;
  updateRule: (id: string, patch: Partial<Rule>) => void;
  removeRule: (id: string) => Rule | undefined;
  duplicateRule: (id: string) => void;
  moveRule: (from: number, to: number) => void;
  toggleRule: (id: string) => void;
  clearRules: () => void;
  loadPreset: (preset: Preset, mode?: 'replace' | 'append') => void;
}

function sortFiles(files: FileItem[], key: SortKey, desc: boolean): FileItem[] {
  if (key === 'manual') return files;
  const cmp: Record<Exclude<SortKey, 'manual'>, (a: FileItem, b: FileItem) => number> = {
    name: (a, b) => naturalCompare(a.name, b.name),
    taken: (a, b) => (resolveCaptureDate(a) ?? 0) - (resolveCaptureDate(b) ?? 0) || naturalCompare(a.name, b.name),
    modified: (a, b) => (a.modifiedAt ?? 0) - (b.modifiedAt ?? 0),
    size: (a, b) => a.size - b.size,
    type: (a, b) => naturalCompare(a.name.split('.').pop() ?? '', b.name.split('.').pop() ?? '') || naturalCompare(a.name, b.name),
  };
  const sorted = [...files].sort(cmp[key]);
  return desc ? sorted.reverse() : sorted;
}

const move = <T,>(arr: T[], from: number, to: number) => {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
};

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      files: [],
      rules: [],
      sort: 'name',
      sortDesc: false,
      presetId: null,
      presetName: null,
      dirty: false,
      deviceFolder: null,

      addFiles: (incoming) => {
        const known = new Set(get().files.map((f) => f.uri));
        const fresh = incoming.filter((f) => !known.has(f.uri));
        const { sort, sortDesc } = get();
        set((s) => ({ files: sortFiles([...s.files, ...fresh], sort, sortDesc) }));
        return fresh.length;
      },
      replaceFiles: (files) => set((s) => ({ files: sortFiles(files, s.sort, s.sortDesc) })),
      removeFiles: (ids) => set((s) => ({ files: s.files.filter((f) => !ids.includes(f.id)) })),
      clearFiles: () => set({ files: [], deviceFolder: null }),
      moveFile: (from, to) => set((s) => ({ files: move(s.files, from, to), sort: 'manual' })),
      setSort: (key, desc) =>
        set((s) => {
          const d = desc ?? (s.sort === key ? !s.sortDesc : false);
          return { sort: key, sortDesc: d, files: sortFiles(s.files, key, d) };
        }),
      patchFile: (id, patch) => set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
      applyMoved: (moved) =>
        set((s) => {
          const byId = new Map(moved.map((m) => [m.id, m]));
          return {
            files: s.files.map((f) => {
              const m = byId.get(f.id);
              return m ? { ...f, uri: m.newUri, name: m.toName, folderUri: m.destFolderUri, folder: m.folder } : f;
            }),
          };
        }),
      setDeviceFolder: (deviceFolder) => set({ deviceFolder }),

      addRule: (type) => {
        const rule = createRule(type);
        set((s) => ({ rules: [...s.rules, rule], dirty: true }));
        return rule;
      },
      insertRule: (rule, index) =>
        set((s) => {
          const rules = [...s.rules];
          rules.splice(index ?? rules.length, 0, rule);
          return { rules, dirty: true };
        }),
      updateRule: (id, patch) =>
        set((s) => ({ rules: s.rules.map((r) => (r.id === id ? ({ ...r, ...patch } as Rule) : r)), dirty: true })),
      removeRule: (id) => {
        const rule = get().rules.find((r) => r.id === id);
        set((s) => ({ rules: s.rules.filter((r) => r.id !== id), dirty: true }));
        return rule;
      },
      duplicateRule: (id) =>
        set((s) => {
          const i = s.rules.findIndex((r) => r.id === id);
          if (i < 0) return s;
          const copy = { ...s.rules[i], id: createRule(s.rules[i].type).id };
          const rules = [...s.rules];
          rules.splice(i + 1, 0, copy);
          return { rules, dirty: true };
        }),
      moveRule: (from, to) => set((s) => ({ rules: move(s.rules, from, to), dirty: true })),
      toggleRule: (id) => set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)), dirty: true })),
      clearRules: () => set({ rules: [], presetId: null, presetName: null, dirty: false }),
      loadPreset: (preset, mode = 'replace') =>
        set((s) => ({
          ...(mode === 'replace' && preset.sort ? { sort: preset.sort, sortDesc: false, files: sortFiles(s.files, preset.sort, false) } : {}),
          rules: mode === 'replace' ? clonePresetRules(preset.rules) : [...s.rules, ...clonePresetRules(preset.rules)],
          presetId: mode === 'replace' ? preset.id : s.presetId,
          presetName: mode === 'replace' ? preset.name : s.presetName,
          dirty: mode === 'append',
        })),
    }),
    {
      name: 'lote.studio',
      storage,
      version: 1,
      partialize: (s) => ({
        files: s.files,
        rules: s.rules,
        sort: s.sort,
        sortDesc: s.sortDesc,
        presetId: s.presetId,
        presetName: s.presetName,
        dirty: s.dirty,
      }),
    },
  ),
);
