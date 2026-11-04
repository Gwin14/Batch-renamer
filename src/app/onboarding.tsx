import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  interpolate,
  LinearTransition,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loadSamples } from '@/features/studio/importMenu';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/store/settings';
import { Icon } from '@/ui/Icon';
import { m, tr, useLang } from '@/i18n';
import { Button } from '@/ui/Pressables';
import { Text } from '@/ui/Text';
import { radius, space, type, useTheme, type Theme } from '@/ui/theme';


/* ───────── Demo 1: names transforming ───────── */

const PAIRS: [string, string, [string, string]][] = [
  ['IMG_4821.JPG', 'Lisboa_2026-07-14_001.jpg', ['#E9A27A', '#2C3E6B']],
  ['IMG_4822.JPG', 'Lisboa_2026-07-15_002.jpg', ['#9CC6E6', '#DCC49A']],
  ['WhatsApp Image 2026…jpeg', 'Lisboa_2026-08-03_003.jpg', ['#C4BAB4', '#46464E']],
  ['Screenshot 2026-10-14…png', 'Lisboa_2026-10-14_004.png', ['#D6E2EE', '#AEC4DE']],
];

function PhotoTile({ colors }: { colors: [string, string] }) {
  return (
    <View style={[styles.photo, { backgroundColor: colors[0] }]}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', backgroundColor: colors[1] }} />
    </View>
  );
}

function useTicker(active: boolean, ms: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return tick;
}

