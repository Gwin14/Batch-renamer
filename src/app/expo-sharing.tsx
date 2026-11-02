import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { consumeIncomingShare } from '@/services/share';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { radius, space, useTheme } from '@/ui/theme';

/** The share extension (iOS) / share intent (Android) opens lote://expo-sharing. */
export default function IncomingShare() {
  const t = useTheme();
  useEffect(() => {
    consumeIncomingShare().then((n) => {
      if (n > 0) toast(`${n} ${n === 1 ? 'arquivo recebido' : 'arquivos recebidos'} — confira a prévia`, { tone: 'success' });
      router.dismissTo('/(tabs)/(studio)');
    });
  }, []);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay, alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{ backgroundColor: t.surface, padding: space.xl, borderRadius: radius.card, borderCurve: 'continuous', alignItems: 'center', gap: space.md, boxShadow: t.shadowLift }}>
        <ActivityIndicator color={t.accent} />
        <Text variant="subhead" tone="secondary">
          Recebendo arquivos…
        </Text>
      </View>
    </View>
  );
}
