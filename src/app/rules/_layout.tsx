import { Stack } from 'expo-router';

import { modalStackOptions } from '@/ui/navigation';
import { useTheme } from '@/ui/theme';

/** Self-contained task with steps → modal with its own stack (picker → editor → variables). */
export default function RulesLayout() {
  const t = useTheme();
  return (
    <Stack screenOptions={modalStackOptions(t)}>
      <Stack.Screen name="new" options={{ title: 'Nova regra' }} />
      <Stack.Screen name="[id]" options={{ title: 'Regra' }} />
      <Stack.Screen name="variables" options={{ title: 'Variáveis' }} />
    </Stack>
  );
}
