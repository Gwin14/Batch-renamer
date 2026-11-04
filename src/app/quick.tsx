import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { runImport } from '@/features/studio/importMenu';
import { requirePro } from '@/services/purchases';
import { applyQuickPresetIfEmpty } from '@/services/share';
import { findPreset, usePresets } from '@/store/presets';
import { useStudio } from '@/store/studio';
import { Text } from '@/ui/Text';
import { radius, space, useTheme } from '@/ui/theme';
import { tr } from '@/i18n';

/**
 * Entry point for widgets, lock-screen controls and home-screen shortcuts:
 *   lote://quick?action=photos|files|camera|folder
 *   lote://quick?action=preset&id=<presetId>
 * Runs the action, then lands on the Studio (replace: back never returns here).
 */
export default function QuickAction() {
  const t = useTheme();
  const { action = 'photos', id } = useLocalSearchParams<{ action?: string; id?: string }>();

  useEffect(() => {
    let alive = true;
    (async () => {
      // Widgets, Lock Screen controls and icon shortcuts are a Lote Pro feature.
      if (!(await requirePro(tr('Widgets e atalhos fazem parte do Lote Pro.')))) {
        if (alive) router.dismissTo('/(tabs)/(studio)');
        return;
      }
      if (action === 'preset' && id) {
        const p = findPreset(usePresets.getState(), id);
        if (p) useStudio.getState().loadPreset(p);
      } else {
        applyQuickPresetIfEmpty();
        if (action === 'photos' || action === 'files' || action === 'camera' || action === 'folder') await runImport(action);
      }
      if (alive) router.dismissTo('/(tabs)/(studio)');
    })();
    return () => {
      alive = false;
    };
  }, [action, id]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay, alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{ backgroundColor: t.surface, padding: space.xl, borderRadius: radius.card, borderCurve: 'continuous', alignItems: 'center', gap: space.md, boxShadow: t.shadowLift }}>
        <ActivityIndicator color={t.accent} />
        <Text variant="subhead" tone="secondary">
          {tr('Preparando…')}
        </Text>
      </View>
    </View>
  );
}
