import { router } from 'expo-router';

import { importInto, type ImportKind } from '@/services/actions';
import { createSampleFiles } from '@/services/fs';
import { isAndroid, isWeb } from '@/services/env';
import { haptics } from '@/services/haptics';
import { useStudio } from '@/store/studio';
import { showActions } from '@/ui/ActionSheet';
import { toast } from '@/ui/Toast';

const ERRORS: Record<string, string> = {
  CAMERA_DENIED: 'Permita o acesso à câmera nos Ajustes do sistema.',
  PHOTOS_DENIED: 'Permita o acesso às fotos nos Ajustes do sistema.',
};

export async function runImport(kind: ImportKind) {
  if (isWeb && kind !== 'folder') {
    toast('Na versão web, use os arquivos de exemplo', { tone: 'info' });
    return;
  }
  try {
    const { added, folder } = await importInto(kind);
    if (added > 0) {
      haptics.success();
      toast(folder ? `${added} arquivos de “${folder}” — renomeados no lugar` : `${added} ${added === 1 ? 'arquivo adicionado' : 'arquivos adicionados'}`, { tone: 'success' });
    }
  } catch (e) {
    haptics.error();
    const msg = e instanceof Error ? (ERRORS[e.message] ?? e.message) : 'Não foi possível importar';
    toast(msg, { tone: 'error' });
  }
}

export function loadSamples() {
  const files = createSampleFiles();
  const s = useStudio.getState();
  s.clearFiles();
  s.addFiles(files);
  haptics.success();
  toast(`${files.length} arquivos de exemplo prontos para testar`, { tone: 'success' });
}

export function openImportMenu() {
  showActions({
    title: 'Adicionar ao lote',
    options: [
      { label: 'Fotos e vídeos', icon: { sf: 'photo.on.rectangle', md: 'photo_library' }, onPress: () => runImport('photos') },
      { label: 'Do app Arquivos', icon: { sf: 'doc.on.doc', md: 'description' }, onPress: () => runImport('files') },
      {
        label: isAndroid ? 'Pasta do aparelho (no lugar)' : 'Pasta (renomear no lugar)',
        icon: { sf: 'folder.badge.gearshape', md: 'folder_open' },
        onPress: () => runImport('folder'),
      },
      { label: 'Câmera já com nome', icon: { sf: 'camera', md: 'photo_camera' }, onPress: () => runImport('camera') },
      { label: 'Da biblioteca do Lote', icon: { sf: 'tray.full', md: 'inventory_2' }, onPress: () => router.navigate('/library') },
      { label: 'Arquivos de exemplo', icon: { sf: 'sparkles.rectangle.stack', md: 'science' }, onPress: loadSamples },
    ],
  });
}
