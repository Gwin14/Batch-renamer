import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ConflictStrategy } from '@/engine/types';
import { applyLangPref, type LangPref } from '@/i18n';
import { setHapticsEnabled } from '@/services/haptics';

import { storage } from './storage';

export type ThemePref = 'system' | 'light' | 'dark';

interface SettingsState {
  onboarded: boolean;
  theme: ThemePref;
  /** UI language; "system" follows the device */
  language: LangPref;
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
  language: 'system' as LangPref,
  haptics: true,
  conflict: 'suffix' as ConflictStrategy,
  confirmBeforeApply: true,
  includeSubfolders: false,
  keepPairs: true,
  /** Empty = the localized default (“Importados”, “Imported”…) */
  importFolder: '',
  showDiff: true,
  batches: 0,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => {
        if (patch.haptics !== undefined) setHapticsEnabled(patch.haptics);
        if (patch.language !== undefined) applyLangPref(patch.language);
        set(patch);
      },
      completeOnboarding: () => set({ onboarded: true }),
      reset: () => {
        applyLangPref(DEFAULTS.language);
        set({ ...DEFAULTS, onboarded: true });
      },
    }),
    {
      name: 'lote.settings',
      storage,
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) setHapticsEnabled(state.haptics);
        applyLangPref(state?.language ?? 'system');
      },
    },
  ),
);
