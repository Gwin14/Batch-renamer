import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { tr, useLang } from '@/i18n';
import { findPreset, allPresets, usePresets } from '@/store/presets';
import { useStudio } from '@/store/studio';
import { haptics } from '@/services/haptics';
import { confirmDestructive } from '@/ui/ActionSheet';
import { Icon } from '@/ui/Icon';
import { Card, Separator } from '@/ui/List';
import { PressableScale } from '@/ui/Pressables';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { radius, space, useTheme } from '@/ui/theme';

import { AddRuleRow, RuleCard } from './RuleCard';

/** Quick-start cards shown when the pipeline is empty. */
export function PresetStrip() {
  const t = useTheme();
  useLang();
  const custom = usePresets((s) => s.custom);
  const usage = usePresets((s) => s.builtInUsage);
  const list = allPresets({ custom, builtInUsage: usage })
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
    .slice(0, 8);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingHorizontal: space.lg }}>
      {list.map((p) => (
        <PressableScale
          key={p.id}
          accessibilityRole="button"
          accessibilityLabel={tr('Usar preset {{name}}', { name: p.name })}
          onPress={() => {
            haptics.light();
            useStudio.getState().loadPreset(p);
            toast(tr('Preset “{{name}}” aplicado', { name: p.name }), { tone: 'success' });
          }}
          style={[styles.presetCard, { backgroundColor: t.surface, boxShadow: t.scheme === 'light' ? t.shadow : undefined }]}
        >
          <View style={[styles.presetIcon, { backgroundColor: t.accentSoft }]}>
            <Icon sf={p.sf} md={p.md} size={18} color={t.accent} weight="semibold" />
          </View>
          <Text variant="subhead" weight="600" numberOfLines={1}>
            {p.name}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {p.description}
          </Text>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

export function PipelineSection() {
  const t = useTheme();
  useLang();
  const rules = useStudio((s) => s.rules);
  const presetName = useStudio((s) => s.presetName);
  const presetId = useStudio((s) => s.presetId);
  const dirty = useStudio((s) => s.dirty);
  const isCustom = usePresets((s) => !!findPreset(s, presetId) && !findPreset(s, presetId)?.builtIn);

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.header}>
        <Text variant="footnote" tone="secondary" weight="600" style={styles.caps}>
          {tr('Regras')} {rules.length ? `· ${rules.length}` : ''}
        </Text>
        {rules.length > 0 && (
          <Text
            variant="footnote"
            tone="accent"
            weight="600"
            onPress={() =>
              confirmDestructive({
                title: tr('Limpar todas as regras?'),
                confirm: tr('Limpar regras'),
                onConfirm: () => {
                  const snapshot = useStudio.getState();
                  const prev = { rules: snapshot.rules, presetId: snapshot.presetId, presetName: snapshot.presetName, dirty: snapshot.dirty };
                  snapshot.clearRules();
                  toast(tr('Regras limpas'), { action: { label: tr('Desfazer'), onPress: () => useStudio.setState(prev) } });
                },
              })
            }
            suppressHighlighting
            accessibilityRole="button"
          >
            {tr('Limpar tudo')}
          </Text>
        )}
      </View>

      {!!presetName && (
        <View style={[styles.presetPill, { backgroundColor: t.accentSoft }]}>
          <Icon sf="square.stack.3d.up.fill" md="stacks" size={14} color={t.accent} />
          <Text variant="footnote" weight="600" tone="accent" numberOfLines={1} style={{ flexShrink: 1 }}>
            {presetName}
            {dirty ? ` · ${tr('editado')}` : ''}
          </Text>
          {dirty && (
            <Text
              variant="footnote"
              weight="700"
              tone="accent"
              suppressHighlighting
              onPress={() => router.push(isCustom ? { pathname: '/save-preset', params: { update: presetId ?? '' } } : '/save-preset')}
              style={{ marginLeft: 'auto' }}
            >
              {isCustom ? tr('Atualizar') : tr('Salvar como novo')}
            </Text>
          )}
        </View>
      )}

      <Card>
        {rules.map((rule, i) => (
          <View key={rule.id}>
            <RuleCard rule={rule} index={i} count={rules.length} />
            <Separator inset={space.lg + 34 + space.md} />
          </View>
        ))}
        <AddRuleRow />
      </Card>

      {rules.length === 0 && (
        <View style={{ gap: space.sm, marginHorizontal: -space.lg, marginTop: space.sm }}>
          <Text variant="footnote" tone="secondary" weight="600" style={[styles.caps, { paddingHorizontal: space.xxxl }]}>
            {tr('Ou comece por um preset')}
          </Text>
          <PresetStrip />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.lg },
  caps: { textTransform: 'uppercase', letterSpacing: 0.4 },
  presetPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, height: 32, borderRadius: radius.pill, borderCurve: 'continuous' },
  presetCard: { width: 156, padding: space.md, gap: 6, borderRadius: radius.card, borderCurve: 'continuous' },
  presetIcon: { width: 32, height: 32, borderRadius: radius.tile, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
});
