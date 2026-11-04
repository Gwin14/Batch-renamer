import { FlashList } from '@shopify/flash-list';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { PreviewItem, PreviewSummary } from '@/engine/types';
import { loadSamples, openImportMenu } from '@/features/studio/importMenu';
import { PipelineSection } from '@/features/studio/Pipeline';
import { LimitNotice } from '@/features/pro/LimitNotice';
import { PreviewRow } from '@/features/studio/PreviewRow';
import { useEnrichMedia } from '@/hooks/useEnrichMedia';
import { useFocusNow, usePreview } from '@/hooks/usePreview';
import { m, tr, trn, useLang } from '@/i18n';
import { haptics } from '@/services/haptics';
import { FREE_LIMITS, usePro } from '@/services/purchases';
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

/** Labels are pt-BR source strings (translated when shown). */
const SORTS: { key: SortKey; label: string; short: string; sf: string; md: string }[] = [
  { key: 'name', label: m('Nome (natural)'), short: m('Nome'), sf: 'textformat', md: 'sort_by_alpha' },
  { key: 'taken', label: m('Data da captura'), short: m('Captura'), sf: 'camera', md: 'photo_camera' },
  { key: 'modified', label: m('Data de modificação'), short: m('Modificado'), sf: 'calendar', md: 'calendar_today' },
  { key: 'size', label: m('Tamanho'), short: m('Tamanho'), sf: 'internaldrive', md: 'storage' },
  { key: 'type', label: m('Tipo'), short: m('Tipo'), sf: 'doc.on.doc', md: 'category' },
];

