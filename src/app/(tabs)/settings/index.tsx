import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import type { ConflictStrategy } from '@/engine/types';
import { loadSamples } from '@/features/studio/importMenu';
import { importPresetsFromFile, sharePresets } from '@/features/presets/actions';
import { hasCustomNative, isExpoGo } from '@/services/env';
import { haptics } from '@/services/haptics';
import { useHistory } from '@/store/history';
import { findPreset, usePresets } from '@/store/presets';
import { useSettings, type ThemePref } from '@/store/settings';
import { confirmDestructive, showActions } from '@/ui/ActionSheet';
import { Segmented } from '@/ui/Inputs';
import { Card, Row, Section, SwitchRow } from '@/ui/List';
import { useLayout } from '@/ui/navigation';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { space } from '@/ui/theme';

const CONFLICT_LABEL: Record<ConflictStrategy, string> = { suffix: 'Adicionar (2)', skip: 'Pular', stop: 'Parar tudo' };

export default function SettingsScreen() {
  const { contentMax } = useLayout();
  const s = useSettings();
  const quickName = usePresets((st) => findPreset(st, st.quickPresetId)?.name ?? 'Nenhum');

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl * 2, width: '100%', maxWidth: contentMax, alignSelf: 'center' }}>
      <Section title="Aparência">
        <View style={{ padding: space.lg, gap: space.md }}>
          <Text variant="body">Tema</Text>
          <Segmented<ThemePref>
            options={[
              { value: 'system', label: 'Sistema' },
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Escuro' },
            ]}
            value={s.theme}
            onChange={(theme) => s.set({ theme })}
          />
        </View>
        <SwitchRow title="Vibração" subtitle="Respostas táteis ao tocar e concluir" value={s.haptics} onValueChange={(v) => { s.set({ haptics: v }); if (v) haptics.success(); }} icon={{ sf: 'iphone.radiowaves.left.and.right', md: 'vibration' }} />
        <SwitchRow title="Destacar mudanças" subtitle="Mostra em cor o trecho que muda no nome" value={s.showDiff} onValueChange={(v) => s.set({ showDiff: v })} icon={{ sf: 'highlighter', md: 'ink_highlighter' }} />
      </Section>

      <Section title="Renomeação">
        <Row
          title="Nomes repetidos"
          value={CONFLICT_LABEL[s.conflict]}
          icon={{ sf: 'doc.on.doc', md: 'file_copy' }}
          chevron
          onPress={() =>
            showActions({
              title: 'Quando dois arquivos ficarem com o mesmo nome',
              options: (Object.keys(CONFLICT_LABEL) as ConflictStrategy[]).map((k) => ({ label: `${CONFLICT_LABEL[k]}${s.conflict === k ? '  ✓' : ''}`, onPress: () => s.set({ conflict: k }) })),
            })
          }
        />
        <SwitchRow title="Revisar antes de renomear" subtitle="Mostra o resumo e os conflitos antes de aplicar" value={s.confirmBeforeApply} onValueChange={(v) => s.set({ confirmBeforeApply: v })} icon={{ sf: 'checklist', md: 'checklist' }} />
        <SwitchRow
          title="Manter pares de arquivos"
          subtitle="Arquivos com o mesmo nome e extensões diferentes (ex.: .heic + .photo, .cr2 + .xmp) recebem o mesmo novo nome"
          value={s.keepPairs}
          onValueChange={(v) => s.set({ keepPairs: v })}
          icon={{ sf: 'link', md: 'link' }}
        />
        <SwitchRow title="Incluir subpastas" subtitle="Ao abrir uma pasta do aparelho" value={s.includeSubfolders} onValueChange={(v) => s.set({ includeSubfolders: v })} icon={{ sf: 'folder.badge.questionmark', md: 'account_tree' }} />
      </Section>

      <Section title="Atalhos" footer="O preset rápido é aplicado ao receber arquivos pelo Compartilhar, no widget, na tela bloqueada e nos atalhos do ícone.">
        <Row title="Preset rápido" value={quickName} icon={{ sf: 'bolt.fill', md: 'bolt' }} chevron onPress={() => router.push('/quick-preset')} />
        <Row
          title="Compartilhar, widgets e tela bloqueada"
          subtitle={hasCustomNative ? 'Ativos neste app' : isExpoGo ? 'Disponíveis no build nativo — veja como' : 'Disponíveis no app instalado'}
          icon={{ sf: 'square.grid.2x2', md: 'widgets' }}
          chevron
          onPress={() => router.push('/settings/integrations')}
        />
      </Section>

      <Section title="Ajuda">
        <Row title="Guia de variáveis" subtitle="{name}, {n:3}, {taken:YYYY}… e filtros" icon={{ sf: 'curlybraces', md: 'data_object' }} chevron onPress={() => router.push('/settings/variables')} />
        <Row title="Testar com arquivos de exemplo" icon={{ sf: 'sparkles.rectangle.stack', md: 'science' }} onPress={() => { loadSamples(); router.navigate('/(tabs)/(studio)'); }} />
        <Row title="Rever a introdução" icon={{ sf: 'play.rectangle', md: 'slideshow' }} onPress={() => s.set({ onboarded: false })} />
      </Section>

      <Section title="Dados">
        <Row
          title="Exportar meus presets"
          icon={{ sf: 'square.and.arrow.up', md: 'ios_share' }}
          onPress={() => {
            const custom = usePresets.getState().custom;
            if (!custom.length) return toast('Você ainda não tem presets salvos', { tone: 'info' });
            sharePresets(custom, 'Meus presets');
          }}
        />
        <Row title="Importar presets" subtitle="De um arquivo .lote.json" icon={{ sf: 'square.and.arrow.down', md: 'download' }} onPress={importPresetsFromFile} />
        <Row
          title="Limpar histórico"
          destructive
          icon={{ sf: 'clock.badge.xmark', md: 'history_toggle_off' }}
          onPress={() => confirmDestructive({ title: 'Limpar todo o histórico?', message: 'Não será mais possível desfazer lotes anteriores.', confirm: 'Limpar histórico', onConfirm: () => useHistory.getState().clear() })}
        />
        <Row
          title="Restaurar ajustes padrão"
          destructive
          icon={{ sf: 'arrow.counterclockwise', md: 'restart_alt' }}
          onPress={() => confirmDestructive({ title: 'Restaurar ajustes padrão?', message: 'Presets, histórico e arquivos não são afetados.', confirm: 'Restaurar', onConfirm: () => s.reset() })}
        />
      </Section>

      <Card padded style={{ alignItems: 'center', gap: 4 }}>
        <Text variant="headline">Lote</Text>
        <Text variant="footnote" tone="secondary" tabular>
          Versão {Constants.expoConfig?.version ?? '1.0.0'} · {s.batches} {s.batches === 1 ? 'lote' : 'lotes'} concluídos
        </Text>
        <Text variant="footnote" tone="tertiary" align="center">
          Seus arquivos nunca saem do aparelho.
        </Text>
      </Card>
    </ScrollView>
  );
}
