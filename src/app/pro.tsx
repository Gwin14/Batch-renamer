import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { showPaywall } from '@/services/purchases';
import { useTheme } from '@/ui/theme';

/** lote://pro — opened by locked widgets: shows the Lote Pro paywall, then lands on the Studio. */
export default function ProLink() {
  const t = useTheme();
  useEffect(() => {
    showPaywall().finally(() => router.dismissTo('/(tabs)/(studio)'));
  }, []);
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay }]} />;
}
