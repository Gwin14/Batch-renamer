import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { IconButton } from './Pressables';
import { Text } from './Text';
import { space } from './theme';

/** Title + close button for form sheets (header hidden so the grabber stays clean). */
export function SheetHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose?: () => void }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title3">{title}</Text>
        {subtitle ? (
          <Text variant="footnote" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <IconButton sf="xmark" md="close" label="Fechar" tone="filled" size={14} onPress={onClose ?? (() => router.back())} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.md },
});
