import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { PreviewItem } from '@/engine/types';
import { haptics } from '@/services/haptics';
import { previewFile } from '@/services/fs';
import { useStudio } from '@/store/studio';
import { showActions } from '@/ui/ActionSheet';
import { FileThumb, NameDiff, StatusBadge } from '@/ui/Domain';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { space, useTheme } from '@/ui/theme';

function openFileActions(item: PreviewItem) {
  showActions({
    title: item.from,
    message: item.from !== item.to ? `Vai virar “${item.subfolder ? `${item.subfolder}/` : ''}${item.to}”` : 'Sem alterações com as regras atuais',
    options: [
      {
        label: 'Visualizar',
        icon: { sf: 'eye', md: 'visibility' },
        onPress: async () => {
          if (!(await previewFile(item.file.uri))) toast('Não há visualização para este tipo de arquivo', { tone: 'info' });
        },
      },
      {
        label: 'Tirar do lote',
        icon: { sf: 'minus.circle', md: 'remove_circle' },
        destructive: true,
        onPress: () => {
          const s = useStudio.getState();
          const index = s.files.findIndex((f) => f.id === item.id);
          s.removeFiles([item.id]);
          toast('Arquivo removido do lote', {
            action: {
              label: 'Desfazer',
              onPress: () => {
                const st = useStudio.getState();
                const files = [...st.files];
                files.splice(index, 0, item.file);
                useStudio.setState({ files });
              },
            },
          });
        },
      },
    ],
  });
}

const STATUS = {
  conflict: { tone: 'warning', label: 'Conflito' },
  error: { tone: 'danger', label: 'Erro' },
  resolved: { tone: 'accent', label: '+ sufixo' },
} as const;

export const PreviewRow = memo(function PreviewRow({ item, showDiff }: { item: PreviewItem; showDiff: boolean }) {
  const t = useTheme();
  const changed = item.status !== 'unchanged';
  const badge = item.status in STATUS ? STATUS[item.status as keyof typeof STATUS] : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={changed ? `${item.from}, vai virar ${item.to}` : `${item.from}, sem alterações`}
      onPress={() => openFileActions(item)}
      onLongPress={() => {
        haptics.rigid();
        openFileActions(item);
      }}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? t.fill : t.surface }]}
    >
      <FileThumb name={item.file.name} uri={item.file.uri} />
      <View style={{ flex: 1, gap: 3 }}>
        {item.subfolder ? (
          <View style={styles.folderLine}>
            <Icon sf="folder.fill" md="folder" size={12} color={t.accent} />
            <Text variant="caption" tone="accent" weight="600" numberOfLines={1}>
              {item.subfolder}
            </Text>
          </View>
        ) : null}
        <NameDiff from={item.from} to={item.to} showDiff={showDiff} dim={!changed} />
        {changed ? (
          <Text variant="footnote" tone="tertiary" numberOfLines={1} ellipsizeMode="middle">
            {item.message && item.status !== 'resolved' ? item.message : item.from}
          </Text>
        ) : (
          <Text variant="footnote" tone="tertiary">
            Sem alterações
          </Text>
        )}
      </View>
      {badge && <StatusBadge tone={badge.tone} label={badge.label} />}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 10, minHeight: 64 },
  folderLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
