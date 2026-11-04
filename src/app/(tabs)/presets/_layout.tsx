import { Stack } from 'expo-router';

import { tabStackOptions } from '@/ui/navigation';
import { useTheme } from '@/ui/theme';
import { tr, useLang } from '@/i18n';

export default function Layout() {
  const t = useTheme();
  useLang();
  return (
    <Stack screenOptions={tabStackOptions(t)}>
      <Stack.Screen name="index" options={{ title: tr('Presets') }} />
      <Stack.Screen name="[id]" options={{ headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
