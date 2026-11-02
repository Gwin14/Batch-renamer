import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useHydrated } from '@/hooks/useHydrated';
import { useWidgetSync } from '@/hooks/useWidgetSync';
import { revalidateStudio } from '@/services/actions';
import { useSettings } from '@/store/settings';
import { ActionSheetHost } from '@/ui/ActionSheet';
import { modalStackOptions } from '@/ui/navigation';
import { useTheme } from '@/ui/theme';
import { ToastHost } from '@/ui/Toast';

export const unstable_settings = { anchor: '(tabs)' };

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const ready = useHydrated();
  const onboarded = useSettings((s) => s.onboarded);
  const pref = useSettings((s) => s.theme);
  const t = useTheme();

  // Native controls (switches, sheets, tab bar, pickers) follow the in-app theme choice.
  useEffect(() => {
    if (process.env.EXPO_OS !== 'web') Appearance.setColorScheme(pref === 'system' ? 'unspecified' : pref);
  }, [pref]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.bg).catch(() => {});
  }, [t.bg]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && revalidateStudio());
    return () => sub.remove();
  }, []);

  useWidgetSync();

  if (!ready) return null;

  const navTheme = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const modal = modalStackOptions(t);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.bg }}>
      <ThemeProvider
        value={{
          ...navTheme,
          colors: { ...navTheme.colors, primary: t.accent, background: t.bg, card: t.surface, text: t.label, border: t.separator },
        }}
      >
        <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerTintColor: t.accent, contentStyle: { backgroundColor: t.bg } }}>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="rules" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="review" options={{ ...modal, presentation: 'modal', title: 'Revisar', headerShown: false }} />
            <Stack.Screen
              name="save-preset"
              options={{ ...modal, presentation: 'formSheet', headerShown: false, sheetAllowedDetents: [0.62, 0.95], sheetGrabberVisible: true, sheetCornerRadius: 28 }}
            />
            <Stack.Screen
              name="new-folder"
              options={{ ...modal, presentation: 'formSheet', headerShown: false, sheetAllowedDetents: [0.4, 0.9], sheetGrabberVisible: true, sheetCornerRadius: 28 }}
            />
            <Stack.Screen
              name="move"
              options={{ ...modal, presentation: 'formSheet', headerShown: false, sheetAllowedDetents: [0.6, 0.95], sheetGrabberVisible: true, sheetCornerRadius: 28 }}
            />
            <Stack.Screen
              name="quick-preset"
              options={{ ...modal, presentation: 'formSheet', headerShown: false, sheetAllowedDetents: [0.6, 0.95], sheetGrabberVisible: true, sheetCornerRadius: 28 }}
            />
            <Stack.Screen name="quick" options={{ presentation: 'transparentModal', animation: 'fade', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
            <Stack.Screen name="expo-sharing" options={{ presentation: 'transparentModal', animation: 'fade', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
          </Stack.Protected>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
          </Stack.Protected>
          <Stack.Screen name="+not-found" options={{ title: 'Não encontrado' }} />
        </Stack>
        <ToastHost />
        <ActionSheetHost />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
