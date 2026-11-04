import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Linking, ScrollView, View } from 'react-native';

import type { ConflictStrategy } from '@/engine/types';
import { loadSamples } from '@/features/studio/importMenu';
import { importPresetsFromFile, sharePresets } from '@/features/presets/actions';
import { LANGS, m, tr, trn, useLang, type LangPref } from '@/i18n';
import { hasCustomNative, isExpoGo, PRIVACY_URL, SUPPORT_URL, TERMS_URL } from '@/services/env';
import { haptics } from '@/services/haptics';
import { FREE_LIMITS, manageSubscription, restorePurchases, showPaywall, usePro } from '@/services/purchases';
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

const CONFLICT_LABEL: Record<ConflictStrategy, string> = { suffix: m('Adicionar (2)'), skip: m('Pular'), stop: m('Parar tudo') };

const langLabel = (pref: LangPref) => (pref === 'system' ? tr('Automático') : LANGS.find((l) => l.code === pref)!.name);

export default function SettingsScreen() {
  const { contentMax } = useLayout();
  useLang();
  const s = useSettings();
  const quickName = usePresets((st) => findPreset(st, st.quickPresetId)?.name ?? tr('Nenhum'));
  const isPro = usePro((st) => st.isPro);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl * 2, width: '100%', maxWidth: contentMax, alignSelf: 'center' }}>
      <Section
        title="Lote Pro"
        footer={isPro ? undefined : tr('Grátis: até {{files}} arquivos por lote, {{presets}} presets salvos e desfazer os {{undo}} últimos lotes.', { files: FREE_LIMITS.filesPerBatch, presets: FREE_LIMITS.savedPresets, undo: FREE_LIMITS.undoableBatches })}
      >
        {isPro ? (
          <Row title={tr('Lote Pro ativo')} subtitle={tr('Gerenciar assinatura')} icon={{ sf: 'checkmark.seal.fill', md: 'verified' }} chevron onPress={manageSubscription} />
        ) : (
          <Row title={tr('Desbloquear o Lote Pro')} subtitle={tr('Lotes ilimitados e todos os recursos')} icon={{ sf: 'sparkles', md: 'auto_awesome' }} chevron onPress={showPaywall} />
        )}
        <Row title={tr('Restaurar compras')} icon={{ sf: 'arrow.clockwise', md: 'restore' }} onPress={restorePurchases} />
      </Section>

      <Section title={tr('Aparência')}>
        <View style={{ padding: space.lg, gap: space.md }}>
          <Text variant="body">{tr('Tema')}</Text>
          <Segmented<ThemePref>
            options={[
              { value: 'system', label: tr('Sistema') },
              { value: 'light', label: tr('Claro') },
              { value: 'dark', label: tr('Escuro') },
            ]}
            value={s.theme}
            onChange={(theme) => s.set({ theme })}
          />
        </View>
        <Row
          title={tr('Idioma')}
          value={langLabel(s.language)}
          icon={{ sf: 'globe', md: 'language' }}
          chevron
          onPress={() =>
            showActions({
              title: tr('Idioma do app'),
              message: tr('No modo automático, o Lote segue o idioma do aparelho.'),
              options: (['system', ...LANGS.map((l) => l.code)] as LangPref[]).map((code) => ({
                label: `${langLabel(code)}${s.language === code ? '  ✓' : ''}`,
                onPress: () => s.set({ language: code }),
              })),
            })
          }
        />
        <SwitchRow title={tr('Vibração')} subtitle={tr('Respostas táteis ao tocar e concluir')} value={s.haptics} onValueChange={(v) => { s.set({ haptics: v }); if (v) haptics.success(); }} icon={{ sf: 'iphone.radiowaves.left.and.right', md: 'vibration' }} />
        <SwitchRow title={tr('Destacar mudanças')} subtitle={tr('Mostra em cor o trecho que muda no nome')} value={s.showDiff} onValueChange={(v) => s.set({ showDiff: v })} icon={{ sf: 'highlighter', md: 'ink_highlighter' }} />
      </Section>

      <Section title={tr('Renomeação')}>
        <Row
          title={tr('Nomes repetidos')}
          value={tr(CONFLICT_LABEL[s.conflict])}
          icon={{ sf: 'doc.on.doc', md: 'file_copy' }}
          chevron
          onPress={() =>
            showActions({
              title: tr('Quando dois arquivos ficarem com o mesmo nome'),
              options: (Object.keys(CONFLICT_LABEL) as ConflictStrategy[]).map((k) => ({ label: `${tr(CONFLICT_LABEL[k])}${s.conflict === k ? '  ✓' : ''}`, onPress: () => s.set({ conflict: k }) })),
            })
          }
        />
        <SwitchRow title={tr('Revisar antes de renomear')} subtitle={tr('Mostra o resumo e os conflitos antes de aplicar')} value={s.confirmBeforeApply} onValueChange={(v) => s.set({ confirmBeforeApply: v })} icon={{ sf: 'checklist', md: 'checklist' }} />
        <SwitchRow
          title={tr('Manter pares de arquivos')}
          subtitle={tr('Arquivos com o mesmo nome e extensões diferentes (ex.: .heic + .photo, .cr2 + .xmp) recebem o mesmo novo nome')}
          value={s.keepPairs}
          onValueChange={(v) => s.set({ keepPairs: v })}
          icon={{ sf: 'link', md: 'link' }}
        />
        <SwitchRow title={tr('Incluir subpastas')} subtitle={tr('Ao abrir uma pasta do aparelho')} value={s.includeSubfolders} onValueChange={(v) => s.set({ includeSubfolders: v })} icon={{ sf: 'folder.badge.questionmark', md: 'account_tree' }} />
      </Section>

      <Section title={tr('Atalhos')} footer={tr('O preset rápido é aplicado ao receber arquivos pelo Compartilhar, no widget, na tela bloqueada e nos atalhos do ícone.')}>
        <Row title={tr('Preset rápido')} value={quickName} icon={{ sf: 'bolt.fill', md: 'bolt' }} chevron onPress={() => router.push('/quick-preset')} />
        <Row
          title={tr('Compartilhar, widgets e tela bloqueada')}
          subtitle={hasCustomNative ? tr('Ativos neste app') : isExpoGo ? tr('Disponíveis no build nativo — veja como') : tr('Disponíveis no app instalado')}
          icon={{ sf: 'square.grid.2x2', md: 'widgets' }}
          chevron
          onPress={() => router.push('/settings/integrations')}
        />
      </Section>

      <Section title={tr('Ajuda')}>
        <Row title={tr('Guia de variáveis')} subtitle={tr('{name}, {n:3}, {taken:YYYY}… e filtros')} icon={{ sf: 'curlybraces', md: 'data_object' }} chevron onPress={() => router.push('/settings/variables')} />
        <Row title={tr('Testar com arquivos de exemplo')} icon={{ sf: 'sparkles.rectangle.stack', md: 'science' }} onPress={() => { loadSamples(); router.navigate('/(tabs)/(studio)'); }} />
        <Row title={tr('Rever a introdução')} icon={{ sf: 'play.rectangle', md: 'slideshow' }} onPress={() => s.set({ onboarded: false })} />
        <Row title={tr('Suporte')} icon={{ sf: 'questionmark.circle', md: 'help' }} chevron onPress={() => Linking.openURL(SUPPORT_URL)} />
        <Row title={tr('Política de privacidade')} icon={{ sf: 'hand.raised', md: 'privacy_tip' }} chevron onPress={() => Linking.openURL(PRIVACY_URL)} />
        <Row title={tr('Termos de uso')} icon={{ sf: 'doc.plaintext', md: 'gavel' }} chevron onPress={() => Linking.openURL(TERMS_URL)} />
      </Section>

      <Section title={tr('Dados')}>
        <Row
          title={tr('Exportar meus presets')}
          icon={{ sf: 'square.and.arrow.up', md: 'ios_share' }}
          onPress={() => {
            const custom = usePresets.getState().custom;
            if (!custom.length) return toast(tr('Você ainda não tem presets salvos'), { tone: 'info' });
            sharePresets(custom, tr('Meus presets'));
          }}
        />
        <Row title={tr('Importar presets')} subtitle={tr('De um arquivo .lote.json')} icon={{ sf: 'square.and.arrow.down', md: 'download' }} onPress={importPresetsFromFile} />
        <Row
          title={tr('Limpar histórico')}
          destructive
          icon={{ sf: 'clock.badge.xmark', md: 'history_toggle_off' }}
          onPress={() => confirmDestructive({ title: tr('Limpar todo o histórico?'), message: tr('Não será mais possível desfazer lotes anteriores.'), confirm: tr('Limpar histórico'), onConfirm: () => useHistory.getState().clear() })}
        />
        <Row
          title={tr('Restaurar ajustes padrão')}
          destructive
          icon={{ sf: 'arrow.counterclockwise', md: 'restart_alt' }}
          onPress={() => confirmDestructive({ title: tr('Restaurar ajustes padrão?'), message: tr('Presets, histórico e arquivos não são afetados.'), confirm: tr('Restaurar'), onConfirm: () => s.reset() })}
        />
      </Section>

      <Card padded style={{ alignItems: 'center', gap: 4 }}>
        <Text variant="headline">Lote</Text>
        <Text variant="footnote" tone="secondary" tabular>
          {tr('Versão {{v}}', { v: Constants.expoConfig?.version ?? '1.0.0' })} · {trn(s.batches, '{{n}} lote concluído', '{{n}} lotes concluídos')}
        </Text>
        <Text variant="footnote" tone="tertiary" align="center">
          {tr('Seus arquivos nunca saem do aparelho.')}
        </Text>
      </Card>
    </ScrollView>
  );
}
