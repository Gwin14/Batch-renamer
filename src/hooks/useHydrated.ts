import { useEffect, useState } from 'react';

import { useHistory } from '@/store/history';
import { usePresets } from '@/store/presets';
import { useSettings } from '@/store/settings';
import { useStudio } from '@/store/studio';

const stores = [useSettings, useStudio, usePresets, useHistory];

/** Holds the splash until every persisted store has rehydrated (no onboarding flash). */
export function useHydrated() {
  const [ready, setReady] = useState(() => stores.every((s) => s.persist.hasHydrated()));
  useEffect(() => {
    if (ready) return;
    const check = () => {
      if (stores.every((s) => s.persist.hasHydrated())) setReady(true);
    };
    const unsubs = stores.map((s) => s.persist.onFinishHydration(check));
    check();
    return () => unsubs.forEach((u) => u());
  }, [ready]);
  return ready;
}
