import { router } from 'expo-router';

import { m, tr, trn } from '@/i18n';
import { importInto, type ImportKind } from '@/services/actions';
import { createSampleFiles } from '@/services/fs';
import { isAndroid, isWeb } from '@/services/env';
import { haptics } from '@/services/haptics';
import { useStudio } from '@/store/studio';
import { showActions } from '@/ui/ActionSheet';
import { toast } from '@/ui/Toast';

const ERRORS: Record<string, string> = {
  CAMERA_DENIED: m('Permita o acesso à câmera nos Ajustes do sistema.'),
  PHOTOS_DENIED: m('Permita o acesso às fotos nos Ajustes do sistema.'),
};

export async function runImport(kind: ImportKind) {
  if (isWeb && kind !== 'folder') {
    toast(tr('Na versão web, use os arquivos de exemplo'), { tone: 'info' });
    return;
  }
  try {
    const { added, folder } = await importInto(kind);
    if (added > 0) {
      haptics.success();
      toast(folder ? trn(added, '{{n}} arquivo de “{{folder}}” — renomeado no lugar', '{{n}} arquivos de “{{folder}}” — renomeados no lugar', { folder }) : trn(added, '{{n}} arquivo adicionado', '{{n}} arquivos adicionados'), { tone: 'success' });
    }
  } catch (e) {
    haptics.error();
    const msg = e instanceof Error ? (ERRORS[e.message] ? tr(ERRORS[e.message]) : e.message) : tr('Não foi possível importar');
    toast(msg, { tone: 'error' });
  }
}

export function loadSamples() {
  const files = createSampleFiles();
  const s = useStudio.getState();
  s.clearFiles();
  s.addFiles(files);
  haptics.success();
  toast(tr('{{n}} arquivos de exemplo prontos para testar', { n: files.length }), { tone: 'success' });
}

export function openImportMenu() {
  showActions({
    title: tr('Adicionar ao lote'),
    options: [
      { label: tr('Fotos e vídeos'), icon: { sf: 'photo.on.rectangle', md: 'photo_library' }, onPress: () => runImport('photos') },
      { label: tr('Do app Arquivos'), icon: { sf: 'doc.on.doc', md: 'description' }, onPress: () => runImport('files') },
      {
        label: isAndroid ? tr('Pasta do aparelho (no lugar)') : tr('Pasta (renomear no lugar)'),
        icon: { sf: 'folder.badge.gearshape', md: 'folder_open' },
        onPress: () => runImport('folder'),
      },
      { label: tr('Câmera já com nome'), icon: { sf: 'camera', md: 'photo_camera' }, onPress: () => runImport('camera') },
      { label: tr('Da biblioteca do Lote'), icon: { sf: 'tray.full', md: 'inventory_2' }, onPress: () => router.navigate('/library') },
      { label: tr('Arquivos de exemplo'), icon: { sf: 'sparkles.rectangle.stack', md: 'science' }, onPress: loadSamples },
    ],
  });
}
