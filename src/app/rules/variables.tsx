import { useLocalSearchParams } from 'expo-router';

import { VariablesList } from '@/features/rules/VariablesList';

export default function VariablesScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  return <VariablesList mode={mode === 'reference' ? 'reference' : 'insert'} />;
}
