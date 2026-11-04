import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tr, trn, useLang } from '@/i18n';
import { kindOf } from '@/engine/text';
import type { ConflictStrategy, PreviewItem, PreviewSummary } from '@/engine/types';
import { LimitNotice } from '@/features/pro/LimitNotice';
import { PreviewRow } from '@/features/studio/PreviewRow';
import { applyPreview, computePreview, undoBatch, type ApplyOutcome } from '@/services/actions';
import { isWeb } from '@/services/env';
import { exportToFolder, saveToPhotos, shareFiles } from '@/services/fs';
import { haptics } from '@/services/haptics';
import { FREE_LIMITS, requirePro, usePro } from '@/services/purchases';
import { useHistory } from '@/store/history';
import { useSettings } from '@/store/settings';
import { useStudio } from '@/store/studio';
import { Icon } from '@/ui/Icon';
import { Segmented } from '@/ui/Inputs';
import { Card, Row, Section } from '@/ui/List';
import { Button } from '@/ui/Pressables';
import { Text } from '@/ui/Text';
import { toast } from '@/ui/Toast';
import { motion, radius, space, useTheme } from '@/ui/theme';

type Filter = 'changes' | 'problems' | 'all';

function Stat({ value, label, tone }: { value: number; label: string; tone: 'accent' | 'secondary' | 'warning' | 'danger' }) {
  const t = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: t.surface }]}>
      <Text variant="title2" tone={tone === 'secondary' ? 'label' : tone} tabular>
        {value}
      </Text>
      <Text variant="caption" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const t = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withTiming(progress, { duration: 180, easing: Easing.bezier(0.23, 1, 0.32, 1) }));
  }, [progress, p]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(0.02, p.get()) }] }));
  return (
    <View style={[styles.track, { backgroundColor: t.fill }]}>
      <Animated.View style={[styles.fill, { backgroundColor: t.accent, transformOrigin: 'left' }, style]} />
    </View>
  );
}

function SuccessView({ outcome, onDone }: { outcome: ApplyOutcome; onDone: () => void }) {
  const t = useTheme();
  useLang();
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState<string | null>(null);
  const batch = outcome.batch;
  const uris = batch?.ops.map((o) => o.uri) ?? [];
  const media = uris.filter((u) => ['image', 'video'].includes(kindOf(u)));

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      toast(msg === 'PHOTOS_DENIED' ? tr('Permita o acesso às Fotos nos Ajustes.') : msg === 'SHARE_UNAVAILABLE' ? tr('Compartilhar não está disponível aqui.') : tr('Não foi possível concluir.'), { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, padding: space.xl, gap: space.xxl, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: space.lg }}>
        <Animated.View entering={reduce ? FadeIn.duration(150) : ZoomIn.springify().duration(motion.sheet.duration).dampingRatio(motion.sheet.dampingRatio)} style={[styles.check, { backgroundColor: outcome.failed.length ? t.warningSoft : t.successSoft }]}>
          <Icon sf={outcome.failed.length ? 'exclamationmark.triangle.fill' : 'checkmark'} md={outcome.failed.length ? 'warning' : 'check'} size={40} color={outcome.failed.length ? t.warning : t.success} weight="bold" />
        </Animated.View>
        <View style={{ gap: 6, alignItems: 'center' }}>
          <Text variant="title1" align="center" tabular>
            {trn(outcome.ok, '{{n}} arquivo renomeado', '{{n}} arquivos renomeados')}
          </Text>
          <Text variant="subhead" tone="secondary" align="center">
            {outcome.failed.length
              ? trn(outcome.failed.length, '{{n}} não pôde ser renomeado. Veja no Histórico.', '{{n}} não puderam ser renomeados. Veja no Histórico.')
              : tr('Tudo certo. Se mudar de ideia, dá para desfazer a qualquer momento no Histórico.')}
          </Text>
        </View>
      </View>

      {uris.length > 0 && (
        <Section title={tr('Levar para')}>
          <Row title={uris.length > 1 ? tr('Compartilhar como ZIP') : tr('Compartilhar')} icon={{ sf: 'square.and.arrow.up', md: 'share' }} chevron disabled={!!busy || isWeb} onPress={() => run('share', () => shareFiles(uris, batch?.label ?? 'Lote'))} />
          <Row title={tr('Copiar para uma pasta…')} subtitle={tr('iCloud Drive, Google Drive, cartão SD…')} icon={{ sf: 'folder.badge.plus', md: 'drive_folder_upload' }} chevron disabled={!!busy || isWeb} onPress={() => run('folder', async () => {
            const res = await exportToFolder(uris);
            if (res) toast(trn(res.count, '{{n}} arquivo copiado para “{{folder}}”', '{{n}} arquivos copiados para “{{folder}}”', { folder: res.folder }), { tone: 'success' });
          })} />
          {media.length > 0 && (
            <Row title={tr('Salvar nas Fotos')} subtitle={tr('{{n}} fotos/vídeos com os novos nomes', { n: media.length })} icon={{ sf: 'photo.badge.plus', md: 'add_photo_alternate' }} chevron disabled={!!busy || isWeb} onPress={() => run('photos', async () => {
              const n = await saveToPhotos(media);
              toast(trn(n, '{{n}} item salvo nas Fotos', '{{n}} itens salvos nas Fotos'), { tone: 'success' });
            })} />
          )}
        </Section>
      )}

      <View style={{ gap: space.md }}>
        <Button title={tr('Concluído')} onPress={onDone} />
        {batch && (
          <Button
            title={tr('Desfazer')}
            variant="secondary"
            icon={{ sf: 'arrow.uturn.backward', md: 'undo' }}
            loading={busy === 'undo'}
            onPress={() =>
              run('undo', async () => {
                const res = await undoBatch(useHistory.getState().batches.find((b) => b.id === batch.id) ?? batch);
                toast(trn(res.restored, '{{n}} nome restaurado', '{{n}} nomes restaurados'), { tone: 'success' });
                onDone();
              })
            }
          />
        )}
      </View>
    </View>
  );
}

