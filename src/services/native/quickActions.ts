import { router } from 'expo-router';

import { hasCustomNative, isIOS } from '@/services/env';

type QuickAction = { id: string; title: string; subtitle?: string | null; icon?: string | null; params?: Record<string, string> | null };

/** Long-press app icon shortcuts. Requires a dev/production build (expo-quick-actions). */
export function setupQuickActions(quickPresetName: string): () => void {
  if (!hasCustomNative) return () => {};
  try {
    // Lazy require: the module isn't in Expo Go, so it must never be evaluated there.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const QA = require('expo-quick-actions') as typeof import('expo-quick-actions');
    const items: QuickAction[] = [
      { id: 'photos', title: 'Renomear fotos', subtitle: quickPresetName, icon: isIOS ? 'symbol:photo.on.rectangle' : null, params: { href: '/quick?action=photos' } },
      { id: 'files', title: 'Renomear arquivos', subtitle: 'Escolher do app Arquivos', icon: isIOS ? 'symbol:folder' : null, params: { href: '/quick?action=files' } },
      { id: 'camera', title: 'Foto já nomeada', subtitle: 'Câmera com o preset rápido', icon: isIOS ? 'symbol:camera' : null, params: { href: '/quick?action=camera' } },
      { id: 'history', title: 'Histórico', subtitle: 'Desfazer um lote', icon: isIOS ? 'symbol:clock.arrow.circlepath' : null, params: { href: '/history' } },
    ];
    QA.setItems(items).catch(() => {});
    const open = (a?: QuickAction | { params?: Record<string, unknown> | null }) => {
      const href = a?.params?.href;
      if (typeof href === 'string') router.push(href as never);
    };
    if (QA.initial) setTimeout(() => open(QA.initial as QuickAction), 400);
    const sub = QA.addListener(open);
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
