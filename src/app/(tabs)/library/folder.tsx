import { useLocalSearchParams } from 'expo-router';

import { FolderBrowser } from '@/features/library/FolderBrowser';
import { displayName, libraryRoot } from '@/services/fs';

export default function FolderScreen() {
  const { uri, name } = useLocalSearchParams<{ uri?: string; name?: string }>();
  const target = uri || libraryRoot();
  return <FolderBrowser uri={target} title={name || displayName(target)} />;
}
