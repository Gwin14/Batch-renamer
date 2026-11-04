import { Stack } from 'expo-router';

import { modalStackOptions } from '@/ui/navigation';
import { useTheme } from '@/ui/theme';
import { tr, useLang } from '@/i18n';

/** Self-contained task with steps → modal with its own stack (picker → editor → variables). */
export default function RulesLayout() {
  const t = useTheme();
  useLang();
  return (
    <Stack screenOptions={modalStackOptions(t)}>
      <Stack.Screen name="new" options={{ title: tr('Nova regra') }} />
      <Stack.Screen name="[id]" options={{ title: tr('Regra') }} />
      <Stack.Screen name="variables" options={{ title: tr('Variáveis') }} />
    </Stack>
  );
}
