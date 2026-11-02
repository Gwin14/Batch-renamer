import { Stack } from 'expo-router';

import { tabStackOptions } from '@/ui/navigation';
import { useTheme } from '@/ui/theme';

export default function Layout() {
  const t = useTheme();
  return (
    <Stack screenOptions={tabStackOptions(t)}>
      <Stack.Screen name="index" options={{ title: 'Presets' }} />
      <Stack.Screen name="[id]" options={{ headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
