import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { tr, useLang } from '@/i18n';
import { RULE_META } from '@/engine/catalog';
import { runPipeline } from '@/engine/pipeline';
import type { FileItem, Rule } from '@/engine/types';
import { RuleForm } from '@/features/rules/RuleForm';
import { haptics } from '@/services/haptics';
import { useStudio } from '@/store/studio';
import { confirmDestructive } from '@/ui/ActionSheet';
import { EmptyState, NameDiff } from '@/ui/Domain';
import { Icon } from '@/ui/Icon';
import { Card, Separator, SwitchRow } from '@/ui/List';
import { useLayout } from '@/ui/navigation';
import { Button } from '@/ui/Pressables';
import { Text } from '@/ui/Text';
import { space, useTheme } from '@/ui/theme';

const DEMO: FileItem[] = ['IMG_20260714_194208.JPG', 'Relatório Final (1).pdf', 'foto 2.jpg'].map((name, i) => ({
  id: `demo${i}`,
  uri: `demo://${name}`,
  name,
  size: 1_200_000,
  modifiedAt: new Date(2026, 6, 14 + i, 19, 42).getTime(),
  createdAt: new Date(2026, 6, 14 + i, 19, 42).getTime(),
  folder: 'Exemplos',
  folderUri: 'demo://Exemplos',
  source: 'library',
  width: 4032,
  height: 3024,
}));

/** Shows the effect of the pipeline up to (and including) this rule on the first files. */
function LivePreview({ rule }: { rule: Rule }) {
  useLang();
  const t = useTheme();
  const files = useStudio((s) => s.files);
  const rules = useStudio((s) => s.rules);
  const sample = files.length ? files.slice(0, 4) : DEMO;
  const items = useMemo(() => {
    const idx = rules.findIndex((r) => r.id === rule.id);
    const upto = rules.slice(0, idx + 1).map((r) => (r.id === rule.id ? { ...r, enabled: true } : r));
    return runPipeline({ files: sample, rules: upto, options: { conflict: 'suffix', protectExtension: true } }).items;
  }, [rules, rule.id, sample]);

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.previewHeader}>
        <Text variant="footnote" tone="secondary" weight="600" style={styles.caps}>
          {tr('Prévia ao vivo')}
        </Text>
        {!files.length && (
          <Text variant="footnote" tone="tertiary">
            com nomes de exemplo
          </Text>
        )}
      </View>
      <Card>
        {items.map((item, i) => (
          <View key={item.id}>
            <View style={styles.previewRow}>
              <Text variant="footnote" tone="tertiary" numberOfLines={1} ellipsizeMode="middle">
                {item.from}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon sf="arrow.turn.down.right" md="subdirectory_arrow_right" size={13} color={t.accent} />
                <View style={{ flex: 1 }}>
                  <NameDiff from={item.from} to={item.subfolder ? `${item.subfolder}/${item.to}` : item.to} />
                </View>
              </View>
            </View>
            {i < items.length - 1 && <Separator />}
          </View>
        ))}
      </Card>
    </View>
  );
}

export default function RuleEditor() {
  useLang();
  const t = useTheme();
  const { contentMax } = useLayout();
  const { id, new: isNew } = useLocalSearchParams<{ id: string; new?: string }>();
  const rule = useStudio((s) => s.rules.find((r) => r.id === id));
  const updateRule = useStudio((s) => s.updateRule);
  const bg = t.scheme === 'dark' ? t.surface : t.bg;

  if (!rule) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center' }}>
        <Stack.Screen options={{ title: tr('Regra') }} />
        <EmptyState icon={{ sf: 'questionmark.folder', md: 'help' }} title={tr('Regra não encontrada')} message={tr('Ela pode ter sido removida.')} action={{ title: tr('Fechar'), onPress: () => router.dismiss() }} />
      </View>
    );
  }

  const meta = RULE_META[rule.type];
  const done = () => {
    haptics.light();
    router.dismiss();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: meta.title,
          headerLeft: isNew
            ? () => (
                <Text
                  variant="body"
                  tone="accent"
                  suppressHighlighting
                  accessibilityRole="button"
                  style={process.env.EXPO_OS === 'ios' ? undefined : { marginRight: 24 }}
                  onPress={() => {
                    useStudio.getState().removeRule(rule.id);
                    router.dismiss();
                  }}
                >
                  {tr('Cancelar')}
                </Text>
              )
            : undefined,
          headerRight: () => (
            <Text variant="body" tone="accent" weight="600" onPress={done} suppressHighlighting accessibilityRole="button" style={process.env.EXPO_OS === 'web' ? { marginRight: 16 } : undefined}>
              {isNew ? tr('Adicionar') : 'OK'}
            </Text>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{ padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl * 2, width: '100%', maxWidth: contentMax, alignSelf: 'center' }}
      >
        <Text variant="subhead" tone="secondary" style={{ paddingHorizontal: space.xs }}>
          {meta.description}
        </Text>
        <LivePreview rule={rule} />
        <RuleForm rule={rule} update={(patch) => updateRule(rule.id, patch)} />
        {!isNew && (
          <>
            <Card>
              <SwitchRow title={tr('Regra ativa')} subtitle={tr('Pausar mantém a regra sem aplicá-la')} value={rule.enabled} onValueChange={() => useStudio.getState().toggleRule(rule.id)} />
            </Card>
            <Button
              title={tr('Remover regra')}
              variant="destructive"
              icon={{ sf: 'trash', md: 'delete' }}
              onPress={() =>
                confirmDestructive({
                  title: tr('Remover “{{name}}”?', { name: meta.title }),
                  confirm: tr('Remover regra'),
                  onConfirm: () => {
                    useStudio.getState().removeRule(rule.id);
                    router.dismiss();
                  },
                })
              }
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  caps: { textTransform: 'uppercase', letterSpacing: 0.4 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.lg },
  previewRow: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: 4 },
});
