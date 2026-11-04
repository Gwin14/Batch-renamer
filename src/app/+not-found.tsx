import { router } from 'expo-router';
import { View } from 'react-native';

import { EmptyState } from '@/ui/Domain';
import { useTheme } from '@/ui/theme';
import { tr, useLang } from '@/i18n';

export default function NotFound() {
  const t = useTheme();
  useLang();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center' }}>
      <EmptyState icon={{ sf: 'questionmark.folder', md: 'folder_off' }} title={tr('Página não encontrada')} message={tr('Este link não leva a lugar nenhum no Lote.')} action={{ title: tr('Ir para o Estúdio'), onPress: () => router.replace('/(tabs)/(studio)') }} />
    </View>
  );
}
