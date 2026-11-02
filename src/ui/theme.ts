import { useColorScheme } from 'react-native';

import { useSettings } from '@/store/settings';

/**
 * Design tokens.
 * - One accent (persimmon), locked across every screen.
 * - One cool grey family mirroring iOS system greys.
 * - Shape rule: actions + chips are pills, cards 16, inputs/thumbnails 10, icon tiles 8, badges 6.
 * - Spacing: 4pt base.
 * Colors are resolved strings (safe for Reanimated + both platforms + web).
 */
const light = {
  scheme: 'light' as 'light' | 'dark',
  bg: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F7FA',
  fill: '#E9E9EE',
  fillStrong: '#DCDCE2',
  label: '#0B0B0F',
  secondary: '#6C6C72',
  tertiary: '#A3A3A9',
  separator: '#D8D8DE',
  accent: '#D9480F',
  accentPressed: '#B83C0B',
  accentSoft: '#FCE9E0',
  onAccent: '#FFFFFF',
  success: '#1F8A3B',
  successSoft: '#E2F4E6',
  warning: '#A15C00',
  warningSoft: '#FBF0DC',
  danger: '#D1242F',
  dangerSoft: '#FBE4E5',
  diffRemoved: '#A3A3A9',
  overlay: 'rgba(0,0,0,0.4)',
  shadow: '0 1px 2px rgba(16,16,24,0.06), 0 8px 24px rgba(16,16,24,0.06)',
  shadowLift: '0 2px 6px rgba(16,16,24,0.10), 0 16px 40px rgba(16,16,24,0.14)',
};

const dark: typeof light = {
  scheme: 'dark',
  bg: '#000000',
  surface: '#1C1C1E',
  surfaceAlt: '#232326',
  fill: '#2C2C2F',
  fillStrong: '#3A3A3D',
  label: '#F5F5F7',
  secondary: '#98989F',
  tertiary: '#636368',
  separator: '#343437',
  accent: '#FF7A33',
  accentPressed: '#FF9152',
  accentSoft: '#3A2116',
  onAccent: '#1A0B03',
  success: '#32D74B',
  successSoft: '#13301A',
  warning: '#FFC53D',
  warningSoft: '#352A10',
  danger: '#FF5A52',
  dangerSoft: '#3A1716',
  diffRemoved: '#636368',
  overlay: 'rgba(0,0,0,0.55)',
  shadow: '0 1px 2px rgba(0,0,0,0.5)',
  shadowLift: '0 2px 8px rgba(0,0,0,0.6), 0 16px 40px rgba(0,0,0,0.5)',
};

export type Theme = typeof light;

export const radius = { card: 16, field: 10, tile: 8, badge: 6, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

const monoFamily = process.env.EXPO_OS === 'ios' ? 'Menlo' : process.env.EXPO_OS === 'android' ? 'monospace' : 'ui-monospace, SFMono-Regular, Menlo, monospace';

/** Platform type ramp (iOS HIG sizes; Android maps closely to M3 body/title). */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const, letterSpacing: 0.37 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: 0.35 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const, letterSpacing: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const, letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' as const, letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' as const, letterSpacing: -0.32 },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const, letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, letterSpacing: -0.08 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const, letterSpacing: 0 },
  mono: { fontFamily: monoFamily, fontSize: 15, lineHeight: 20 },
};

export function useColorPreference(): 'light' | 'dark' {
  const system = useColorScheme();
  const pref = useSettings((s) => s.theme);
  if (pref === 'system') return system === 'dark' ? 'dark' : 'light';
  return pref;
}

export function useTheme(): Theme {
  return useColorPreference() === 'dark' ? dark : light;
}

export const themes = { light, dark };

/** Spring + timing vocabulary (one per app). */
export const motion = {
  snap: { duration: 400, dampingRatio: 1 },
  sheet: { duration: 300, dampingRatio: 0.8 },
  pressIn: 110,
  pressOut: 160,
} as const;
