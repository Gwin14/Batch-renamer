import { FlashList } from '@shopify/flash-list';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { PreviewItem, PreviewSummary } from '@/engine/types';
import { loadSamples, openImportMenu } from '@/features/studio/importMenu';
import { PipelineSection } from '@/features/studio/Pipeline';
import { PreviewRow } from '@/features/studio/PreviewRow';
import { useEnrichMedia } from '@/hooks/useEnrichMedia';
import { useFocusNow, usePreview } from '@/hooks/usePreview';
import { haptics } from '@/services/haptics';
import { consumeIncomingShare } from '@/services/share';
import { useSettings } from '@/store/settings';
import { useStudio, type SortKey } from '@/store/studio';
import { confirmDestructive, showActions } from '@/ui/ActionSheet';
import { EmptyState } from '@/ui/Domain';
import { Icon } from '@/ui/Icon';
import { Card } from '@/ui/List';
import { useLayout } from '@/ui/navigation';
import { Button, IconButton } from '@/ui/Pressables';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { radius, space, useTheme } from '@/ui/theme';

const SORTS: { key: SortKey; label: string; short: string; sf: string; md: string }[] = [
  { key: 'name', label: 'Nome (natural)', short: 'Nome', sf: 'textformat', md: 'sort_by_alpha' },
  { key: 'taken', label: 'Data da captura', short: 'Captura', sf: 'camera', md: 'photo_camera' },
  { key: 'modified', label: 'Data de modificação', short: 'Modificado', sf: 'calendar', md: 'calendar_today' },
  { key: 'size', label: 'Tamanho', short: 'Tamanho', sf: 'internaldrive', md: 'storage' },
  { key: 'type', label: 'Tipo', short: 'Tipo', sf: 'doc.on.doc', md: 'category' },
];

function openSortMenu() {
  const { sort, sortDesc } = useStudio.getState();
  showActions({
    title: 'Ordenar arquivos',
    message: 'A ordem define a numeração {n}.',
    options: [
      ...SORTS.map((s) => ({
        label: `${s.label}${sort === s.key ? (sortDesc ? '  ↓' : '  ↑') : ''}`,
        icon: { sf: s.sf, md: s.md },
        onPress: () => {
          useStudio.getState().setSort(s.key);
          haptics.selection();
        },
      })),
    ],
  });
}

function openMoreMenu() {
  const s = useStudio.getState();
  showActions({
    options: [
      { label: 'Salvar regras como preset', icon: { sf: 'square.and.arrow.down', md: 'save' }, onPress: () => router.push('/save-preset') },
      { label: 'Ordenar arquivos', icon: { sf: 'arrow.up.arrow.down', md: 'sort' }, onPress: openSortMenu },
      { label: 'Carregar arquivos de exemplo', icon: { sf: 'sparkles.rectangle.stack', md: 'science' }, onPress: loadSamples },
      ...(s.files.length
        ? [
            {
              label: 'Esvaziar lote',
              destructive: true,
              icon: { sf: 'xmark.bin', md: 'delete_sweep' },
              onPress: () =>
                confirmDestructive({
                  title: 'Tirar todos os arquivos do lote?',
                  message: 'Os arquivos continuam onde estão; só saem desta lista.',
                  confirm: 'Esvaziar lote',
                  onConfirm: () => {
                    const prev = useStudio.getState().files;
                    useStudio.getState().clearFiles();
                    toast('Lote esvaziado', { action: { label: 'Desfazer', onPress: () => useStudio.setState({ files: prev }) } });
                  },
                }),
            },
          ]
        : []),
    ],
  });
}

function FilesHeader({ summary }: { summary: PreviewSummary }) {
  const total = summary.items.length;
  const changing = summary.changed + summary.resolved;
  const sort = useStudio((s) => s.sort);
  const sortLabel = sort === 'manual' ? 'Manual' : SORTS.find((s) => s.key === sort)?.short;
  return (
    <View style={styles.filesHeader}>
      <View style={{ flex: 1 }}>
        <Text variant="footnote" tone="secondary" weight="600" style={styles.caps} numberOfLines={1}>
          Prévia · {total} {total === 1 ? 'arquivo' : 'arquivos'}
        </Text>
        <Text variant="footnote" tone="tertiary" tabular>
          {changing} mudam{summary.unchanged ? ` · ${summary.unchanged} iguais` : ''}
          {summary.conflicts ? ` · ${summary.conflicts} conflitos` : ''}
          {summary.errors ? ` · ${summary.errors} com erro` : ''}
        </Text>
      </View>
      <Button title={sortLabel ?? 'Ordem'} size="sm" variant="secondary" icon={{ sf: 'arrow.up.arrow.down', md: 'sort' }} onPress={openSortMenu} />
      <IconButton sf="plus" md="add" label="Adicionar arquivos" tone="accent" onPress={openImportMenu} />
    </View>
  );
}

function EmptyFiles() {
  const t = useTheme();
  return (
    <Card style={{ marginHorizontal: space.lg }}>
      <EmptyState
        icon={{ sf: 'square.and.arrow.down.on.square', md: 'library_add' }}
        title="Traga seus arquivos"
        message="Fotos, documentos ou uma pasta inteira. Você vê o resultado antes de qualquer mudança."
        action={{ title: 'Adicionar arquivos', onPress: openImportMenu, icon: { sf: 'plus', md: 'add' } }}
        secondary={
          <Text variant="subhead" tone="accent" weight="600" onPress={loadSamples} suppressHighlighting accessibilityRole="button" style={{ padding: space.sm }}>
            Testar com arquivos de exemplo
          </Text>
        }
      />
      <View style={[styles.hint, { borderTopColor: t.separator }]}>
        <Icon sf="square.and.arrow.up" md="share" size={16} color={t.secondary} />
        <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
          Dica: em qualquer app, toque em Compartilhar → Lote para mandar arquivos direto para cá.
        </Text>
      </View>
    </Card>
  );
}

