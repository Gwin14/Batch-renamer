import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { tr, trn, useLang } from '@/i18n';
import { ensurePresetRoom } from '@/features/presets/actions';
import { LimitNotice } from '@/features/pro/LimitNotice';
import { FREE_LIMITS } from '@/services/purchases';
import { haptics } from '@/services/haptics';
import { findPreset, usePresets } from '@/store/presets';
import { useStudio } from '@/store/studio';
import { Icon } from '@/ui/Icon';
import { Field } from '@/ui/Inputs';
import { Button } from '@/ui/Pressables';
import { SheetHeader } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { radius, space, useTheme } from '@/ui/theme';

const ICONS: { sf: string; md: string }[] = [
  { sf: 'star', md: 'star' },
  { sf: 'photo.on.rectangle', md: 'photo_library' },
  { sf: 'camera', md: 'photo_camera' },
  { sf: 'film', md: 'movie' },
  { sf: 'music.note', md: 'music_note' },
  { sf: 'doc.text', md: 'description' },
  { sf: 'briefcase', md: 'work' },
  { sf: 'airplane', md: 'flight' },
  { sf: 'house', md: 'home' },
  { sf: 'heart', md: 'favorite' },
  { sf: 'graduationcap', md: 'school' },
  { sf: 'cart', md: 'shopping_cart' },
  { sf: 'paintpalette', md: 'palette' },
  { sf: 'folder', md: 'folder' },
  { sf: 'bolt', md: 'bolt' },
  { sf: 'tag', md: 'sell' },
];

/** Save the current pipeline as a preset, update an edited one, or edit name/icon. */
export default function SavePresetSheet() {
  const t = useTheme();
  useLang();
  const { update, edit } = useLocalSearchParams<{ update?: string; edit?: string }>();
  const targetId = update || edit;
  const existing = usePresets((s) => findPreset(s, targetId));
  const rules = useStudio((s) => s.rules);
  const customCount = usePresets((s) => s.custom.length);
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [icon, setIcon] = useState(existing ? { sf: existing.sf, md: existing.md } : ICONS[0]);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) return setError(tr('Dê um nome ao preset'));
    const store = usePresets.getState();
    if (existing && !existing.builtIn) {
      store.update(existing.id, { name: name.trim(), description: description.trim(), ...icon, ...(update ? { rules } : {}) });
      if (update) useStudio.setState({ dirty: false, presetName: name.trim() });
      toast(update ? tr('Preset atualizado') : tr('Alterações salvas'), { tone: 'success' });
    } else {
      if (!(await ensurePresetRoom())) return;
      const p = store.save({ name, description: description.trim(), ...icon, rules });
      useStudio.setState({ presetId: p.id, presetName: p.name, dirty: false });
      toast(tr('Preset “{{name}}” salvo', { name: p.name }), { tone: 'success' });
    }
    haptics.success();
    router.back();
  };

  const title = edit ? tr('Editar preset') : update ? tr('Atualizar preset') : tr('Salvar como preset');
  return (
    <ScrollView style={{ backgroundColor: t.scheme === 'dark' ? t.surface : t.bg }} contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: space.xxxl }} keyboardShouldPersistTaps="handled">
      <SheetHeader title={title} subtitle={edit ? undefined : trn(rules.length, '{{n}} regra do Estúdio', '{{n}} regras do Estúdio')} />
      {!existing && customCount >= FREE_LIMITS.savedPresets && (
        <LimitNotice
          title={tr('Você já tem {{n}} presets salvos', { n: customCount })}
          message={tr('O plano grátis guarda até {{limit}}. Para salvar este, desbloqueie o Lote Pro ou exclua um preset antigo.', { limit: FREE_LIMITS.savedPresets })}
        />
      )}
      <Field label={tr('Nome')} value={name} onChangeText={(v) => { setName(v); setError(null); }} placeholder={tr('Ex.: Fotos do trabalho')} autoCapitalize="sentences" error={error} autoFocus={!existing} returnKeyType="next" />
      <Field label={tr('Descrição (opcional)')} value={description} onChangeText={setDescription} placeholder={tr('Ex.: 2026-05-17_Cliente_001.jpg')} autoCapitalize="sentences" returnKeyType="done" />
      <View style={{ gap: space.sm }}>
        <Text variant="footnote" tone="secondary" weight="600">
          {tr('Ícone')}
        </Text>
        <View style={styles.grid}>
          {ICONS.map((i) => {
            const sel = i.sf === icon.sf;
            return (
              <Pressable
                key={i.sf}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={i.md}
                onPress={() => {
                  haptics.selection();
                  setIcon(i);
                }}
                style={[styles.icon, { backgroundColor: sel ? t.accent : t.fill }]}
              >
                <Icon {...i} size={20} color={sel ? t.onAccent : t.label} />
              </Pressable>
            );
          })}
        </View>
      </View>
      <Button title={existing && !existing.builtIn ? tr('Salvar') : tr('Salvar preset')} onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  icon: { width: 48, height: 48, borderRadius: radius.field, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
});
