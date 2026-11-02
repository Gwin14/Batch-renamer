import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { displayName, driver, libraryRoot, LIBRARY_DIR, listFolder, uniqueName } from '@/services/fs';
import { haptics } from '@/services/haptics';
import { useStudio } from '@/store/studio';
import { Card, Row, Separator } from '@/ui/List';
import { SheetHeader } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { space, useTheme } from '@/ui/theme';

function tree(uri: string, depth: number, exclude: Set<string>): { uri: string; name: string; depth: number }[] {
  if (depth > 5) return [];
  return listFolder(uri)
    .filter((e) => e.isDirectory && !exclude.has(e.uri))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .flatMap((e) => [{ uri: e.uri, name: e.name, depth }, ...tree(e.uri, depth + 1, exclude)]);
}

export default function MoveSheet() {
  const t = useTheme();
  const { uris: raw, from } = useLocalSearchParams<{ uris?: string; from?: string }>();
  const uris: string[] = useMemo(() => {
    try {
      return JSON.parse(raw ?? '[]');
    } catch {
      return [];
    }
  }, [raw]);
  const [busy, setBusy] = useState(false);
  const root = libraryRoot();
  const folders = useMemo(() => [{ uri: root, name: LIBRARY_DIR, depth: 0 }, ...tree(root, 1, new Set(uris))], [root, uris]);

  const moveTo = async (dest: string) => {
    if (busy || dest === from) return;
    setBusy(true);
    const studio = useStudio.getState();
    let moved = 0;
    for (const uri of uris) {
      try {
        const name = uniqueName(dest, displayName(uri));
        const newUri = await driver.moveTo(uri, dest, name);
        const f = studio.files.find((x) => x.uri === uri);
        if (f) studio.applyMoved([{ id: f.id, newUri, toName: name, destFolderUri: dest, folder: displayName(dest) }]);
        moved++;
      } catch {}
    }
    haptics.success();
    toast(`${moved} ${moved === 1 ? 'item movido' : 'itens movidos'} para “${dest === root ? LIBRARY_DIR : displayName(dest)}”`, { tone: 'success' });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.scheme === 'dark' ? t.surface : t.bg, paddingHorizontal: space.lg, gap: space.lg }}>
      <SheetHeader title="Mover para…" subtitle={`${uris.length} ${uris.length === 1 ? 'item' : 'itens'}`} />
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxxl }}>
        <Card>
          {folders.map((f, i) => (
            <View key={f.uri} style={{ paddingLeft: f.depth * space.lg }}>
              <Row
                title={f.name}
                icon={{ sf: f.depth === 0 ? 'tray.full.fill' : 'folder.fill', md: f.depth === 0 ? 'inventory_2' : 'folder' }}
                value={f.uri === from ? 'atual' : undefined}
                disabled={f.uri === from || busy}
                onPress={() => moveTo(f.uri)}
              />
              {i < folders.length - 1 && <Separator />}
            </View>
          ))}
        </Card>
        <Text variant="footnote" tone="secondary" style={{ padding: space.lg }}>
          Para criar uma pasta nova, use + na aba Arquivos.
        </Text>
      </ScrollView>
    </View>
  );
}
