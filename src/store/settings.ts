import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ConflictStrategy } from '@/engine/types';
import { setHapticsEnabled } from '@/services/haptics';

import { storage } from './storage';

export type ThemePref = 'system' | 'light' | 'dark';

interface SettingsState {
  onboarded: boolean;
  theme: ThemePref;
  haptics: boolean;
  conflict: ConflictStrategy;
  confirmBeforeApply: boolean;
  includeSubfolders: boolean;
  /** Rename files that share a base name (photo + .photo/.xmp/.aae sidecars) together */
  keepPairs: boolean;
  importFolder: string;
  showDiff: boolean;
  /** Times the user completed a batch — drives tips and review prompt */
  batches: number;
  set: (patch: Partial<Omit<SettingsState, 'set' | 'completeOnboarding' | 'reset'>>) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

const DEFAULTS = {
  onboarded: false,
  theme: 'system' as ThemePref,
  haptics: true,
  conflict: 'suffix' as ConflictStrategy,
  confirmBeforeApply: true,
  includeSubfolders: false,
  keepPairs: true,
  importFolder: 'Importados',
  showDiff: true,
  batches: 0,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => {
        if (patch.haptics !== undefined) setHapticsEnabled(patch.haptics);
        set(patch);
      },
      completeOnboarding: () => set({ onboarded: true }),
      reset: () => set({ ...DEFAULTS, onboarded: true }),
    }),
    {
      name: 'lote.settings',
      storage,
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) setHapticsEnabled(state.haptics);
      },
    },
  ),
);
