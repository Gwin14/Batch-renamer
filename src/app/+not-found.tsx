import { router } from 'expo-router';
import { View } from 'react-native';

import { EmptyState } from '@/ui/Domain';
import { useTheme } from '@/ui/theme';

export default function NotFound() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center' }}>
      <EmptyState icon={{ sf: 'questionmark.folder', md: 'folder_off' }} title="Página não encontrada" message="Este link não leva a lugar nenhum no Lote." action={{ title: 'Ir para o Estúdio', onPress: () => router.replace('/(tabs)/(studio)') }} />
    </View>
  );
}
