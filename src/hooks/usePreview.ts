import { useFocusEffect } from 'expo-router';
import { useCallback, useDeferredValue, useMemo, useState } from 'react';

import { runPipeline } from '@/engine/pipeline';
import { occupiedNames } from '@/services/fs';
import { useSettings } from '@/store/settings';
import { useStudio } from '@/store/studio';

/** Clock for {date} variables — refreshed on focus so the preview stays stable while editing. */
export function useFocusNow() {
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(useCallback(() => setNow(Date.now()), []));
  return now;
}

/** Live preview of the whole batch. Rules are deferred so typing never blocks on large batches. */
export function usePreview(now: number) {
  const files = useStudio((s) => s.files);
  const rules = useStudio((s) => s.rules);
  const conflict = useSettings((s) => s.conflict);
  const keepPairs = useSettings((s) => s.keepPairs);
  const deferredRules = useDeferredValue(rules);
  const occupied = useMemo(() => occupiedNames(files), [files]);
  return useMemo(
    () => runPipeline({ files, rules: deferredRules, options: { conflict, protectExtension: true, keepPairs, now }, occupied }),
    [files, deferredRules, conflict, keepPairs, now, occupied],
  );
}
