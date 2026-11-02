import * as Sharing from 'expo-sharing';

import { importSharedPayloads } from '@/services/actions';
import { isWeb } from '@/services/env';
import { findPreset, usePresets } from '@/store/presets';
import { useStudio } from '@/store/studio';

let inFlight: Promise<number> | null = null;

/**
 * Imports files handed over by the share extension (iOS) / share intent (Android).
 * Safe in Expo Go: nothing is ever shared to Expo Go, so payloads are simply empty.
 */
export function consumeIncomingShare(): Promise<number> {
  if (isWeb) return Promise.resolve(0);
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      if (!Sharing.getSharedPayloads().length) return 0;
      const resolved = await Sharing.getResolvedSharedPayloadsAsync();
      const files = resolved.filter((p) => p.contentUri && p.contentType !== 'website' && p.contentType !== 'text');
      Sharing.clearSharedPayloads();
      const added = await importSharedPayloads(
        files.map((p) => ({ uri: p.contentUri!, name: p.originalName, size: p.contentSize, mimeType: p.contentMimeType })),
      );
      applyQuickPresetIfEmpty();
      return added;
    } catch (e) {
      if (__DEV__) console.warn('[share] import failed', e);
      return 0;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Shared/quick flows start with the user's quick preset when the pipeline is empty. */
export function applyQuickPresetIfEmpty() {
  const studio = useStudio.getState();
  if (studio.rules.length) return;
  const presets = usePresets.getState();
  const quick = findPreset(presets, presets.quickPresetId);
  if (quick) studio.loadPreset(quick);
}
