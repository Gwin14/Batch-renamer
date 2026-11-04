import * as Sharing from 'expo-sharing';

import { tr, trn } from '@/i18n';
import { importSharedPayloads } from '@/services/actions';
import { isWeb } from '@/services/env';
import { findPreset, usePresets } from '@/store/presets';
import { useStudio } from '@/store/studio';
import { toast } from '@/ui/Toast';

type Incoming = Parameters<typeof importSharedPayloads>[0][number];

const FILE_TYPES = new Set(['image', 'video', 'audio', 'file']);

let inFlight: Promise<number> | null = null;
let lastHandledAt = 0;

/** True when a share was already handled a moment ago (cold launch races the Studio's own check), with its own toast. */
export const handledRecently = () => Date.now() - lastHandledAt < 10_000;

/** Files from the resolved payloads, falling back to the raw ones (their `value` is already a file URL). */
async function incomingFiles(raw: Sharing.SharePayload[]): Promise<Incoming[]> {
  try {
    const resolved = await Sharing.getResolvedSharedPayloadsAsync();
    const files = resolved
      .filter((p) => p.contentUri && FILE_TYPES.has(p.contentType ?? ''))
      .map((p) => ({ uri: p.contentUri!, name: p.originalName, size: p.contentSize, mimeType: p.contentMimeType ?? p.mimeType ?? null }));
    if (files.length) return files;
  } catch (e) {
    if (__DEV__) console.warn('[share] resolving payloads failed, using raw payloads', e);
  }
  return raw.filter((p) => FILE_TYPES.has(p.shareType) && p.value).map((p) => ({ uri: p.value, name: null, size: null, mimeType: p.mimeType ?? null }));
}

/**
 * Imports files handed over by the share extension (iOS) / share intent (Android).
 * Safe in Expo Go: nothing is ever shared to Expo Go, so payloads are simply empty.
 */
export function consumeIncomingShare(): Promise<number> {
  if (isWeb) return Promise.resolve(0);
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const raw = Sharing.getSharedPayloads();
      if (!raw.length) return 0;
      lastHandledAt = Date.now();
      const files = await incomingFiles(raw);
      const { added, failed } = await importSharedPayloads(files);
      // Clear only after copying, so a failure never loses what was shared.
      Sharing.clearSharedPayloads();
      if (failed) toast(trn(failed, '{{n}} arquivo compartilhado não pôde ser importado', '{{n}} arquivos compartilhados não puderam ser importados'), { tone: 'error' });
      else if (!added && !files.length) toast(tr('Nenhuma foto ou arquivo veio no compartilhamento'), { tone: 'info' });
      applyQuickPresetIfEmpty();
      return added;
    } catch (e) {
      if (__DEV__) console.warn('[share] import failed', e);
      toast(tr('Não foi possível receber os arquivos compartilhados'), { tone: 'error' });
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
