import type { ComponentProps } from 'react';
import { useWindowDimensions } from 'react-native';
import type { Stack } from 'expo-router';

import type { Theme } from './theme';

type StackOptions = NonNullable<ComponentProps<typeof Stack.Screen>['options']>;
type ResolvedOptions = Exclude<StackOptions, (...args: never[]) => unknown>;

const isIOS = process.env.EXPO_OS === 'ios';

/** Native large-title headers that collapse on scroll (iOS), solid Material header elsewhere. */
export function tabStackOptions(t: Theme): ResolvedOptions {
  return {
    headerLargeTitleEnabled: true,
    headerTransparent: isIOS,
    headerBlurEffect: isIOS ? (t.scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight') : undefined,
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerLargeStyle: { backgroundColor: isIOS ? 'transparent' : t.bg },
    headerStyle: isIOS ? undefined : { backgroundColor: t.bg },
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
