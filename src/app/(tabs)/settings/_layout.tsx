import { Stack } from 'expo-router';

import { tabStackOptions } from '@/ui/navigation';
import { useTheme } from '@/ui/theme';

export default function Layout() {
  const t = useTheme();
  return (
    <Stack screenOptions={tabStackOptions(t)}>
      <Stack.Screen name="index" options={{ title: 'Ajustes' }} />
      <Stack.Screen name="integrations" options={{ title: 'Integrações', headerLargeTitleEnabled: false }} />
      <Stack.Screen name="variables" options={{ title: 'Variáveis', headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
