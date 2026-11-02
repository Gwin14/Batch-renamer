import { APP_GROUP, hasCustomNative, isAndroid, isIOS } from '@/services/env';

import type { WidgetSnapshot } from './snapshot';

let lastPayload = '';

/**
 * Pushes the latest snapshot to native widgets. No-op in Expo Go / web:
 * the native modules are required lazily so Expo Go never evaluates them.
 */
export async function syncWidgets(snapshot: WidgetSnapshot) {
  if (!hasCustomNative) return;
  const payload = JSON.stringify({ ...snapshot, updatedAt: 0 });
  if (payload === lastPayload) return;
  lastPayload = payload;
  try {
    if (isIOS) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ExtensionStorage } = require('@bacons/apple-targets') as typeof import('@bacons/apple-targets');
      const store = new ExtensionStorage(APP_GROUP);
      store.set('totalRenamed', snapshot.totalRenamed);
      store.set('batches', snapshot.batches);
      store.set('lastLabel', snapshot.lastLabel);
      store.set('lastAt', snapshot.lastAt);
      store.set('lastCount', snapshot.lastCount);
      store.set('quickPresetName', snapshot.quickPresetName);
      store.set('pendingFiles', snapshot.pendingFiles);
      store.set('favorites', snapshot.favorites.map((f) => ({ id: f.id, name: f.name })));
      ExtensionStorage.reloadWidget();
      ExtensionStorage.reloadControls?.();
    } else if (isAndroid) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { requestWidgetUpdate } = require('react-native-android-widget') as typeof import('react-native-android-widget');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { renderLoteWidget, saveSnapshot } = require('@/widgets/android') as typeof import('@/widgets/android');
      await saveSnapshot(snapshot);
      await requestWidgetUpdate({ widgetName: 'Lote', renderWidget: (info) => renderLoteWidget(snapshot, info) });
    }
  } catch (e) {
    if (__DEV__) console.warn('[widgets] sync failed', e);
  }
}
