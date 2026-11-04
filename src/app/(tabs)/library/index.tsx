import { FolderBrowser } from '@/features/library/FolderBrowser';
import { libraryRoot } from '@/services/fs';
import { tr } from '@/i18n';

export default function LibraryScreen() {
  return <FolderBrowser uri={libraryRoot()} title={tr('Arquivos')} isRoot />;
}
