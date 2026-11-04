import { router } from 'expo-router';
import { ScrollView } from 'react-native';

import { haptics } from '@/services/haptics';
import { allPresets, usePresets } from '@/store/presets';
import { Card, Row, Separator } from '@/ui/List';
import { SheetHeader } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { space, useTheme } from '@/ui/theme';
import { Fragment } from 'react';
import { tr, useLang } from '@/i18n';

/** Chooses the preset used by the share sheet, widgets, lock screen and home-screen shortcuts. */
export default function QuickPresetSheet() {
  const t = useTheme();
  useLang();
  const custom = usePresets((s) => s.custom);
  const usage = usePresets((s) => s.builtInUsage);
  const quick = usePresets((s) => s.quickPresetId);
  const list = allPresets({ custom, builtInUsage: usage });
  return (
    <ScrollView style={{ backgroundColor: t.scheme === 'dark' ? t.surface : t.bg }} contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxxl }}>
      <SheetHeader title={tr('Preset rápido')} subtitle={tr('Aplicado ao receber arquivos pelo Compartilhar, no widget e nos atalhos.')} />
      <Card>
        {list.map((p, i) => (
          <Fragment key={p.id}>
            <Row
              title={p.name}
              subtitle={p.description}
              icon={{ sf: p.sf, md: p.md }}
              selected={p.id === quick}
              onPress={() => {
                haptics.selection();
                usePresets.getState().setQuickPreset(p.id);
                router.back();
              }}
            />
            {i < list.length - 1 && <Separator />}
          </Fragment>
        ))}
      </Card>
      <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: space.lg }}>
        {tr('Você sempre revisa antes de renomear.')}
      </Text>
    </ScrollView>
  );
}
