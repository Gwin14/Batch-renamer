import { View } from 'react-native';

import { tr, useLang } from '@/i18n';
import { showPaywall, usePro } from '@/services/purchases';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/Pressables';
import { Text } from '@/ui/Text';
import { radius, space, useTheme } from '@/ui/theme';

/**
 * Heads-up shown *before* a free-plan limit blocks an action, so the paywall never comes as a surprise.
 * Renders nothing for Lote Pro users.
 */
export function LimitNotice({ title, message, compact = false }: { title: string; message: string; compact?: boolean }) {
  const t = useTheme();
  useLang();
  const isPro = usePro((s) => s.isPro);
  if (isPro) return null;
  return (
    <View
      accessibilityRole="summary"
      style={{ flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.card, borderCurve: 'continuous', backgroundColor: t.accentSoft, alignItems: compact ? 'center' : 'flex-start' }}
    >
      <Icon sf="sparkles" md="auto_awesome" size={20} color={t.accent} />
      <View style={{ flex: 1, gap: space.sm }}>
        <View style={{ gap: 2 }}>
          <Text variant="subhead" weight="600">
            {title}
          </Text>
          <Text variant="footnote" tone="secondary">
            {message}
          </Text>
        </View>
        <Button title={tr('Conhecer o Lote Pro')} size="sm" variant="tinted" onPress={showPaywall} style={{ alignSelf: 'flex-start' }} />
      </View>
    </View>
  );
}
