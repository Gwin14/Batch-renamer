/**
 * Android home-screen + lock-screen (keyguard) widget, rendered with react-native-android-widget.
 * Only loaded in custom builds (see index.ts / services/native/widgets.ts) — never in Expo Go.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetInfo, WidgetTaskHandlerProps } from 'react-native-android-widget';

import { setLang, tr } from '@/i18n/core';
import { EMPTY_SNAPSHOT, type WidgetSnapshot } from '@/services/native/snapshot';

const KEY = 'lote.widget.snapshot';

export async function saveSnapshot(s: WidgetSnapshot) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

async function loadSnapshot(): Promise<WidgetSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY_SNAPSHOT, ...JSON.parse(raw) } : EMPTY_SNAPSHOT;
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

type Palette = { bg: `#${string}`; card: `#${string}`; text: `#${string}`; secondary: `#${string}`; accent: `#${string}`; onAccent: `#${string}` };
const LIGHT: Palette = { bg: '#F2F3F5', card: '#FFFFFF', text: '#14161A', secondary: '#6B7079', accent: '#E8590C', onAccent: '#FFFFFF' };
const DARK: Palette = { bg: '#16181C', card: '#22252B', text: '#F3F4F6', secondary: '#9AA0AA', accent: '#FF7A33', onAccent: '#1A0D05' };

const fmt = (n: number) => (n >= 1000 ? tr('{{n}} mil', { n: (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.', tr(',')) }) : String(n));

function Action({ p, label, uri }: { p: Palette; label: string; uri: string }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{ flex: 1, height: 40, borderRadius: 20, backgroundColor: p.card, justifyContent: 'center', alignItems: 'center' }}
    >
      <TextWidget text={label} style={{ fontSize: 13, fontWeight: '600', color: p.text }} />
    </FlexWidget>
  );
}

/** Free plan: the whole widget invites to unlock Lote Pro and opens the paywall. */
function LockedWidget({ p }: { p: Palette }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'lote://pro' }}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: p.bg, borderRadius: 24, padding: 16, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexGap: 8 }}
    >
      <TextWidget text="🔒" style={{ fontSize: 26 }} />
      <TextWidget text={tr('Toque para desbloquear com o Lote Pro')} maxLines={3} truncate="END" style={{ fontSize: 15, fontWeight: '600', color: p.text, textAlign: 'center' }} />
    </FlexWidget>
  );
}

function LoteWidget({ s, p, compact }: { s: WidgetSnapshot; p: Palette; compact: boolean }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: p.bg, borderRadius: 24, padding: 16, flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 'match_parent' }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text="Lote" style={{ fontSize: 13, fontWeight: '600', color: p.secondary }} />
          <TextWidget text={tr('{{n}} renomeados', { n: fmt(s.totalRenamed) })} style={{ fontSize: 20, fontWeight: '700', color: p.text }} />
        </FlexWidget>
      </FlexWidget>
      {!compact && (
        <TextWidget
          text={s.lastLabel ? tr('Último: {{label}} · {{n}}', { label: s.lastLabel, n: s.lastCount }) : tr('Nenhum lote ainda')}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 12, color: p.secondary }}
        />
      )}
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', flexGap: 8 }}>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'lote://quick?action=photos' }}
          style={{ flex: 2, height: 40, borderRadius: 20, backgroundColor: p.accent, justifyContent: 'center', alignItems: 'center' }}
        >
          <TextWidget text={tr('Renomear fotos')} style={{ fontSize: 13, fontWeight: '700', color: p.onAccent }} />
        </FlexWidget>
        {!compact && <Action p={p} label={tr('Arquivos')} uri="lote://quick?action=files" />}
      </FlexWidget>
    </FlexWidget>
  );
}

export function renderLoteWidget(s: WidgetSnapshot, info: WidgetInfo) {
  // Runs headless too, before the app hydrates: use the language saved with the snapshot.
  setLang(s.lang);
  const compact = info.height < 140;
  if (!s.pro) return { light: <LockedWidget p={LIGHT} />, dark: <LockedWidget p={DARK} /> };
  return { light: <LoteWidget s={s} p={LIGHT} compact={compact} />, dark: <LoteWidget s={s} p={DARK} compact={compact} /> };
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const s = await loadSnapshot();
      props.renderWidget(renderLoteWidget(s, props.widgetInfo));
      break;
    }
    default:
      break;
  }
}
