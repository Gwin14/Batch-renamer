import { Stack } from 'expo-router';

import { tabStackOptions } from '@/ui/navigation';
import { useTheme } from '@/ui/theme';
import { tr, useLang } from '@/i18n';

export default function Layout() {
  const t = useTheme();
  useLang();
  return (
    <Stack screenOptions={tabStackOptions(t)}>
      <Stack.Screen name="index" options={{ title: tr('Ajustes') }} />
      <Stack.Screen name="integrations" options={{ title: tr('Integrações'), headerLargeTitleEnabled: false }} />
      <Stack.Screen name="variables" options={{ title: tr('Variáveis'), headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
