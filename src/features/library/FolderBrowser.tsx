import { FlashList } from '@shopify/flash-list';
import { router, Stack, useFocusEffect, usePreventRemove } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatBytes, naturalCompare } from '@/engine/text';
import { runImport } from '@/features/studio/importMenu';
import { isWeb } from '@/services/env';
import {
  countItems,
  deleteEntries,
  driver,
  importDocuments,
  importMedia,
  libraryRoot,
  listFilesRecursive,
  listFolder,
  previewFile,
  shareFiles,
  toFileItem,
  type Entry,
} from '@/services/fs';
import { haptics } from '@/services/haptics';
import { useStudio } from '@/store/studio';
import { confirmDestructive, showActions } from '@/ui/ActionSheet';
import { EmptyState, FileThumb } from '@/ui/Domain';
import { Icon } from '@/ui/Icon';
import { Card, Row } from '@/ui/List';
import { Button, IconButton } from '@/ui/Pressables';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { radius, space, useTheme } from '@/ui/theme';

const sortEntries = (a: Entry, b: Entry) => Number(b.isDirectory) - Number(a.isDirectory) || naturalCompare(a.name, b.name);

function sendToStudio(entries: Entry[], folderUri: string) {
  const files = entries.flatMap((e) =>
    e.isDirectory ? listFilesRecursive(e.uri, true).map(({ entry, folderUri: f }) => toFileItem(entry, f, 'library')) : [toFileItem(e, folderUri, 'library')],
  );
  const added = useStudio.getState().addFiles(files);
  haptics.success();
  toast(added ? `${added} ${added === 1 ? 'arquivo enviado' : 'arquivos enviados'} ao Estúdio` : 'Esses arquivos já estão no Estúdio', { tone: added ? 'success' : 'info' });
  router.navigate('/(tabs)/(studio)');
}

async function share(uris: string[], name: string) {
  try {
    await shareFiles(uris, name);
  } catch {
    toast('Compartilhar não está disponível aqui', { tone: 'error' });
  }
}

function remove(entries: Entry[], after: () => void) {
  const n = entries.length;
  confirmDestructive({
    title: n === 1 ? `Excluir “${entries[0].name}”?` : `Excluir ${n} itens?`,
    message: 'Esta ação não pode ser desfeita.',
    confirm: n === 1 ? 'Excluir' : `Excluir ${n} itens`,
    onConfirm: () => {
      deleteEntries(entries.map((e) => e.uri));
      const gone = new Set(entries.map((e) => e.uri));
      const s = useStudio.getState();
      s.removeFiles(s.files.filter((f) => gone.has(f.uri) || [...gone].some((g) => f.uri.startsWith(`${g}/`))).map((f) => f.id));
      haptics.success();
      after();
    },
  });
}

