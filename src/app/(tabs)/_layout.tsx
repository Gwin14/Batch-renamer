import { NativeTabs } from 'expo-router/native-tabs';

import { useStudio } from '@/store/studio';
import { useTheme } from '@/ui/theme';
import { tr, useLang } from '@/i18n';

/** Native tab bar: Liquid Glass on iOS 26, Material 3 navigation bar on Android. Tabs never slide. */
export default function TabsLayout() {
  const t = useTheme();
  useLang();
  const pending = useStudio((s) => s.files.length);
  return (
    <NativeTabs
      tintColor={t.accent}
      iconColor={process.env.EXPO_OS === 'android' ? t.secondary : undefined}
      indicatorColor={process.env.EXPO_OS === 'android' ? t.accentSoft : undefined}
      backgroundColor={process.env.EXPO_OS === 'android' ? t.surface : undefined}
      labelStyle={process.env.EXPO_OS === 'android' ? { color: t.secondary } : undefined}
    >
      <NativeTabs.Trigger name="(studio)">
        <NativeTabs.Trigger.Icon sf={{ default: 'wand.and.rays', selected: 'wand.and.rays' }} md="auto_fix_high" />
        <NativeTabs.Trigger.Label>{tr('Estúdio')}</NativeTabs.Trigger.Label>
        {pending > 0 ? <NativeTabs.Trigger.Badge>{pending > 99 ? '99+' : String(pending)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Icon sf={{ default: 'folder', selected: 'folder.fill' }} md="folder" />
        <NativeTabs.Trigger.Label>{tr('Arquivos')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="presets">
        <NativeTabs.Trigger.Icon sf={{ default: 'square.stack.3d.up', selected: 'square.stack.3d.up.fill' }} md="stacks" />
        <NativeTabs.Trigger.Label>{tr('Presets')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Icon sf={{ default: 'clock.arrow.circlepath', selected: 'clock.arrow.circlepath' }} md="history" />
        <NativeTabs.Trigger.Label>{tr('Histórico')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
        <NativeTabs.Trigger.Label>{tr('Ajustes')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