function openSortMenu() {
  const { sort, sortDesc } = useStudio.getState();
  showActions({
    title: tr('Ordenar arquivos'),
    message: tr('A ordem define a numeração {n}.'),
    options: [
      ...SORTS.map((s) => ({
        label: `${tr(s.label)}${sort === s.key ? (sortDesc ? '  ↓' : '  ↑') : ''}`,
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
      { label: tr('Salvar regras como preset'), icon: { sf: 'square.and.arrow.down', md: 'save' }, onPress: () => router.push('/save-preset') },
      { label: tr('Ordenar arquivos'), icon: { sf: 'arrow.up.arrow.down', md: 'sort' }, onPress: openSortMenu },
      { label: tr('Carregar arquivos de exemplo'), icon: { sf: 'sparkles.rectangle.stack', md: 'science' }, onPress: loadSamples },
      ...(s.files.length
        ? [
            {
              label: tr('Esvaziar lote'),
              destructive: true,
              icon: { sf: 'xmark.bin', md: 'delete_sweep' },
              onPress: () =>
                confirmDestructive({
                  title: tr('Tirar todos os arquivos do lote?'),
                  message: tr('Os arquivos continuam onde estão; só saem desta lista.'),
                  confirm: tr('Esvaziar lote'),
                  onConfirm: () => {
                    const prev = useStudio.getState().files;
                    useStudio.getState().clearFiles();
                    toast(tr('Lote esvaziado'), { action: { label: tr('Desfazer'), onPress: () => useStudio.setState({ files: prev }) } });
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
  useLang();
  const short = SORTS.find((s) => s.key === sort)?.short;
  const sortLabel = sort === 'manual' ? tr('Manual') : short && tr(short);
  return (
    <View style={styles.filesHeader}>
      <View style={{ flex: 1 }}>
        <Text variant="footnote" tone="secondary" weight="600" style={styles.caps} numberOfLines={1}>
          {trn(total, 'Prévia · {{n}} arquivo', 'Prévia · {{n}} arquivos')}
        </Text>
        <Text variant="footnote" tone="tertiary" tabular>
          {tr('{{n}} mudam', { n: changing })}
          {summary.unchanged ? ` · ${tr('{{n}} iguais', { n: summary.unchanged })}` : ''}
          {summary.conflicts ? ` · ${tr('{{n}} conflitos', { n: summary.conflicts })}` : ''}
          {summary.errors ? ` · ${tr('{{n}} com erro', { n: summary.errors })}` : ''}
        </Text>
      </View>
      <Button title={sortLabel || tr('Ordem')} size="sm" variant="secondary" icon={{ sf: 'arrow.up.arrow.down', md: 'sort' }} onPress={openSortMenu} />
      <IconButton sf="plus" md="add" label={tr('Adicionar arquivos')} tone="accent" onPress={openImportMenu} />
    </View>
  );
}

/** Warns before Apply when the batch is bigger than the free plan allows. */
function BatchLimitNotice({ changing }: { changing: number }) {
  if (changing <= FREE_LIMITS.filesPerBatch) return null;
  return (
    <View style={{ paddingHorizontal: space.lg }}>
      <LimitNotice
        title={tr('Este lote tem {{n}} arquivos', { n: changing })}
        message={tr('O plano grátis renomeia até {{limit}} por vez. Com o Lote Pro você renomeia todos de uma vez, sem limite.', { limit: FREE_LIMITS.filesPerBatch })}
      />
    </View>
  );
}

function EmptyFiles() {
  const t = useTheme();
  useLang();
  return (
    <Card style={{ marginHorizontal: space.lg }}>
      <EmptyState
        icon={{ sf: 'square.and.arrow.down.on.square', md: 'library_add' }}
        title={tr('Traga seus arquivos')}
        message={tr('Fotos, documentos ou uma pasta inteira. Você vê o resultado antes de qualquer mudança.')}
        action={{ title: tr('Adicionar arquivos'), onPress: openImportMenu, icon: { sf: 'plus', md: 'add' } }}
        secondary={
          <Text variant="subhead" tone="accent" weight="600" onPress={loadSamples} suppressHighlighting accessibilityRole="button" style={{ padding: space.sm }}>
            {tr('Testar com arquivos de exemplo')}
          </Text>
        }
      />
      <View style={[styles.hint, { borderTopColor: t.separator }]}>
        <Icon sf="square.and.arrow.up" md="share" size={16} color={t.secondary} />
        <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
          {tr('Dica: em qualquer app, toque em Compartilhar → Lote para mandar arquivos direto para cá.')}
        </Text>
      </View>
    </Card>
  );
}

function ApplyBar({ summary }: { summary: PreviewSummary }) {
  const t = useTheme();
  useLang();
  const reduce = useReducedMotion();
  const confirm = useSettings((s) => s.confirmBeforeApply);
  const conflict = useSettings((s) => s.conflict);
  const changing = summary.changed + summary.resolved;
  const blocked = conflict === 'stop' && (summary.conflicts > 0 || summary.errors > 0);
  const label = blocked ? tr('Resolva os conflitos') : changing === 0 ? tr('Nada para renomear') : trn(changing, 'Renomear {{n}} arquivo', 'Renomear {{n}} arquivos');
  const locked = usePro((st) => !st.isPro) && changing > FREE_LIMITS.filesPerBatch;
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
          icon={locked ? { sf: 'lock.fill', md: 'lock' } : { sf: 'wand.and.rays', md: 'auto_fix_high' }}
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
  useLang();
  const { isWide } = useLayout();
  const now = useFocusNow();
  const summary = usePreview(now);
  const showDiff = useSettings((s) => s.showDiff);
  useEnrichMedia();

  useFocusEffect(
    useCallback(() => {
      consumeIncomingShare().then((n) => n > 0 && toast(trn(n, '{{n}} arquivo recebido pelo Compartilhar', '{{n}} arquivos recebidos pelo Compartilhar'), { tone: 'success' }));
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
            <IconButton sf="plus" md="add" label={tr('Adicionar arquivos')} onPress={openImportMenu} />
            <IconButton sf="ellipsis.circle" md="more_vert" label={tr('Mais opções')} onPress={openMoreMenu} />
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
        <BatchLimitNotice changing={summary.changed + summary.resolved} />
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
