import { useEffect } from 'react';

import { getLang, tr, useLang } from '@/i18n';
import { syncWidgets } from '@/services/native/widgets';
import { setupQuickActions } from '@/services/native/quickActions';
import { usePro } from '@/services/purchases';
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
    quickPresetName: findPreset(presets, presets.quickPresetId)?.name ?? tr('Fotos por data'),
    favorites: allPresets(presets).filter((p) => p.favorite).slice(0, 3).map((p) => ({ id: p.id, name: p.name })),
    pendingFiles: useStudio.getState().files.length,
    updatedAt: Date.now(),
    lang: getLang(),
    pro: usePro.getState().isPro,
  };
}

/** Mirrors app state to widgets / quick actions (no-ops in Expo Go). */
export function useWidgetSync() {
  const lang = useLang();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => syncWidgets(snapshot()), 600);
    };
    schedule();
    const subs = [useHistory.subscribe(schedule), usePresets.subscribe(schedule), useStudio.subscribe((s, p) => s.files.length !== p.files.length && schedule()), usePro.subscribe((s, p) => s.isPro !== p.isPro && schedule())];
    return () => {
      clearTimeout(timer);
      subs.forEach((u) => u());
    };
  }, [lang]);

  const quickName = usePresets((s) => findPreset(s, s.quickPresetId)?.name ?? tr('Fotos por data'));
  useEffect(() => setupQuickActions(quickName), [quickName, lang]);
}
