import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import type { Preset } from '@/engine/presets';
import { presetActions } from '@/features/presets/actions';
import { haptics } from '@/services/haptics';
import { allPresets, usePresets } from '@/store/presets';
import { useStudio } from '@/store/studio';
import { EmptyState, StatusBadge } from '@/ui/Domain';
import { Icon } from '@/ui/Icon';
import { Card, Row, Section } from '@/ui/List';
import { useLayout } from '@/ui/navigation';
import { IconButton } from '@/ui/Pressables';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { space, useTheme } from '@/ui/theme';

function PresetRow({ p, quick }: { p: Preset; quick: boolean }) {
  const t = useTheme();
  return (
    <Row
      title={p.name}
      subtitle={p.description || `${p.rules.length} ${p.rules.length === 1 ? 'regra' : 'regras'}`}
      icon={{ sf: p.sf, md: p.md }}
      chevron
      onPress={() => router.push({ pathname: '/presets/[id]', params: { id: p.id } })}
      onLongPress={() => {
        haptics.rigid();
        presetActions(p);
      }}
      right={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {quick && <StatusBadge tone="accent" label="Rápido" />}
          {p.favorite && <Icon sf="star.fill" md="star" size={14} color={t.accent} />}
        </View>
      }
    />
  );
}

export default function PresetsScreen() {
  const { contentMax } = useLayout();
  const custom = usePresets((s) => s.custom);
  const usage = usePresets((s) => s.builtInUsage);
  const quickId = usePresets((s) => s.quickPresetId);
  const [query, setQuery] = useState('');

  const presets = useMemo(() => allPresets({ custom, builtInUsage: usage }), [custom, usage]);
  const q = query.trim().toLowerCase();
  const match = (p: Preset) => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
  const favorites = presets.filter((p) => p.favorite && match(p));
  const mine = custom.filter(match);
  const builtIns = presets.filter((p) => p.builtIn && match(p));
  const recent = q ? [] : presets.filter((p) => p.lastUsedAt).sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0)).slice(0, 3);

  const saveCurrent = () => {
    if (!useStudio.getState().rules.length) {
      toast('Monte as regras no Estúdio e salve aqui', { tone: 'info' });
      return router.navigate('/(tabs)/(studio)');
    }
    router.push('/save-preset');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <IconButton sf="plus" md="add" label="Salvar regras atuais como preset" onPress={saveCurrent} />,
          headerSearchBarOptions: { placeholder: 'Buscar presets', onChangeText: (e) => setQuery(e.nativeEvent.text), hideWhenScrolling: true },
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl * 2, width: '100%', maxWidth: contentMax, alignSelf: 'center' }}>
        {recent.length > 0 && (
          <Section title="Usados recentemente">
            {recent.map((p) => (
              <PresetRow key={p.id} p={p} quick={p.id === quickId} />
            ))}
          </Section>
        )}
        {favorites.length > 0 && (
          <Section title="Favoritos">
            {favorites.map((p) => (
              <PresetRow key={p.id} p={p} quick={p.id === quickId} />
            ))}
          </Section>
        )}
        {mine.length > 0 ? (
          <Section title="Seus presets" footer="Toque e segure para mais opções.">
            {mine.map((p) => (
              <PresetRow key={p.id} p={p} quick={p.id === quickId} />
            ))}
          </Section>
        ) : !q ? (
          <Card>
            <EmptyState
              icon={{ sf: 'square.stack.3d.up', md: 'stacks' }}
              title="Salve suas combinações"
              message="Montou regras que vai usar de novo? Salve como preset e aplique com um toque — também pelo Compartilhar e pelo widget."
              action={{ title: 'Salvar regras atuais', onPress: saveCurrent, icon: { sf: 'square.and.arrow.down', md: 'save' } }}
            />
          </Card>
        ) : null}
        {builtIns.length > 0 && (
          <Section title="Prontos para usar">
            {builtIns.map((p) => (
              <PresetRow key={p.id} p={p} quick={p.id === quickId} />
            ))}
          </Section>
        )}
        {!!q && !favorites.length && !mine.length && !builtIns.length && (
          <Text variant="subhead" tone="secondary" align="center" style={{ paddingVertical: space.xxxl }}>
            Nenhum preset com “{query}”.
          </Text>
        )}
      </ScrollView>
    </>
  );
}
