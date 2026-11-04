import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { tr, trn, useLang } from '@/i18n';
import { RULE_META, summarizeRule } from '@/engine/catalog';
import { runPipeline } from '@/engine/pipeline';
import { SAMPLE_FILES } from '@/services/fs/samples';
import type { FileItem } from '@/engine/types';
import { applyPresetToStudio, presetActions } from '@/features/presets/actions';
import { haptics } from '@/services/haptics';
import { findPreset, usePresets } from '@/store/presets';
import { EmptyState, NameDiff } from '@/ui/Domain';
import { Icon } from '@/ui/Icon';
import { Card, Row, Section, Separator } from '@/ui/List';
import { useLayout } from '@/ui/navigation';
import { Button, IconButton } from '@/ui/Pressables';
import { Text } from '@/ui/Text';
import { radius, space, useTheme } from '@/ui/theme';

const SAMPLES: FileItem[] = SAMPLE_FILES.slice(0, 5).map((s, i) => ({
  id: `s${i}`,
  uri: `demo://${s.name}`,
  name: s.name,
  size: s.size,
  createdAt: s.takenAt,
  modifiedAt: s.takenAt + 3_600_000,
  takenAt: s.kind === 'photo' ? s.takenAt : null,
  width: s.width ?? null,
  height: s.height ?? null,
  folder: 'Exemplos',
  folderUri: 'demo://Exemplos',
  source: 'library',
}));

export default function PresetDetail() {
  const lang = useLang();
  const t = useTheme();
  const { contentMax } = useLayout();
  const { id } = useLocalSearchParams<{ id: string }>();
  // Select stable slices: findPreset builds a new object for built-ins on every call,
  // which as a selector re-renders forever (and loops Stack.Screen setOptions).
  const custom = usePresets((s) => s.custom);
  const builtInUsage = usePresets((s) => s.builtInUsage);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- lang: built-in names are translated on read
  const preset = useMemo(() => findPreset({ custom, builtInUsage }, id), [custom, builtInUsage, id, lang]);
  const quick = usePresets((s) => s.quickPresetId === id);
  const toggleFavorite = usePresets((s) => s.toggleFavorite);

  const preview = useMemo(
    () => (preset ? runPipeline({ files: SAMPLES, rules: preset.rules, options: { conflict: 'suffix', protectExtension: true } }).items : []),
    [preset],
  );

  if (!preset) {
    return <EmptyState icon={{ sf: 'questionmark.square.dashed', md: 'help' }} title={tr('Preset não encontrado')} message={tr('Ele pode ter sido excluído.')} action={{ title: tr('Voltar'), onPress: () => router.back() }} />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: space.xs }}>
              <IconButton sf={preset.favorite ? 'star.fill' : 'star'} md="star" label={preset.favorite ? tr('Remover dos favoritos') : tr('Favoritar')} onPress={() => { haptics.selection(); toggleFavorite(preset.id); }} />
              <IconButton sf="ellipsis.circle" md="more_vert" label={tr('Mais opções')} onPress={() => presetActions(preset)} />
            </View>
          ),
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl * 2, width: '100%', maxWidth: contentMax, alignSelf: 'center' }}>
        <View style={{ gap: space.md }}>
          <View style={[styles.hero, { backgroundColor: t.accentSoft }]}>
            <Icon sf={preset.sf} md={preset.md} size={30} color={t.accent} weight="semibold" />
          </View>
          <Text variant="title1">{preset.name}</Text>
          {preset.description ? (
            <Text variant="body" tone="secondary">
              {preset.description}
            </Text>
          ) : null}
          <Text variant="footnote" tone="tertiary" tabular>
            {preset.builtIn ? tr('Preset do Lote') : tr('Seu preset')} · {trn(preset.uses, 'usado {{n}} vez', 'usado {{n}} vezes')}
            {quick ? ` · ${tr('preset rápido')}` : ''}
          </Text>
        </View>

        <View style={{ gap: space.md }}>
          <Button title={tr('Usar no Estúdio')} icon={{ sf: 'wand.and.rays', md: 'auto_fix_high' }} onPress={() => applyPresetToStudio(preset)} />
          <Button title={tr('Adicionar às regras atuais')} variant="secondary" onPress={() => applyPresetToStudio(preset, 'append')} />
        </View>

        <Section title={`Regras · ${preset.rules.length}`}>
          {preset.rules.map((r, i) => (
            <Row key={r.id} title={`${i + 1}. ${RULE_META[r.type].title}`} subtitle={summarizeRule(r)} icon={{ sf: RULE_META[r.type].sf, md: RULE_META[r.type].md }} numberOfLines={1} />
          ))}
        </Section>

        <View style={{ gap: space.sm }}>
          <Text variant="footnote" tone="secondary" weight="600" style={{ textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: space.lg }}>
            {tr('Exemplo')}
          </Text>
          <Card>
            {preview.map((item, i) => (
              <View key={item.id}>
                <View style={{ paddingHorizontal: space.lg, paddingVertical: space.md, gap: 4 }}>
                  <Text variant="footnote" tone="tertiary" numberOfLines={1} ellipsizeMode="middle">
                    {item.from}
                  </Text>
                  <NameDiff from={item.from} to={item.subfolder ? `${item.subfolder}/${item.to}` : item.to} />
                </View>
                {i < preview.length - 1 && <Separator />}
              </View>
            ))}
          </Card>
        </View>

        {!preset.builtIn && (
          <Button title={tr('Editar nome e ícone')} variant="tinted" icon={{ sf: 'pencil', md: 'edit' }} onPress={() => router.push({ pathname: '/save-preset', params: { edit: preset.id } })} />
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { width: 64, height: 64, borderRadius: radius.card, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
});
