import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { langTag, tr, trn, useLang } from '@/i18n';
import { formatDate } from '@/engine/date';
import { haptics } from '@/services/haptics';
import { totalRenamed, useHistory, type HistoryBatch } from '@/store/history';
import { confirmDestructive, showActions } from '@/ui/ActionSheet';
import { EmptyState, StatusBadge } from '@/ui/Domain';
import { Card, Row, Section } from '@/ui/List';
import { useLayout } from '@/ui/navigation';
import { Text } from '@/ui/Text';
import { confirmUndo } from '@/features/history/confirmUndo';
import { radius, space, useTheme } from '@/ui/theme';

function dayLabel(at: number) {
  const d = new Date(at);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return tr('Hoje');
  if (d.toDateString() === yesterday.toDateString()) return tr('Ontem');
  return formatDate(at, d.getFullYear() === today.getFullYear() ? tr('D [de] MMMM') : tr('D [de] MMMM [de] YYYY'));
}

function Stat({ value, label }: { value: string; label: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.surface, borderRadius: radius.card, borderCurve: 'continuous', padding: space.lg, gap: 2, boxShadow: t.scheme === 'light' ? t.shadow : undefined }}>
      <Text variant="title1" tabular>
        {value}
      </Text>
      <Text variant="footnote" tone="secondary">
        {label}
      </Text>
    </View>
  );
}

const fmt = (n: number) => (n >= 10000 ? tr('{{n}} mil', { n: Math.round(n / 1000) }) : n.toLocaleString(langTag()));

export default function HistoryScreen() {
  useLang();
  const { contentMax } = useLayout();
  const batches = useHistory((s) => s.batches);
  const groups = useMemo(() => {
    const map = new Map<string, HistoryBatch[]>();
    for (const b of batches) {
      const k = dayLabel(b.at);
      map.set(k, [...(map.get(k) ?? []), b]);
    }
    return [...map.entries()];
  }, [batches]);

  if (!batches.length) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.lg, flexGrow: 1, justifyContent: 'center' }}>
        <EmptyState
          icon={{ sf: 'clock.arrow.circlepath', md: 'history' }}
          title={tr('Nada renomeado ainda')}
          message={tr('Cada lote fica guardado aqui. Se algo não sair como esperado, desfaça com um toque.')}
          action={{ title: tr('Ir para o Estúdio'), onPress: () => router.navigate('/(tabs)/(studio)') }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl * 2, width: '100%', maxWidth: contentMax, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Stat value={fmt(totalRenamed(batches))} label={tr('arquivos renomeados')} />
        <Stat value={fmt(batches.filter((b) => !b.undoneAt).length)} label={tr('lotes ativos')} />
      </View>
      {groups.map(([day, list]) => (
        <Section key={day} title={day}>
          {list.map((b) => (
            <Row
              key={b.id}
              title={b.label}
              subtitle={`${trn(b.ops.length, '{{n}} arquivo', '{{n}} arquivos')} · ${formatDate(b.at, 'HH:mm')}${b.ops[0] ? ` · ${b.ops[0].fromName} → ${b.ops[0].toName}` : ''}`}
              icon={b.undoneAt ? { sf: 'arrow.uturn.backward', md: 'undo' } : { sf: 'checkmark', md: 'check' }}
              chevron
              right={b.undoneAt ? <StatusBadge tone="neutral" label={tr('Desfeito')} /> : b.failed ? <StatusBadge tone="warning" label={trn(b.failed, '{{n}} falha', '{{n}} falhas')} /> : undefined}
              onPress={() => router.push({ pathname: '/history/[id]', params: { id: b.id } })}
              onLongPress={() => {
                haptics.rigid();
                showActions({
                  title: b.label,
                  options: [
                    ...(!b.undoneAt ? [{ label: tr('Desfazer lote'), icon: { sf: 'arrow.uturn.backward', md: 'undo' }, onPress: () => confirmUndo(b) }] : []),
                    { label: tr('Apagar do histórico'), destructive: true, icon: { sf: 'trash', md: 'delete' }, onPress: () => useHistory.getState().remove(b.id) },
                  ],
                });
              }}
            />
          ))}
        </Section>
      ))}
      <Card>
        <Row
          title={tr('Limpar histórico')}
          destructive
          icon={{ sf: 'trash', md: 'delete' }}
          onPress={() =>
            confirmDestructive({
              title: tr('Limpar todo o histórico?'),
              message: tr('Os arquivos não mudam, mas não será mais possível desfazer estes lotes.'),
              confirm: tr('Limpar histórico'),
              onConfirm: () => useHistory.getState().clear(),
            })
          }
        />
      </Card>
    </ScrollView>
  );
}
