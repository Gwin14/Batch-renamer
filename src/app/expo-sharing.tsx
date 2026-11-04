import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { consumeIncomingShare, handledRecently } from '@/services/share';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { radius, space, useTheme } from '@/ui/theme';
import { tr, trn } from '@/i18n';

/** The share extension (iOS) / share intent (Android) opens lote://expo-sharing. */
export default function IncomingShare() {
  const t = useTheme();
  useEffect(() => {
    consumeIncomingShare().then((n) => {
      if (n > 0) toast(trn(n, '{{n}} arquivo recebido — confira a prévia', '{{n}} arquivos recebidos — confira a prévia'), { tone: 'success' });
      else if (!handledRecently()) toast(tr('Nenhum arquivo chegou do Compartilhar. Tente de novo.'), { tone: 'info' });
      router.dismissTo('/(tabs)/(studio)');
    });
  }, []);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay, alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{ backgroundColor: t.surface, padding: space.xl, borderRadius: radius.card, borderCurve: 'continuous', alignItems: 'center', gap: space.md, boxShadow: t.shadowLift }}>
        <ActivityIndicator color={t.accent} />
        <Text variant="subhead" tone="secondary">
          {tr('Recebendo arquivos…')}
        </Text>
      </View>
    </View>
  );
}
