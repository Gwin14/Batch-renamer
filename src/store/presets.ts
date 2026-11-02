import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { builtInPresets, clonePresetRules, type Preset } from '@/engine/presets';
import type { Rule } from '@/engine/types';
import { newId } from '@/services/fs';

import { storage } from './storage';

interface UsageState {
  favorite: boolean;
  uses: number;
  lastUsedAt: number | null;
}

interface PresetsState {
  custom: Preset[];
  builtInUsage: Record<string, UsageState>;
  /** preset applied by default from the share sheet / widget quick rename */
  quickPresetId: string | null;
  save: (input: { name: string; description?: string; sf?: string; md?: string; rules: Rule[]; sort?: Preset['sort'] }) => Preset;
  update: (id: string, patch: Partial<Pick<Preset, 'name' | 'description' | 'rules' | 'sf' | 'md'>>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => Preset | undefined;
  toggleFavorite: (id: string) => void;
  markUsed: (id: string) => void;
  setQuickPreset: (id: string | null) => void;
  importPresets: (presets: Preset[]) => number;
}

const BUILT_INS = builtInPresets();

export const usePresets = create<PresetsState>()(
  persist(
    (set, get) => ({
      custom: [],
      builtInUsage: {},
      quickPresetId: 'bi-photos-date',

      save: ({ name, description = '', sf = 'star', md = 'star', rules, sort }) => {
        const preset: Preset = {
          id: `p-${newId()}`,
          name: name.trim() || 'Sem nome',
          description,
          sf,
          md,
          rules: clonePresetRules(rules),
          builtIn: false,
          favorite: false,
          uses: 0,
          lastUsedAt: null,
          createdAt: Date.now(),
          sort,
        };
        set((s) => ({ custom: [preset, ...s.custom] }));
        return preset;
      },
      update: (id, patch) => set((s) => ({ custom: s.custom.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      remove: (id) =>
        set((s) => ({ custom: s.custom.filter((p) => p.id !== id), quickPresetId: s.quickPresetId === id ? null : s.quickPresetId })),
      duplicate: (id) => {
        const source = allPresets(get()).find((p) => p.id === id);
        if (!source) return undefined;
        return get().save({ name: `${source.name} (cópia)`, description: source.description, sf: source.sf, md: source.md, rules: source.rules });
      },
      toggleFavorite: (id) =>
        set((s) => {
          if (id.startsWith('bi-')) {
            const cur = s.builtInUsage[id] ?? { favorite: false, uses: 0, lastUsedAt: null };
            return { builtInUsage: { ...s.builtInUsage, [id]: { ...cur, favorite: !cur.favorite } } };
          }
          return { custom: s.custom.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)) };
        }),
      markUsed: (id) =>
        set((s) => {
          const at = Date.now();
          if (id.startsWith('bi-')) {
            const cur = s.builtInUsage[id] ?? { favorite: false, uses: 0, lastUsedAt: null };
            return { builtInUsage: { ...s.builtInUsage, [id]: { ...cur, uses: cur.uses + 1, lastUsedAt: at } } };
          }
          return { custom: s.custom.map((p) => (p.id === id ? { ...p, uses: p.uses + 1, lastUsedAt: at } : p)) };
        }),
      setQuickPreset: (quickPresetId) => set({ quickPresetId }),
      importPresets: (presets) => {
        const fresh = presets.map((p) => ({ ...p, id: `p-${newId()}`, builtIn: false, rules: clonePresetRules(p.rules), createdAt: Date.now() }));
        set((s) => ({ custom: [...fresh, ...s.custom] }));
        return fresh.length;
      },
    }),
    { name: 'lote.presets', storage, version: 1 },
  ),
);

export function allPresets(state: Pick<PresetsState, 'custom' | 'builtInUsage'>): Preset[] {
  const built = BUILT_INS.map((p) => ({ ...p, ...(state.builtInUsage[p.id] ?? {}) }));
  return [...state.custom, ...built];
}

export function findPreset(state: Pick<PresetsState, 'custom' | 'builtInUsage'>, id: string | null | undefined) {
  if (!id) return undefined;
  return allPresets(state).find((p) => p.id === id);
}
