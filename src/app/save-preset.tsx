import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
  const { update, edit } = useLocalSearchParams<{ update?: string; edit?: string }>();
  const targetId = update || edit;
  const existing = usePresets((s) => findPreset(s, targetId));
  const rules = useStudio((s) => s.rules);
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [icon, setIcon] = useState(existing ? { sf: existing.sf, md: existing.md } : ICONS[0]);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!name.trim()) return setError('Dê um nome ao preset');
    const store = usePresets.getState();
    if (existing && !existing.builtIn) {
      store.update(existing.id, { name: name.trim(), description: description.trim(), ...icon, ...(update ? { rules } : {}) });
      if (update) useStudio.setState({ dirty: false, presetName: name.trim() });
      toast(update ? 'Preset atualizado' : 'Alterações salvas', { tone: 'success' });
    } else {
      const p = store.save({ name, description: description.trim(), ...icon, rules });
      useStudio.setState({ presetId: p.id, presetName: p.name, dirty: false });
      toast(`Preset “${p.name}” salvo`, { tone: 'success' });
    }
    haptics.success();
    router.back();
  };

  const title = edit ? 'Editar preset' : update ? 'Atualizar preset' : 'Salvar como preset';
  return (
    <ScrollView style={{ backgroundColor: t.scheme === 'dark' ? t.surface : t.bg }} contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: space.xxxl }} keyboardShouldPersistTaps="handled">
      <SheetHeader title={title} subtitle={edit ? undefined : `${rules.length} ${rules.length === 1 ? 'regra' : 'regras'} do Estúdio`} />
      <Field label="Nome" value={name} onChangeText={(v) => { setName(v); setError(null); }} placeholder="Ex.: Fotos do trabalho" autoCapitalize="sentences" error={error} autoFocus={!existing} returnKeyType="next" />
      <Field label="Descrição (opcional)" value={description} onChangeText={setDescription} placeholder="Ex.: 2026-05-17_Cliente_001.jpg" autoCapitalize="sentences" returnKeyType="done" />
      <View style={{ gap: space.sm }}>
        <Text variant="footnote" tone="secondary" weight="600">
          Ícone
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
      <Button title={existing && !existing.builtIn ? 'Salvar' : 'Salvar preset'} onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  icon: { width: 48, height: 48, borderRadius: radius.field, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
});
