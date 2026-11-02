import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';

import { RULE_META, summarizeRule } from '@/engine/catalog';
import type { Rule } from '@/engine/types';
import { haptics } from '@/services/haptics';
import { useStudio } from '@/store/studio';
import { showActions } from '@/ui/ActionSheet';
import { StatusBadge } from '@/ui/Domain';
import { Icon } from '@/ui/Icon';
import { IconTile } from '@/ui/List';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { radius, space, type, useTheme } from '@/ui/theme';

export function openRuleActions(rule: Rule, index: number, count: number) {
  const s = useStudio.getState();
  const meta = RULE_META[rule.type];
  showActions({
    title: meta.title,
    message: summarizeRule(rule),
    options: [
      { label: 'Editar', icon: { sf: 'slider.horizontal.3', md: 'tune' }, onPress: () => router.push(`/rules/${rule.id}`) },
      { label: rule.enabled ? 'Desativar' : 'Ativar', icon: { sf: rule.enabled ? 'pause.circle' : 'play.circle', md: rule.enabled ? 'pause_circle' : 'play_circle' }, onPress: () => s.toggleRule(rule.id) },
      { label: 'Duplicar', icon: { sf: 'plus.square.on.square', md: 'content_copy' }, onPress: () => s.duplicateRule(rule.id) },
      ...(index > 0 ? [{ label: 'Mover para cima', icon: { sf: 'arrow.up', md: 'arrow_upward' }, onPress: () => s.moveRule(index, index - 1) }] : []),
      ...(index < count - 1 ? [{ label: 'Mover para baixo', icon: { sf: 'arrow.down', md: 'arrow_downward' }, onPress: () => s.moveRule(index, index + 1) }] : []),
      {
        label: 'Remover',
        destructive: true,
        icon: { sf: 'trash', md: 'delete' },
        onPress: () => {
          const removed = s.removeRule(rule.id);
          haptics.light();
          if (removed) toast(`“${meta.title}” removida`, { action: { label: 'Desfazer', onPress: () => useStudio.getState().insertRule(removed, index) } });
        },
      },
    ],
  });
}

export const RuleCard = memo(function RuleCard({ rule, index, count }: { rule: Rule; index: number; count: number }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const meta = RULE_META[rule.type];
  const summary = summarizeRule(rule);
  const mono = rule.type === 'template' || rule.type === 'folder';
  return (
    <Animated.View entering={reduce ? undefined : FadeIn.duration(200)} exiting={FadeOut.duration(140)} layout={reduce ? undefined : LinearTransition.duration(220)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${index + 1}. ${meta.title}: ${summary}`}
        accessibilityHint="Toque para editar, toque longo para mais opções"
        onPress={() => router.push(`/rules/${rule.id}`)}
        onLongPress={() => {
          haptics.rigid();
          openRuleActions(rule, index, count);
        }}
        style={({ pressed }) => [styles.row, { backgroundColor: pressed ? t.fill : 'transparent' }]}
      >
        <View style={{ opacity: rule.enabled ? 1 : 0.4 }}>
          <IconTile sf={meta.sf} md={meta.md} size={34} />
        </View>
        <View style={{ flex: 1, gap: 2, opacity: rule.enabled ? 1 : 0.55 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
              {meta.title}
            </Text>
            {!rule.enabled && <StatusBadge tone="neutral" label="Pausada" />}
          </View>
          <Text variant="footnote" tone="secondary" numberOfLines={1} style={mono ? { fontFamily: type.mono.fontFamily, fontSize: 12.5 } : undefined}>
            {summary}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`Mais opções para ${meta.title}`}
          hitSlop={10}
          onPress={() => openRuleActions(rule, index, count)}
          style={({ pressed }) => [styles.more, { opacity: pressed ? 0.4 : 1 }]}
        >
          <Icon sf="ellipsis" md="more_horiz" size={18} color={t.secondary} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
});

export function AddRuleRow() {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.light();
        router.push('/rules/new');
      }}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? t.fill : 'transparent' }]}
    >
      <View style={[styles.addTile, { borderColor: t.accent }]}>
        <Icon sf="plus" md="add" size={18} color={t.accent} weight="bold" />
      </View>
      <Text variant="headline" tone="accent">
        Adicionar regra
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 60 },
  more: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  addTile: { width: 34, height: 34, borderRadius: radius.tile, borderCurve: 'continuous', borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
});
