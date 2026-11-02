import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { driver, libraryRoot } from '@/services/fs';
import { haptics } from '@/services/haptics';
import { SheetHeader } from '@/ui/Sheet';
import { Field } from '@/ui/Inputs';
import { Button } from '@/ui/Pressables';
import { toast } from '@/ui/Toast';
import { space, useTheme } from '@/ui/theme';

const INVALID = /[\/\\:*?"<>|]/;

/** Short interruption → form sheet. Creates or renames a folder in the library. */
export default function NewFolderSheet() {
  const t = useTheme();
  const { parent, rename, current } = useLocalSearchParams<{ parent?: string; rename?: string; current?: string }>();
  const [name, setName] = useState(current ?? '');
  const [error, setError] = useState<string | null>(null);
  const parentUri = parent || libraryRoot();

  const submit = async () => {
    const clean = name.trim();
    if (!clean) return setError('Dê um nome para a pasta');
    if (INVALID.test(clean)) return setError('Não use / \\ : * ? " < > |');
    const exists = driver.list(parentUri).some((e) => e.name.toLowerCase() === clean.toLowerCase() && e.uri !== rename);
    if (exists) return setError('Já existe uma pasta com esse nome');
    try {
      if (rename) await driver.rename(rename, clean);
      else driver.mkdir(parentUri, clean);
      haptics.success();
      toast(rename ? 'Pasta renomeada' : `Pasta “${clean}” criada`, { tone: 'success' });
      router.back();
    } catch {
      haptics.error();
      setError('Não foi possível salvar. Tente outro nome.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.scheme === 'dark' ? t.surface : t.bg, padding: space.lg, gap: space.xl }}>
      <SheetHeader title={rename ? 'Renomear pasta' : 'Nova pasta'} />
      <Field
        label="Nome"
        value={name}
        onChangeText={(v) => {
          setName(v);
          if (error) setError(null);
        }}
        autoFocus
        autoCapitalize="sentences"
        placeholder="Ex.: Viagem Lisboa"
        error={error}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Button title={rename ? 'Salvar' : 'Criar pasta'} onPress={submit} />
    </View>
  );
}