export function FolderBrowser({ uri, title, isRoot }: { uri: string; title: string; isRoot?: boolean }) {
  const t = useTheme();
  const [version, setVersion] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useFocusEffect(refresh);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const entries = useMemo(() => listFolder(uri).sort(sortEntries), [uri, version]);
  const counts = useMemo(() => new Map(entries.filter((e) => e.isDirectory).map((e) => [e.uri, countItems(e.uri)])), [entries]);
  const chosen = entries.filter((e) => selected.has(e.uri));

  const exitSelection = () => {
    setSelecting(false);
    setSelected(new Set());
  };
  // Transient selection consumes the first back.
  usePreventRemove(selecting && !isRoot, exitSelection);

  const toggle = (e: Entry) => {
    haptics.selection();
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(e.uri)) n.delete(e.uri);
      else n.add(e.uri);
      return n;
    });
  };

  const importHere = async (kind: 'photos' | 'files') => {
    if (isWeb) return toast('Na web, use os arquivos de exemplo no Estúdio', { tone: 'info' });
    try {
      const items = kind === 'photos' ? await importMedia(uri) : await importDocuments(uri);
      refresh();
      if (items.length) {
        haptics.success();
        toast(`${items.length} importados para “${title}”`, {
          tone: 'success',
          action: { label: 'Renomear', onPress: () => sendToStudio(items.map((i) => ({ uri: i.uri, name: i.name, isDirectory: false, size: i.size, modifiedAt: i.modifiedAt, createdAt: i.createdAt })), uri) },
        });
      }
    } catch {
      toast('Não foi possível importar', { tone: 'error' });
    }
  };

  const openAdd = () =>
    showActions({
      title: `Adicionar em “${title}”`,
      options: [
        { label: 'Nova pasta', icon: { sf: 'folder.badge.plus', md: 'create_new_folder' }, onPress: () => router.push({ pathname: '/new-folder', params: { parent: uri } }) },
        { label: 'Importar fotos e vídeos', icon: { sf: 'photo.on.rectangle', md: 'photo_library' }, onPress: () => importHere('photos') },
        { label: 'Importar do app Arquivos', icon: { sf: 'doc.on.doc', md: 'description' }, onPress: () => importHere('files') },
      ],
    });

  const entryActions = (e: Entry) =>
    showActions({
      title: e.name,
      message: e.isDirectory ? `${counts.get(e.uri) ?? 0} itens` : `${formatBytes(e.size)}${e.modifiedAt ? ` · ${new Date(e.modifiedAt).toLocaleDateString('pt-BR')}` : ''}`,
      options: [
        { label: e.isDirectory ? 'Renomear conteúdo no Estúdio' : 'Renomear no Estúdio', icon: { sf: 'wand.and.rays', md: 'auto_fix_high' }, onPress: () => sendToStudio([e], uri) },
        ...(e.isDirectory
          ? [{ label: 'Renomear pasta', icon: { sf: 'pencil', md: 'edit' }, onPress: () => router.push({ pathname: '/new-folder', params: { parent: uri, rename: e.uri, current: e.name } }) }]
          : [
              { label: 'Visualizar', icon: { sf: 'eye', md: 'visibility' }, onPress: async () => void ((await previewFile(e.uri)) || toast('Sem visualização para este tipo', { tone: 'info' })) },
              { label: 'Compartilhar', icon: { sf: 'square.and.arrow.up', md: 'share' }, onPress: () => share([e.uri], e.name) },
            ]),
        { label: 'Mover…', icon: { sf: 'folder', md: 'drive_file_move' }, onPress: () => router.push({ pathname: '/move', params: { uris: JSON.stringify([e.uri]), from: uri } }) },
        { label: 'Excluir', destructive: true, icon: { sf: 'trash', md: 'delete' }, onPress: () => remove([e], refresh) },
      ],
    });

  const renderItem = ({ item, index }: { item: Entry; index: number }) => {
    const isSel = selected.has(item.uri);
    const first = index === 0;
    const last = index === entries.length - 1;
    return (
      <View style={{ marginHorizontal: space.lg, overflow: 'hidden', borderCurve: 'continuous', borderTopLeftRadius: first ? radius.card : 0, borderTopRightRadius: first ? radius.card : 0, borderBottomLeftRadius: last ? radius.card : 0, borderBottomRightRadius: last ? radius.card : 0 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={selecting ? { selected: isSel } : undefined}
          onPress={() => {
            if (selecting) return toggle(item);
            if (item.isDirectory) router.push({ pathname: '/library/folder', params: { uri: item.uri, name: item.name } });
            else previewFile(item.uri).then((ok) => !ok && entryActions(item));
          }}
          onLongPress={() => {
            haptics.rigid();
            if (selecting) toggle(item);
            else entryActions(item);
          }}
          style={({ pressed }) => [styles.row, { backgroundColor: pressed ? t.fill : t.surface }]}
        >
          {selecting && (
            <View style={[styles.check, { borderColor: isSel ? t.accent : t.tertiary, backgroundColor: isSel ? t.accent : 'transparent' }]}>
              {isSel && <Icon sf="checkmark" md="check" size={13} color={t.onAccent} weight="bold" />}
            </View>
          )}
          {item.isDirectory ? (
            <View style={[styles.folderIcon, { backgroundColor: t.accentSoft }]}>
              <Icon sf="folder.fill" md="folder" size={24} color={t.accent} />
            </View>
          ) : (
            <FileThumb name={item.name} uri={item.uri} />
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="body" numberOfLines={1} ellipsizeMode="middle">
              {item.name}
            </Text>
            <Text variant="footnote" tone="secondary" tabular>
              {item.isDirectory ? `${counts.get(item.uri) ?? 0} itens` : `${formatBytes(item.size)}${item.modifiedAt ? ` · ${new Date(item.modifiedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}`}
            </Text>
          </View>
          {!selecting && item.isDirectory && <Icon sf="chevron.right" md="chevron_right" size={14} color={t.tertiary} weight="semibold" />}
        </Pressable>
        {!last && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.separator, marginLeft: space.lg + 44 + space.md + (selecting ? 34 : 0) }} />}
      </View>
    );
  };

  const header = isRoot ? (
    <View style={{ gap: space.xxl, paddingBottom: space.lg }}>
      <Card>
        <Row
          title="Renomear uma pasta do aparelho"
          subtitle={process.env.EXPO_OS === 'android' ? 'Escolha qualquer pasta (DCIM, Downloads, cartão SD) e renomeie no lugar.' : 'Escolha uma pasta no app Arquivos e renomeie no lugar.'}
          icon={{ sf: 'externaldrive.badge.checkmark', md: 'folder_open' }}
          chevron
          numberOfLines={2}
          onPress={() => runImport('folder').then(() => useStudio.getState().files.length && router.navigate('/(tabs)/(studio)'))}
        />
      </Card>
      <Text variant="footnote" tone="secondary" weight="600" style={{ textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: space.lg }}>
        Biblioteca do Lote {driver.freeSpace() ? `· ${formatBytes(driver.freeSpace()!)} livres` : ''}
      </Text>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen
        options={{
          title,
          headerRight: () =>
            selecting ? (
              <Text variant="body" tone="accent" weight="600" onPress={exitSelection} suppressHighlighting accessibilityRole="button">
                OK
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', gap: space.xs }}>
                {entries.length > 0 && <IconButton sf="checkmark.circle" md="check_circle" label="Selecionar" onPress={() => setSelecting(true)} />}
                <IconButton sf="plus" md="add" label="Adicionar" onPress={openAdd} />
              </View>
            ),
        }}
      />
      <FlashList
        data={entries}
        keyExtractor={(e) => e.uri}
        renderItem={renderItem}
        extraData={[selecting, selected, counts]}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={<View style={{ paddingTop: space.sm, paddingHorizontal: isRoot ? space.lg : 0 }}>{header}</View>}
        ListEmptyComponent={
          <Card style={{ marginHorizontal: space.lg }}>
            <EmptyState
              icon={{ sf: 'folder', md: 'folder' }}
              title={isRoot ? 'Sua biblioteca está vazia' : 'Pasta vazia'}
              message={isRoot ? 'Arquivos importados e recebidos pelo Compartilhar ficam aqui, organizados em pastas.' : 'Importe arquivos ou crie uma subpasta.'}
              action={{ title: 'Adicionar', icon: { sf: 'plus', md: 'add' }, onPress: openAdd }}
            />
          </Card>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={t.secondary}
            onRefresh={() => {
              setRefreshing(true);
              refresh();
              setTimeout(() => setRefreshing(false), 300);
            }}
          />
        }
        contentContainerStyle={{ paddingBottom: selecting ? 140 : space.xxxl }}
      />
      {selecting && (
        <SafeAreaView edges={['bottom']} pointerEvents="box-none" style={styles.toolbarWrap}>
          <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(150)} style={[styles.toolbar, { backgroundColor: t.surface, boxShadow: t.shadowLift }]}>
            <Button title={chosen.length ? `Renomear ${chosen.length}` : 'Selecione itens'} size="md" disabled={!chosen.length} style={{ flex: 1 }} onPress={() => { sendToStudio(chosen, uri); exitSelection(); }} />
            <IconButton sf="square.and.arrow.up" md="share" label="Compartilhar" tone="filled" disabled={!chosen.some((c) => !c.isDirectory)} onPress={() => share(chosen.filter((c) => !c.isDirectory).map((c) => c.uri), title)} />
            <IconButton sf="folder" md="drive_file_move" label="Mover" tone="filled" disabled={!chosen.length} onPress={() => { router.push({ pathname: '/move', params: { uris: JSON.stringify(chosen.map((c) => c.uri)), from: uri } }); exitSelection(); }} />
            <IconButton sf="trash" md="delete" label="Excluir" tone="filled" color={t.danger} disabled={!chosen.length} onPress={() => remove(chosen, () => { exitSelection(); refresh(); })} />
          </Animated.View>
        </SafeAreaView>
      )}
    </View>
  );
}

export const LIBRARY_ROOT = () => libraryRoot();

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 10, minHeight: 64 },
  folderIcon: { width: 44, height: 44, borderRadius: radius.field, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  toolbarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingBottom: space.sm },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: radius.pill, borderCurve: 'continuous', maxWidth: 560, width: '100%', alignSelf: 'center' },
});
