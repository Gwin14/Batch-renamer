import { ScrollView, View } from 'react-native';

import { hasCustomNative, isAndroid, isExpoGo, isIOS, isWeb } from '@/services/env';
import { StatusBadge } from '@/ui/Domain';
import { Card, IconTile, Section } from '@/ui/List';
import { useLayout } from '@/ui/navigation';
import { Text } from '@/ui/Text';
import { space, type, useTheme } from '@/ui/theme';

interface Integration {
  title: string;
  sf: string;
  md: string;
  how: string;
  platforms: ('ios' | 'android')[];
}

const ITEMS: Integration[] = [
  { title: 'Compartilhar → Lote', sf: 'square.and.arrow.up', md: 'share', platforms: ['ios', 'android'], how: 'Em Fotos, Arquivos, WhatsApp ou qualquer app: selecione arquivos, toque em Compartilhar e escolha Lote. Eles chegam no Estúdio com o preset rápido.' },
  { title: 'Widget na tela inicial', sf: 'square.grid.2x2', md: 'widgets', platforms: ['ios', 'android'], how: 'Toque e segure a tela inicial → Editar → Adicionar widget → Lote. Mostra o total renomeado e atalhos para renomear fotos ou arquivos.' },
  { title: 'Tela bloqueada', sf: 'lock.rectangle.on.rectangle', md: 'lock', platforms: ['ios', 'android'], how: isAndroid ? 'Em aparelhos com widgets na tela de bloqueio, adicione o widget Lote por lá.' : 'Personalize a Tela Bloqueada → Adicionar widgets → Lote. No iOS 18+, adicione também o controle “Renomear fotos” na Central de Controle ou nos botões da tela bloqueada.' },
  { title: 'Atalhos do ícone', sf: 'apps.iphone', md: 'touch_app', platforms: ['ios', 'android'], how: 'Toque e segure o ícone do Lote: Renomear fotos, Renomear arquivos, Foto já nomeada e Histórico.' },
  { title: 'Pasta no app Arquivos', sf: 'folder', md: 'folder_shared', platforms: ['ios'], how: 'A biblioteca do Lote aparece em Arquivos → No Meu iPhone → Lote, para abrir e organizar de qualquer app.' },
];

export default function IntegrationsScreen() {
  const t = useTheme();
  const { contentMax } = useLayout();
  const platform = isIOS ? 'ios' : 'android';
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl * 2, width: '100%', maxWidth: contentMax, alignSelf: 'center' }}>
      <Card padded style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <StatusBadge tone={hasCustomNative ? 'success' : 'warning'} label={hasCustomNative ? 'Build nativo' : isExpoGo ? 'Expo Go' : 'Web'} />
          <Text variant="headline">{hasCustomNative ? 'Tudo ativo' : 'Modo de teste'}</Text>
        </View>
        <Text variant="subhead" tone="secondary">
          {hasCustomNative
            ? 'As integrações com o sistema estão ativas neste aparelho.'
            : isExpoGo
              ? 'No Expo Go todo o app funciona — renomear, presets, histórico, pastas. Extensões do sistema (Compartilhar, widgets, tela bloqueada, atalhos) só existem no app instalado. Gere um build para ativá-las:'
              : 'Na web, os arquivos ficam em memória para demonstração.'}
        </Text>
        {isExpoGo && (
          <View style={{ backgroundColor: t.fill, borderRadius: 10, padding: space.md }}>
            <Text style={[type.mono, { fontSize: 13 }]} selectable>
              npx expo prebuild{'\n'}npx expo run:{platform}
            </Text>
          </View>
        )}
      </Card>
      <Section title="Integrações">
        {ITEMS.filter((i) => isWeb || i.platforms.includes(platform)).map((i) => (
          <View key={i.title} style={{ flexDirection: 'row', gap: space.md, padding: space.lg }}>
            <IconTile sf={i.sf} md={i.md} size={34} />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                <Text variant="headline">{i.title}</Text>
                <StatusBadge tone={hasCustomNative ? 'success' : 'neutral'} label={hasCustomNative ? 'Ativo' : 'No build'} />
              </View>
              <Text variant="footnote" tone="secondary">
                {i.how}
              </Text>
            </View>
          </View>
        ))}
      </Section>
    </ScrollView>
  );
}
