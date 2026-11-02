import { Image } from 'expo-image';
import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { diffNames } from '@/engine/pipeline';
import { kindOf, splitName } from '@/engine/text';
import type { FileKind } from '@/engine/types';
import { isWeb } from '@/services/env';

import { Icon } from './Icon';
import { Button } from './Pressables';
import { Text } from './Text';
import { radius, space, useTheme } from './theme';

export const KIND_ICON: Record<FileKind, { sf: string; md: string; label: string }> = {
  image: { sf: 'photo', md: 'image', label: 'Imagem' },
  video: { sf: 'film', md: 'movie', label: 'Vídeo' },
  audio: { sf: 'waveform', md: 'graphic_eq', label: 'Áudio' },
  document: { sf: 'doc.text', md: 'description', label: 'Documento' },
  archive: { sf: 'archivebox', md: 'folder_zip', label: 'Compactado' },
  code: { sf: 'chevron.left.forwardslash.chevron.right', md: 'code', label: 'Código' },
  other: { sf: 'doc', md: 'draft', label: 'Arquivo' },
};

export const FileThumb = memo(function FileThumb({ name, uri, size = 44 }: { name: string; uri: string; size?: number }) {
  const t = useTheme();
  const kind = kindOf(name);
  const ext = splitName(name).ext.toUpperCase().slice(0, 4);
  const canShow = kind === 'image' && !isWeb && !/\.(heic|heif|raw|dng|cr2|nef|arw)$/i.test(name);
  return (
    <View style={[styles.thumb, { width: size, height: size, backgroundColor: t.fill }]}>
      {canShow ? (
        <Image source={{ uri }} recyclingKey={uri} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
      ) : (
        <View style={{ alignItems: 'center', gap: 1 }}>
          <Icon {...KIND_ICON[kind]} size={size * 0.42} color={t.secondary} />
          {size >= 40 && ext ? (
            <Text variant="caption" tone="secondary" weight="700" style={{ fontSize: 8.5, lineHeight: 10, letterSpacing: 0.3 }}>
              {ext}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
});

/** Old → new with the changed span highlighted in the accent. */
export const NameDiff = memo(function NameDiff({ from, to, showDiff = true, dim = false }: { from: string; to: string; showDiff?: boolean; dim?: boolean }) {
  const t = useTheme();
  if (from === to) {
    return (
      <Text variant="body" tone={dim ? 'secondary' : 'label'} numberOfLines={1} ellipsizeMode="middle">
        {to}
      </Text>
    );
  }
  if (!showDiff) {
    return (
      <Text variant="body" weight="500" numberOfLines={1} ellipsizeMode="middle">
        {to}
      </Text>
    );
  }
  const d = diffNames(from, to);
  return (
    <Text variant="body" numberOfLines={2} ellipsizeMode="middle">
      <Text variant="body">{d.prefix}</Text>
      <Text variant="body" weight="600" style={{ color: t.accent }}>
        {d.added}
      </Text>
      <Text variant="body">{d.suffix}</Text>
    </Text>
  );
});

export function EmptyState({ icon, title, message, action, secondary }: { icon: { sf: string; md: string }; title: string; message: string; action?: { title: string; onPress: () => void; icon?: { sf: string; md: string } }; secondary?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: t.accentSoft }]}>
        <Icon {...icon} size={30} color={t.accent} weight="semibold" />
      </View>
      <View style={{ gap: 6, alignItems: 'center' }}>
        <Text variant="title3" align="center">
          {title}
        </Text>
        <Text variant="subhead" tone="secondary" align="center" style={{ maxWidth: 320 }}>
          {message}
        </Text>
      </View>
      {action && <Button title={action.title} icon={action.icon} onPress={action.onPress} size="md" />}
      {secondary}
    </View>
  );
}

export function StatusBadge({ tone, label }: { tone: 'accent' | 'warning' | 'danger' | 'success' | 'neutral'; label: string }) {
  const t = useTheme();
  const map = {
    accent: [t.accentSoft, t.accent],
    warning: [t.warningSoft, t.warning],
    danger: [t.dangerSoft, t.danger],
    success: [t.successSoft, t.success],
    neutral: [t.fill, t.secondary],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text variant="caption" weight="700" style={{ color: fg }} tabular>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { borderRadius: radius.field, borderCurve: 'continuous', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: space.lg, paddingVertical: space.xxxl, paddingHorizontal: space.xxl },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.badge, borderCurve: 'continuous' },
});
