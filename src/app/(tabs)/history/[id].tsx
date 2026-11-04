import { FlashList } from '@shopify/flash-list';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { tr, trn, useLang } from '@/i18n';
import { formatDate } from '@/engine/date';
import { useHistory, type HistoryOp } from '@/store/history';
import { EmptyState, FileThumb, NameDiff } from '@/ui/Domain';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/Pressables';
import { Text } from '@/ui/Text';
import { radius, space, useTheme } from '@/ui/theme';

import { confirmUndo } from '@/features/history/confirmUndo';
import { LimitNotice } from '@/features/pro/LimitNotice';
import { FREE_LIMITS } from '@/services/purchases';

export default function BatchDetail() {
  const t = useTheme();
  useLang();
  const { id } = useLocalSearchParams<{ id: string }>();
  const batch = useHistory((s) => s.batches.find((b) => b.id === id));
  const undoFree = useHistory((s) => s.batches.slice(0, FREE_LIMITS.undoableBatches).some((b) => b.id === id));
  if (!batch) return <EmptyState icon={{ sf: 'questionmark.circle', md: 'help' }} title={tr('Lote não encontrado')} message={tr('Ele foi apagado do histórico.')} action={{ title: tr('Voltar'), onPress: () => router.back() }} />;

  const undone = !!batch.undoneAt;
  const n = batch.ops.length;
  const renderItem = ({ item, index }: { item: HistoryOp; index: number }) => {
    const moved = item.destFolderUri !== item.folderUri;
    const from = undone ? item.toName : item.fromName;
    const to = undone ? item.fromName : item.toName;
    return (
      <View style={{ marginHorizontal: space.lg, backgroundColor: t.surface, borderCurve: 'continuous', borderTopLeftRadius: index === 0 ? radius.card : 0, borderTopRightRadius: index === 0 ? radius.card : 0, borderBottomLeftRadius: index === n - 1 ? radius.card : 0, borderBottomRightRadius: index === n - 1 ? radius.card : 0 }}>
        <View style={styles.row}>
          <FileThumb name={item.toName} uri={item.uri} size={40} />
          <View style={{ flex: 1, gap: 3 }}>
            <NameDiff from={from} to={to} />
            <Text variant="footnote" tone="tertiary" numberOfLines={1} ellipsizeMode="middle">
              {moved && !undone ? `↳ ${tr('movido para subpasta')} · ` : ''}{tr('era {{name}}', { name: from })}
            </Text>
          </View>
        </View>
        {index < n - 1 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.separator, marginLeft: space.lg + 40 + space.md }} />}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ title: batch.label }} />
      <FlashList
        data={batch.ops}
        keyExtractor={(o) => o.id}
        renderItem={renderItem}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <View style={{ padding: space.lg, gap: space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Icon sf={undone ? 'arrow.uturn.backward.circle.fill' : 'checkmark.circle.fill'} md={undone ? 'undo' : 'check_circle'} size={18} color={undone ? t.secondary : t.success} />
              <Text variant="subhead" tone="secondary" tabular>
                {trn(n, '{{n}} arquivo', '{{n}} arquivos')} · {formatDate(batch.at, tr('DD/MM/YYYY [às] HH:mm'))}
                {undone ? ` · ${tr('desfeito {{when}}', { when: formatDate(batch.undoneAt!, tr('DD/MM [às] HH:mm')) })}` : ''}
              </Text>
            </View>
            {!undone && !undoFree && (
              <LimitNotice compact title={tr('Lote antigo')} message={tr('No plano grátis, dá para desfazer os {{n}} últimos lotes.', { n: FREE_LIMITS.undoableBatches })} />
            )}
            {!undone && <Button title={tr('Desfazer este lote')} variant="secondary" icon={{ sf: 'arrow.uturn.backward', md: 'undo' }} onPress={() => confirmUndo(batch)} />}
          </View>
        }
        contentContainerStyle={{ paddingBottom: space.xxxl * 2 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 10 },
});
