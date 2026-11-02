import { useEffect } from 'react';

import { syncWidgets } from '@/services/native/widgets';
import { setupQuickActions } from '@/services/native/quickActions';
import { useHistory, totalRenamed } from '@/store/history';
import { allPresets, findPreset, usePresets } from '@/store/presets';
import { useStudio } from '@/store/studio';

function snapshot() {
  const batches = useHistory.getState().batches;
  const presets = usePresets.getState();
  const last = batches.find((b) => !b.undoneAt);
  return {
    totalRenamed: totalRenamed(batches),
    batches: batches.length,
    lastLabel: last?.label ?? '',
    lastAt: last?.at ?? 0,
    lastCount: last?.ops.length ?? 0,
    quickPresetName: findPreset(presets, presets.quickPresetId)?.name ?? 'Fotos por data',
    favorites: allPresets(presets).filter((p) => p.favorite).slice(0, 3).map((p) => ({ id: p.id, name: p.name })),
    pendingFiles: useStudio.getState().files.length,
    updatedAt: Date.now(),
  };
}

/** Mirrors app state to widgets / quick actions (no-ops in Expo Go). */
export function useWidgetSync() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => syncWidgets(snapshot()), 600);
    };
    schedule();
    const subs = [useHistory.subscribe(schedule), usePresets.subscribe(schedule), useStudio.subscribe((s, p) => s.files.length !== p.files.length && schedule())];
    return () => {
      clearTimeout(timer);
      subs.forEach((u) => u());
    };
  }, []);

  const quickName = usePresets((s) => findPreset(s, s.quickPresetId)?.name ?? 'Fotos por data');
  useEffect(() => setupQuickActions(quickName), [quickName]);
}
