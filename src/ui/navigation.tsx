import type { ComponentProps } from 'react';
import { useWindowDimensions } from 'react-native';
import type { Stack } from 'expo-router';

import type { Theme } from './theme';

type StackOptions = NonNullable<ComponentProps<typeof Stack.Screen>['options']>;
type ResolvedOptions = Exclude<StackOptions, (...args: never[]) => unknown>;

const isIOS = process.env.EXPO_OS === 'ios';

/**
 * Native large-title headers that collapse on scroll (iOS), solid Material header elsewhere.
 * The bar is opaque in the page color: a transparent bar on iOS 26 drops the blur and leaves the
 * collapsed title floating over the content. A hairline appears only once the title collapses.
 */
export function tabStackOptions(t: Theme): ResolvedOptions {
  return {
    headerLargeTitleEnabled: true,
    headerTransparent: false,
    headerShadowVisible: isIOS,
    headerLargeTitleShadowVisible: false,
    headerLargeStyle: { backgroundColor: t.bg },
    headerStyle: { backgroundColor: t.bg },
    headerTitleStyle: { color: t.label },
    headerLargeTitleStyle: { color: t.label },
    headerTintColor: t.accent,
    headerBackButtonDisplayMode: 'minimal',
    contentStyle: { backgroundColor: t.bg },
  };
}

export function modalStackOptions(t: Theme): ResolvedOptions {
  return {
    headerShadowVisible: false,
    headerStyle: { backgroundColor: t.scheme === 'dark' ? t.surface : t.bg },
    headerTitleStyle: { color: t.label },
    headerTintColor: t.accent,
    headerBackButtonDisplayMode: 'minimal',
    contentStyle: { backgroundColor: t.scheme === 'dark' ? t.surface : t.bg },
  };
}

/** ≥ 768pt wide: tablets and large landscape phones get split layouts. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isWide = width >= 768;
  return { width, height, isWide, contentMax: isWide ? 760 : undefined };
}