export default function ReviewScreen() {
  const t = useTheme();
  useLang();
  const { auto } = useLocalSearchParams<{ auto?: string }>();
  const conflict = useSettings((s) => s.conflict);
  const setSettings = useSettings((s) => s.set);
  const rules = useStudio((s) => s.rules);
  const files = useStudio((s) => s.files);
  // One clock for the whole review, so the preview equals what gets applied.
  const [now] = useState(() => Date.now());
  const summary: PreviewSummary = useMemo(() => computePreview(now), [conflict, rules, files, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const [filter, setFilter] = useState<Filter>('changes');
  const [phase, setPhase] = useState<'review' | 'running' | 'done'>('review');
  const [progress, setProgress] = useState(0);
  const [outcome, setOutcome] = useState<ApplyOutcome | null>(null);
  const showDiff = useSettings((s) => s.showDiff);

  usePreventRemove(phase === 'running', () => haptics.warning());

  const items = useMemo(() => {
    if (filter === 'all') return summary.items;
    if (filter === 'problems') return summary.items.filter((i) => i.status === 'conflict' || i.status === 'error' || i.status === 'resolved');
    return summary.items.filter((i) => i.status !== 'unchanged');
  }, [filter, summary]);

  const changing = summary.changed + summary.resolved;
  const blocked = conflict === 'stop' && (summary.conflicts > 0 || summary.errors > 0);
  const locked = usePro((st) => !st.isPro) && changing > FREE_LIMITS.filesPerBatch;

  const apply = useCallback(async () => {
    if (phase !== 'review') return;
    const count = summary.changed + summary.resolved;
    if (count > FREE_LIMITS.filesPerBatch && !(await requirePro(tr('O plano grátis renomeia até {{n}} arquivos por lote.', { n: FREE_LIMITS.filesPerBatch })))) return;
    setPhase('running');
    haptics.medium();
    const res = await applyPreview(summary, (done, total) => setProgress(done / total));
    setOutcome(res);
    setPhase('done');
  }, [phase, summary]);

  // "Revisar antes" off: start as soon as the modal is on screen.
  useEffect(() => {
    if (auto !== '1' || changing === 0 || blocked) return;
    const frame = requestAnimationFrame(() => apply());
    return () => cancelAnimationFrame(frame);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bg = t.scheme === 'dark' ? t.surface : t.bg;

  if (phase === 'done' && outcome) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['bottom', 'top']}>
        <SuccessView outcome={outcome} onDone={() => router.dismiss()} />
      </SafeAreaView>
    );
  }

  const renderItem = ({ item, index }: { item: PreviewItem; index: number }) => (
    <View
      style={{
        marginHorizontal: space.lg,
        overflow: 'hidden',
        borderTopLeftRadius: index === 0 ? radius.card : 0,
        borderTopRightRadius: index === 0 ? radius.card : 0,
        borderBottomLeftRadius: index === items.length - 1 ? radius.card : 0,
        borderBottomRightRadius: index === items.length - 1 ? radius.card : 0,
        borderBottomWidth: index === items.length - 1 ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: t.separator,
        borderCurve: 'continuous',
      }}
    >
      <PreviewRow item={item} showDiff={showDiff} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <Text variant="body" tone="accent" onPress={() => phase === 'review' && router.dismiss()} suppressHighlighting accessibilityRole="button" style={{ opacity: phase === 'running' ? 0.3 : 1 }}>
          {tr('Cancelar')}
        </Text>
        <Text variant="headline">{tr('Revisar')}</Text>
        <View style={{ width: 64 }} />
      </SafeAreaView>
      <FlashList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={{ padding: space.lg, gap: space.xl }}>
            <View style={{ gap: 4 }}>
              <Text variant="largeTitle" tabular>
                {trn(changing, '{{n}} arquivo', '{{n}} arquivos')}
              </Text>
              <Text variant="subhead" tone="secondary">
                {summary.items.some((i) => i.subfolder)
                  ? trn(changing, 'será renomeado e organizado em pastas. Nada muda até você confirmar.', 'serão renomeados e organizados em pastas. Nada muda até você confirmar.')
                  : trn(changing, 'será renomeado. Nada muda até você confirmar.', 'serão renomeados. Nada muda até você confirmar.')}
              </Text>
            </View>
            <View style={styles.stats}>
              <Stat value={summary.changed + summary.resolved} label={tr('Mudam')} tone="accent" />
              <Stat value={summary.unchanged} label={tr('Iguais')} tone="secondary" />
              <Stat value={summary.conflicts + summary.resolved} label={tr('Conflitos')} tone={summary.conflicts ? 'warning' : 'secondary'} />
              <Stat value={summary.errors} label={tr('Erros')} tone={summary.errors ? 'danger' : 'secondary'} />
            </View>
            {(summary.conflicts > 0 || summary.resolved > 0) && (
              <Card padded style={{ gap: space.md }}>
                <Text variant="subhead" weight="600">
                  {tr('Nomes repetidos')}
                </Text>
                <Segmented<ConflictStrategy>
                  options={[
                    { value: 'suffix', label: tr('Adicionar (2)') },
                    { value: 'skip', label: tr('Pular') },
                    { value: 'stop', label: tr('Parar') },
                  ]}
                  value={conflict}
                  onChange={(c) => setSettings({ conflict: c })}
                />
                <Text variant="footnote" tone="secondary">
                  {conflict === 'suffix' ? tr('Arquivos com o mesmo nome ganham “(2)”, “(3)”…') : conflict === 'skip' ? tr('Os repetidos ficam com o nome atual.') : tr('Nada é renomeado enquanto houver conflitos.')}
                </Text>
              </Card>
            )}
            {changing > FREE_LIMITS.filesPerBatch && (
              <LimitNotice
                title={tr('Este lote passa do plano grátis')}
                message={tr('São {{n}} arquivos e o plano grátis renomeia até {{limit}} por vez. Ao tocar em Renomear, você pode desbloquear o Lote Pro.', { n: changing, limit: FREE_LIMITS.filesPerBatch })}
              />
            )}
            <Segmented<Filter>
              options={[
                { value: 'changes', label: tr('Mudanças') },
                { value: 'problems', label: tr('Atenção') },
                { value: 'all', label: tr('Todos') },
              ]}
              value={filter}
              onChange={setFilter}
            />
            {items.length === 0 && (
              <Text variant="subhead" tone="secondary" align="center" style={{ paddingVertical: space.xxl }}>
                {filter === 'problems' ? tr('Nenhum problema encontrado.') : tr('Nenhum arquivo aqui.')}
              </Text>
            )}
          </View>
        }
        contentContainerStyle={{ paddingBottom: 140 }}
      />
      <SafeAreaView edges={['bottom']} style={[styles.bottom, { backgroundColor: bg, borderTopColor: t.separator }]}>
        {phase === 'running' ? (
          <View style={{ gap: space.sm, paddingVertical: space.sm }}>
            <Text variant="subhead" weight="600" tabular>
              {tr('Renomeando… {{done}} de {{total}}', { done: Math.round(progress * changing), total: changing })}
            </Text>
            <ProgressBar progress={progress} />
          </View>
        ) : (
          <Button
            title={blocked ? tr('Resolva os conflitos para continuar') : locked ? tr('Desbloquear e renomear {{n}}', { n: changing }) : trn(changing, 'Renomear {{n}} arquivo', 'Renomear {{n}} arquivos')}
            icon={locked ? { sf: 'lock.fill', md: 'lock' } : { sf: 'wand.and.rays', md: 'auto_fix_high' }}
            disabled={changing === 0 || blocked}
            onPress={apply}
            haptic={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.sm, paddingTop: space.md },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, paddingVertical: space.md, paddingHorizontal: space.sm, borderRadius: radius.card, borderCurve: 'continuous', alignItems: 'center', gap: 2 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 8, width: '100%', borderRadius: radius.pill },
  check: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
});
