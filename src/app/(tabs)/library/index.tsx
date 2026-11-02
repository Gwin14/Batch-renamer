import { FolderBrowser } from '@/features/library/FolderBrowser';
import { libraryRoot } from '@/services/fs';

export default function LibraryScreen() {
  return <FolderBrowser uri={libraryRoot()} title="Arquivos" isRoot />;
}