function RenameDemo({ active, t }: { active: boolean; t: Theme }) {
  const tick = useTicker(active, 2200);
  const renamed = tick % 2 === 1;
  const reduce = useReducedMotion();
  return (
    <View style={[styles.demoCard, { backgroundColor: t.surface, boxShadow: t.shadowLift }]}>
      {PAIRS.map(([from, to, colors], i) => (
        <View key={from} style={[styles.demoRow, i < PAIRS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.separator }]}>
          <PhotoTile colors={colors} />
          <View style={{ flex: 1, height: 22, justifyContent: 'center', overflow: 'hidden' }}>
            <Animated.View key={`${from}-${renamed}`} entering={reduce ? FadeIn.duration(200) : FadeInDown.duration(320).delay(i * 70)} exiting={reduce ? FadeOut.duration(150) : FadeOutUp.duration(200).delay(i * 50)}>
              <Text variant="subhead" weight={renamed ? '600' : '400'} numberOfLines={1} style={{ color: renamed ? t.accent : t.secondary }}>
                {renamed ? to : from}
              </Text>
            </Animated.View>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ───────── Demo 2: rules stacking ───────── */

const STEPS = [
  { title: m('Limpar'), sf: 'wand.and.stars', md: 'mop', result: 'IMG_4821.jpg' },
  { title: m('Data da captura'), sf: 'calendar', md: 'calendar_today', result: '2026-07-14_IMG_4821.jpg' },
  { title: m('Numeração'), sf: 'number', md: 'tag', result: '2026-07-14_001.jpg' },
];

function RulesDemo({ active, t }: { active: boolean; t: Theme }) {
  const tick = useTicker(active, 1300);
  const reduce = useReducedMotion();
  const count = active ? (tick % (STEPS.length + 2)) : STEPS.length;
  const shown = Math.min(count, STEPS.length);
  const result = shown === 0 ? 'IMG_4821 (1).JPG' : STEPS[shown - 1].result;
  return (
    <View style={{ width: '100%', gap: space.md }}>
      <View style={[styles.demoCard, { backgroundColor: t.surface, boxShadow: t.shadowLift, minHeight: 3 * 56 }]}>
        {STEPS.slice(0, shown).map((s, i) => (
          <Animated.View key={s.title} entering={reduce ? FadeIn : FadeInDown.duration(280)} layout={reduce ? undefined : LinearTransition.duration(220)} style={[styles.demoRow, i < shown - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.separator }]}>
            <View style={[styles.ruleIcon, { backgroundColor: t.accentSoft }]}>
              <Icon sf={s.sf} md={s.md} size={16} color={t.accent} weight="semibold" />
            </View>
            <Text variant="headline" style={{ flex: 1 }}>
              {tr(s.title)}
            </Text>
            <Text variant="footnote" tone="tertiary" tabular>
              {i + 1}
            </Text>
          </Animated.View>
        ))}
      </View>
      <View style={[styles.resultPill, { backgroundColor: t.accentSoft }]}>
        <Icon sf="arrow.turn.down.right" md="subdirectory_arrow_right" size={14} color={t.accent} />
        <Animated.View key={result} entering={FadeIn.duration(200)}>
          <Text variant="subhead" weight="600" tone="accent" numberOfLines={1}>
            {result}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

/* ───────── Demo 3: variables ───────── */

const TOKENS = [
  { token: '{taken:YYYY-MM-DD}', value: '2026-07-14' },
  { token: '_', value: '_' },
  { token: '{folder}', value: 'Lisboa' },
  { token: '_', value: '_' },
  { token: '{n:3}', value: '001' },
];

function VariablesDemo({ active, t }: { active: boolean; t: Theme }) {
  const tick = useTicker(active, 1800);
  const resolved = tick % 2 === 1;
  return (
    <View style={[styles.demoCard, { backgroundColor: t.surface, boxShadow: t.shadowLift, padding: space.lg, gap: space.lg }]}>
      <Text variant="footnote" tone="secondary" weight="600">
        {tr('NOVO NOME')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {TOKENS.map((tk, i) =>
          tk.token === '_' ? (
            <Text key={i} style={[type.mono, { color: t.secondary }]}>
              _
            </Text>
          ) : (
            <Animated.View key={`${i}-${resolved}`} entering={FadeIn.duration(240).delay(i * 60)} style={[styles.token, { backgroundColor: resolved ? t.accent : t.accentSoft }]}>
              <Text style={[type.mono, { fontSize: 13, color: resolved ? t.onAccent : t.accent }]}>{resolved ? tk.value : tk.token}</Text>
            </Animated.View>
          ),
        )}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {['{dims}', '{rand:4}', '{name|kebab}', '{ext}'].map((c) => (
          <View key={c} style={[styles.token, { backgroundColor: t.fill }]}>
            <Text style={[type.mono, { fontSize: 12, color: t.secondary }]}>{c}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ───────── Demo 4: everywhere + undo ───────── */

function EverywhereDemo({ t }: { t: Theme }) {
  const items = [
    { sf: 'square.and.arrow.up', md: 'share', label: tr('Compartilhar') },
    { sf: 'square.grid.2x2', md: 'widgets', label: tr('Widget') },
    { sf: 'lock.rectangle', md: 'lock', label: tr('Tela bloqueada') },
    { sf: 'folder', md: 'folder', label: tr('Pastas') },
  ];
  return (
    <View style={{ width: '100%', gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {items.map((i) => (
          <View key={i.label} style={[styles.everywhere, { backgroundColor: t.surface, boxShadow: t.shadow }]}>
            <Icon sf={i.sf} md={i.md} size={24} color={t.accent} />
            <Text variant="caption" tone="secondary" numberOfLines={1} align="center">
              {i.label}
            </Text>
          </View>
        ))}
      </View>
      <View style={[styles.demoCard, { backgroundColor: t.surface, boxShadow: t.shadowLift, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }]}>
        <View style={[styles.ruleIcon, { backgroundColor: t.successSoft }]}>
          <Icon sf="checkmark" md="check" size={16} color={t.success} weight="bold" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="headline">{tr('{{n}} arquivos renomeados', { n: 48 })}</Text>
          <Text variant="footnote" tone="secondary">
            {tr('Fotos por data · agora')}
          </Text>
        </View>
        <View style={[styles.undo, { backgroundColor: t.fill }]}>
          <Text variant="subhead" weight="600">
            {tr('Desfazer')}
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ───────── Pager ───────── */

const PAGES = [
  { title: m('Centenas de arquivos,\num toque'), body: m('Renomeie fotos, vídeos e documentos em lote — com prévia de cada nome antes de qualquer mudança.') },
  { title: m('Regras que se encaixam'), body: m('Combine substituir, data, numeração, limpeza e mais. Reordene, pause e salve como preset.') },
  { title: m('Variáveis inteligentes'), body: m('Data da captura, pasta, dimensões, contadores e filtros — o nome se monta sozinho.') },
  { title: m('De qualquer lugar,\nsempre reversível'), body: m('Mande arquivos pelo Compartilhar, use o widget ou a tela bloqueada. Cada lote pode ser desfeito.') },
];

function Dot({ index, x, width, t }: { index: number; x: SharedValue<number>; width: number; t: Theme }) {
  const style = useAnimatedStyle(() => {
    const p = x.get() / width;
    const w = interpolate(p, [index - 1, index, index + 1], [8, 24, 8], Extrapolation.CLAMP);
    const o = interpolate(p, [index - 1, index, index + 1], [0.35, 1, 0.35], Extrapolation.CLAMP);
    return { width: w, opacity: o };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: t.accent }, style]} />;
}

export default function Onboarding() {
  const t = useTheme();
  useLang();
  const { width } = useWindowDimensions();
  const complete = useSettings((s) => s.completeOnboarding);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const x = useSharedValue(0);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;
  const demoWidth = Math.min(width - space.xxxl * 2, 420);

  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    if (p !== page) {
      haptics.selection();
      setPage(p);
    }
  };
  const go = (p: number) => {
    scrollRef.current?.scrollTo({ x: p * width, animated: true });
    setPage(p);
    haptics.selection();
  };
  const finish = (withSamples: boolean) => {
    haptics.success();
    if (withSamples) loadSamples();
    complete();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View style={[styles.logo, { backgroundColor: t.accent }]}>
            <Icon sf="wand.and.rays" md="auto_fix_high" size={15} color={t.onAccent} weight="bold" />
          </View>
          <Text variant="headline">Lote</Text>
        </View>
        {!last && (
          <Text variant="body" tone="secondary" onPress={() => finish(false)} suppressHighlighting accessibilityRole="button" style={{ padding: space.sm }}>
            {tr('Pular')}
          </Text>
        )}
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onEnd}
        style={{ flex: 1 }}
      >
        {PAGES.map((p, i) => (
          <View key={p.title} style={{ width, paddingHorizontal: space.xxxl, justifyContent: 'center', gap: space.xxxl }}>
            <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 300, width: demoWidth, alignSelf: 'center' }}>
              {i === 0 && <RenameDemo active={page === 0} t={t} />}
              {i === 1 && <RulesDemo active={page === 1} t={t} />}
              {i === 2 && <VariablesDemo active={page === 2} t={t} />}
              {i === 3 && <EverywhereDemo t={t} />}
            </View>
            <View style={{ gap: space.md, maxWidth: 520, alignSelf: 'center', width: '100%' }}>
              <Text variant="title1" accessibilityRole="header">
                {tr(p.title)}
              </Text>
              <Text variant="callout" tone="secondary">
                {tr(p.body)}
              </Text>
            </View>
          </View>
        ))}
      </Animated.ScrollView>

      <View style={styles.bottom}>
        <View style={styles.dots} accessibilityLabel={tr('Página {{page}} de {{total}}', { page: page + 1, total: PAGES.length })}>
          {PAGES.map((_, i) => (
            <Dot key={i} index={i} x={x} width={width} t={t} />
          ))}
        </View>
        <Button title={last ? tr('Começar') : tr('Continuar')} onPress={() => (last ? finish(false) : go(page + 1))} full />
        <View style={{ height: 44, justifyContent: 'center' }}>
          {last && (
            <Text variant="subhead" tone="accent" weight="600" align="center" onPress={() => finish(true)} suppressHighlighting accessibilityRole="button" style={{ padding: space.sm }}>
              {tr('Começar com arquivos de exemplo')}
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, height: 52 },
  logo: { width: 28, height: 28, borderRadius: radius.tile, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: space.xl, gap: space.lg, paddingTop: space.md, width: '100%', maxWidth: 520, alignSelf: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, height: 8 },
  dot: { height: 8, borderRadius: radius.pill },
  demoCard: { width: '100%', borderRadius: radius.card, borderCurve: 'continuous', overflow: 'hidden' },
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, height: 56 },
  photo: { width: 36, height: 36, borderRadius: radius.field, borderCurve: 'continuous', overflow: 'hidden' },
  ruleIcon: { width: 32, height: 32, borderRadius: radius.tile, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  resultPill: { flexDirection: 'row', alignItems: 'center', gap: space.sm, alignSelf: 'center', paddingHorizontal: space.lg, height: 36, borderRadius: radius.pill },
  token: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.badge, borderCurve: 'continuous' },
  everywhere: { flex: 1, aspectRatio: 1, borderRadius: radius.card, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 4 },
  undo: { paddingHorizontal: space.md, height: 32, borderRadius: radius.pill, justifyContent: 'center' },
});
