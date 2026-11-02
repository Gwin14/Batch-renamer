import { router, Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { RULES, type RuleMeta } from '@/engine/catalog';
import { haptics } from '@/services/haptics';
import { useStudio } from '@/store/studio';
import { Row, Section } from '@/ui/List';
import { useLayout } from '@/ui/navigation';
import { Text } from '@/ui/Text';
import { space, useTheme } from '@/ui/theme';

const GROUPS = ['Texto', 'Sequência e data', 'Limpeza', 'Organização'] as const;

export default function NewRuleScreen() {
  const t = useTheme();
  const { contentMax } = useLayout();
  const pick = (meta: RuleMeta) => {
    haptics.light();
    const rule = useStudio.getState().addRule(meta.type);
    router.replace({ pathname: '/rules/[id]', params: { id: rule.id, new: '1' } });
  };
  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Text variant="body" tone="accent" onPress={() => router.dismiss()} suppressHighlighting accessibilityRole="button" style={process.env.EXPO_OS === 'ios' ? undefined : { marginRight: 24 }}>
              Cancelar
            </Text>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: t.scheme === 'dark' ? t.surface : t.bg }}
        contentContainerStyle={{ padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl * 2, width: '100%', maxWidth: contentMax, alignSelf: 'center' }}
      >
        <Text variant="subhead" tone="secondary" style={{ paddingHorizontal: space.xs }}>
          As regras rodam em ordem, de cima para baixo. Você pode reordenar depois.
        </Text>
        {GROUPS.map((group) => (
          <Section key={group} title={group}>
            {RULES.filter((r) => r.group === group).map((meta) => (
              <Row
                key={meta.type}
                title={meta.title}
                subtitle={meta.description}
                icon={{ sf: meta.sf, md: meta.md }}
                chevron
                onPress={() => pick(meta)}
              />
            ))}
          </Section>
        ))}
        <View style={{ height: space.lg }} />
      </ScrollView>
    </>
  );
}
