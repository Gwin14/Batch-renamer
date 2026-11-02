import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { FILTERS, VARIABLES } from '@/engine/template';
import { useInsertBus } from '@/hooks/useInsertBus';
import { haptics } from '@/services/haptics';
import { Row, Section } from '@/ui/List';
import { useLayout } from '@/ui/navigation';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { radius, space, type, useTheme } from '@/ui/theme';

const GROUPS = ['Nome', 'Contador', 'Data', 'Arquivo', 'Mídia', 'Únicos'] as const;

/**
 * Variables catalog. Inside the rule editor, tapping inserts at the cursor;
 * opened from Settings (?mode=reference) tapping copies.
 */
export function VariablesList({ mode }: { mode: 'insert' | 'reference' }) {
  const t = useTheme();
  const { contentMax } = useLayout();
  const pick = async (token: string) => {
    haptics.selection();
    if (mode === 'insert') {
      useInsertBus.getState().emit(token);
      router.back();
    } else {
      await Clipboard.setStringAsync(token);
      toast(`${token} copiado`, { tone: 'success' });
    }
  };
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: mode === 'insert' && t.scheme === 'dark' ? t.surface : t.bg }}
      contentContainerStyle={{ padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl * 2, width: '100%', maxWidth: contentMax, alignSelf: 'center' }}
    >
      <Text variant="subhead" tone="secondary" style={{ paddingHorizontal: space.xs }}>
        {mode === 'insert' ? 'Toque para inserir no cursor.' : 'Toque para copiar.'} Combine com filtros: {'{name|kebab}'}, {'{folder|upper|slice:0:4}'}.
      </Text>
      {GROUPS.map((g) => (
        <Section key={g} title={g}>
          {VARIABLES.filter((v) => v.group === g).map((v) => (
            <Row
              key={v.token}
              title={v.label}
              subtitle={`${v.description} · ex.: ${v.example}`}
              onPress={() => pick(v.token)}
              right={
                <View style={{ backgroundColor: t.fill, borderRadius: radius.badge, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 170 }}>
                  <Text style={[type.mono, { fontSize: 12.5, color: t.accent }]} numberOfLines={1}>
                    {v.token}
                  </Text>
                </View>
              }
            />
          ))}
        </Section>
      ))}
      <Section title="Filtros" footer="Encadeie quantos quiser com |. Ex.: {original|ascii|kebab|slice:0:30}">
        {FILTERS.map((f) => (
          <Row
            key={f.token}
            title={f.description}
            onPress={() => pick(f.token)}
            right={
              <View style={{ backgroundColor: t.fill, borderRadius: radius.badge, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={[type.mono, { fontSize: 12.5, color: t.accent }]}>{f.token}</Text>
              </View>
            }
          />
        ))}
      </Section>
    </ScrollView>
  );
}

