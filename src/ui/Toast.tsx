import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { Icon } from './Icon';
import { Text } from './Text';
import { radius, space, useTheme } from './theme';

type ToastTone = 'success' | 'info' | 'error';

interface ToastState {
  current: { id: number; message: string; tone: ToastTone; action?: { label: string; onPress: () => void }; duration: number } | null;
  show: (message: string, opts?: { tone?: ToastTone; action?: { label: string; onPress: () => void }; duration?: number }) => void;
  hide: () => void;
}

let seq = 0;
export const useToast = create<ToastState>((set) => ({
  current: null,
  show: (message, opts = {}) => set({ current: { id: ++seq, message, tone: opts.tone ?? 'info', action: opts.action, duration: opts.duration ?? (opts.action ? 6000 : 2800) } }),
  hide: () => set({ current: null }),
}));

export const toast = (...args: Parameters<ToastState['show']>) => useToast.getState().show(...args);

const ICONS: Record<ToastTone, { sf: string; md: string }> = {
  success: { sf: 'checkmark.circle.fill', md: 'check_circle' },
  info: { sf: 'info.circle.fill', md: 'info' },
  error: { sf: 'exclamationmark.triangle.fill', md: 'warning' },
};

/** Floating toast above the tab bar. Mounted once in the root layout. */
export function ToastHost() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const current = useToast((s) => s.current);
  const hide = useToast((s) => s.hide);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(hide, current.duration);
    return () => clearTimeout(timer);
  }, [current, hide]);

  if (!current) return null;
  const color = current.tone === 'success' ? t.success : current.tone === 'error' ? t.danger : t.accent;
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', paddingBottom: insets.bottom + 72, paddingHorizontal: space.lg }]}>
      <Animated.View
        key={current.id}
        entering={reduce ? FadeIn.duration(150) : FadeInDown.duration(240)}
        exiting={reduce ? FadeOut.duration(120) : FadeOutDown.duration(160)}
        style={[styles.toast, { backgroundColor: t.scheme === 'dark' ? t.fillStrong : '#1C1C1F', boxShadow: t.shadowLift }]}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <Icon {...ICONS[current.tone]} size={20} color={color} />
        <Text variant="subhead" weight="500" style={{ flex: 1, color: '#F5F5F7' }} numberOfLines={2}>
          {current.message}
        </Text>
        {current.action && (
          <Pressable
            hitSlop={8}
            onPress={() => {
              current.action?.onPress();
              hide();
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingHorizontal: space.sm })}
          >
            <Text variant="subhead" weight="700" style={{ color: t.scheme === 'dark' ? t.accent : '#FF8A4C' }}>
              {current.action.label}
            </Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    alignSelf: 'center',
    maxWidth: 520,
    width: '100%',
  },
});