function ApplyBar({ summary }: { summary: PreviewSummary }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const confirm = useSettings((s) => s.confirmBeforeApply);
  const conflict = useSettings((s) => s.conflict);
  const changing = summary.changed + summary.resolved;
  const blocked = conflict === 'stop' && (summary.conflicts > 0 || summary.errors > 0);
  const label = blocked ? 'Resolva os conflitos' : changing === 0 ? 'Nada para renomear' : `Renomear ${changing} ${changing === 1 ? 'arquivo' : 'arquivos'}`;
  if (summary.items.length === 0) return null;
  return (
    <SafeAreaView edges={['bottom']} pointerEvents="box-none" style={styles.applyWrap}>
      <Animated.View entering={reduce ? undefined : FadeInDown.duration(240)} exiting={FadeOutDown.duration(160)} style={[styles.applyBar, { backgroundColor: t.surface, boxShadow: t.shadowLift }]}>
        {summary.conflicts + summary.errors > 0 && (
          <View style={[styles.warnDot, { backgroundColor: t.warningSoft }]}>
            <Icon sf="exclamationmark.triangle.fill" md="warning" size={16} color={t.warning} />
          </View>
        )}
        <Button
          title={label}
          disabled={changing === 0 || blocked}
          icon={{ sf: 'wand.and.rays', md: 'auto_fix_high' }}
          style={{ flex: 1 }}
          haptic={false}
          onPress={() => {
            haptics.medium();
            router.push(confirm ? '/review' : { pathname: '/review', params: { auto: '1' } });
          }}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

export default function StudioScreen() {
  const t = useTheme();
  const { isWide } = useLayout();
  const now = useFocusNow();
  const summary = usePreview(now);
  const showDiff = useSettings((s) => s.showDiff);
  useEnrichMedia();

  useFocusEffect(
    useCallback(() => {
      consumeIncomingShare().then((n) => n > 0 && toast(`${n} ${n === 1 ? 'arquivo recebido' : 'arquivos recebidos'} pelo Compartilhar`, { tone: 'success' }));
    }, []),
  );

  const count = summary.items.length;
  const renderItem = useCallback(
    ({ item, index }: { item: PreviewItem; index: number }) => (
      <View
        style={{
          marginHorizontal: space.lg,
          overflow: 'hidden',
          borderCurve: 'continuous',
          borderTopLeftRadius: index === 0 ? radius.card : 0,
          borderTopRightRadius: index === 0 ? radius.card : 0,
          borderBottomLeftRadius: index === count - 1 ? radius.card : 0,
          borderBottomRightRadius: index === count - 1 ? radius.card : 0,
        }}
      >
        <PreviewRow item={item} showDiff={showDiff} />
      </View>
    ),
    [showDiff, count],
  );
  const empty = count === 0;

  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            <IconButton sf="plus" md="add" label="Adicionar arquivos" onPress={openImportMenu} />
            <IconButton sf="ellipsis.circle" md="more_vert" label="Mais opções" onPress={openMoreMenu} />
          </View>
        ),
      }}
    />
  );

  const listHeader = useMemo(
    () => (
      <View style={{ gap: space.xxl, paddingTop: space.sm, paddingBottom: space.sm }}>
        {!isWide && (
          <View style={{ paddingHorizontal: space.lg }}>
            <PipelineSection />
          </View>
        )}
        {empty ? <EmptyFiles /> : <FilesHeader summary={summary} />}
      </View>
    ),
    [isWide, empty, summary],
  );

  const list = (
    <FlashList
      data={summary.items}
      keyExtractor={(i) => i.id}
      renderItem={renderItem}
      contentInsetAdjustmentBehavior="automatic"
      ListHeaderComponent={listHeader}
      ItemSeparatorComponent={Sep}
      contentContainerStyle={{ paddingBottom: empty ? space.xxxl : 120 }}
      keyboardDismissMode="on-drag"
      style={{ backgroundColor: t.bg }}
    />
  );

  if (isWide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: t.bg }}>
        {header}
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ width: 400, flexGrow: 0 }} contentContainerStyle={{ padding: space.lg, paddingBottom: 140 }}>
          <PipelineSection />
        </ScrollView>
        <View style={{ flex: 1 }}>
          {list}
          <ApplyBar summary={summary} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {header}
      {list}
      <ApplyBar summary={summary} />
    </View>
  );
}

function Sep() {
  const t = useTheme();
  return (
    <View style={{ marginHorizontal: space.lg, backgroundColor: t.surface }}>
      <View style={{ height: StyleSheet.hairlineWidth, marginLeft: 44 + space.lg + space.md, backgroundColor: t.separator }} />
    </View>
  );
}

const styles = StyleSheet.create({
  caps: { textTransform: 'uppercase', letterSpacing: 0.4 },
  filesHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.xxxl, paddingRight: space.lg },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg, borderTopWidth: StyleSheet.hairlineWidth },
  applyWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingBottom: space.sm },
  applyBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: radius.pill, borderCurve: 'continuous', maxWidth: 560, width: '100%', alignSelf: 'center' },
  warnDot: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
