import { router } from 'expo-router';

import type { Preset } from '@/engine/presets';
import { isWeb } from '@/services/env';
import { driver, shareFiles } from '@/services/fs';
import { haptics } from '@/services/haptics';
import { usePresets } from '@/store/presets';
import { useStudio } from '@/store/studio';
import { confirmDestructive, showActions } from '@/ui/ActionSheet';
import { toast } from '@/ui/Toast';

export function applyPresetToStudio(p: Preset, mode: 'replace' | 'append' = 'replace') {
  useStudio.getState().loadPreset(p, mode);
  haptics.success();
  toast(mode === 'replace' ? `“${p.name}” no Estúdio` : `Regras de “${p.name}” adicionadas`, { tone: 'success' });
  router.navigate('/(tabs)/(studio)');
}

export function sharePreset(p: Preset) {
  return sharePresets([p], p.name);
}

/** Presets travel as a small `.lote.json` file (AirDrop, WhatsApp, e-mail…). */
export async function sharePresets(list: Preset[], fileName: string) {
  if (isWeb) return toast('Compartilhar não está disponível na web', { tone: 'info' });
  const json = JSON.stringify({ app: 'lote', version: 1, presets: list.map((p) => ({ name: p.name, description: p.description, sf: p.sf, md: p.md, rules: p.rules })) }, null, 2);
  const bytes = new TextEncoder().encode(json);
  const safe = fileName.replace(/[\/\\:*?"<>|]/g, '-');
  const uri = driver.writeBytes(driver.cacheUri(), `${safe}.lote.json`, bytes);
  try {
    await shareFiles([uri], safe);
  } catch {
    toast('Não foi possível compartilhar', { tone: 'error' });
  }
}

export function presetActions(p: Preset) {
  const store = usePresets.getState();
  showActions({
    title: p.name,
    message: p.description,
    options: [
      { label: 'Usar no Estúdio', icon: { sf: 'wand.and.rays', md: 'auto_fix_high' }, onPress: () => applyPresetToStudio(p) },
      { label: 'Adicionar às regras atuais', icon: { sf: 'text.badge.plus', md: 'playlist_add' }, onPress: () => applyPresetToStudio(p, 'append') },
      { label: p.favorite ? 'Remover dos favoritos' : 'Favoritar', icon: { sf: p.favorite ? 'star.slash' : 'star', md: 'star' }, onPress: () => { haptics.selection(); store.toggleFavorite(p.id); } },
      { label: 'Usar no Compartilhar e widget', icon: { sf: 'bolt', md: 'bolt' }, onPress: () => { store.setQuickPreset(p.id); haptics.success(); toast(`“${p.name}” é o preset rápido`, { tone: 'success' }); } },
      { label: 'Duplicar', icon: { sf: 'plus.square.on.square', md: 'content_copy' }, onPress: () => { const c = store.duplicate(p.id); if (c) toast(`“${c.name}” criado`, { tone: 'success' }); } },
      { label: 'Compartilhar preset', icon: { sf: 'square.and.arrow.up', md: 'share' }, onPress: () => sharePreset(p) },
      ...(p.builtIn
        ? []
        : [
            {
              label: 'Excluir',
              destructive: true,
              icon: { sf: 'trash', md: 'delete' },
              onPress: () =>
                confirmDestructive({
                  title: `Excluir “${p.name}”?`,
                  confirm: 'Excluir preset',
                  onConfirm: () => {
                    usePresets.getState().remove(p.id);
                    toast('Preset excluído', { action: { label: 'Desfazer', onPress: () => usePresets.setState((s) => ({ custom: [p, ...s.custom] })) } });
                  },
                }),
            },
          ]),
    ],
  });
}

export async function importPresetsFromFile() {
  if (isWeb) return toast('Importar não está disponível na web', { tone: 'info' });
  const DocumentPicker = await import('expo-document-picker');
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets[0]) return;
  try {
    const text = new TextDecoder().decode(await driver.readBytes(res.assets[0].uri));
    const data = JSON.parse(text);
    const list = Array.isArray(data?.presets) ? data.presets : [];
    const valid = list.filter((p: Partial<Preset>) => typeof p?.name === 'string' && Array.isArray(p?.rules));
    if (!valid.length) throw new Error('empty');
    const n = usePresets.getState().importPresets(
      valid.map((p: Partial<Preset>) => ({ name: p.name!, description: p.description ?? '', sf: p.sf ?? 'star', md: p.md ?? 'star', rules: p.rules!, builtIn: false, favorite: false, uses: 0, lastUsedAt: null, createdAt: Date.now(), id: '' })),
    );
    haptics.success();
    toast(`${n} ${n === 1 ? 'preset importado' : 'presets importados'}`, { tone: 'success' });
  } catch {
    haptics.error();
    toast('Arquivo inválido. Use um .lote.json exportado pelo Lote.', { tone: 'error' });
  }
}
