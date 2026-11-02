import { ActionSheetIOS, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { haptics } from '@/services/haptics';

import { Icon } from './Icon';
import { Text } from './Text';
import { radius, space, useTheme } from './theme';

export interface SheetOption {
  label: string;
  icon?: { sf: string; md: string };
  destructive?: boolean;
  onPress: () => void;
}

interface SheetRequest {
  title?: string;
  message?: string;
  options: SheetOption[];
}

const useSheet = create<{ request: SheetRequest | null; set: (r: SheetRequest | null) => void }>((set) => ({
  request: null,
  set: (request) => set({ request }),
}));

/**
 * Destructive confirms + item actions. iOS uses the system action sheet;
 * Android/web get a matching bottom sheet.
 */
export function showActions(req: SheetRequest) {
  if (process.env.EXPO_OS === 'ios') {
    const labels = [...req.options.map((o) => o.label), 'Cancelar'];
    const destructive = req.options.map((o, i) => (o.destructive ? i : -1)).filter((i) => i >= 0);
    ActionSheetIOS.showActionSheetWithOptions(
      { title: req.title, message: req.message, options: labels, cancelButtonIndex: labels.length - 1, destructiveButtonIndex: destructive },
      (i) => {
        if (i < req.options.length) req.options[i].onPress();
      },
    );
    return;
  }
  useSheet.getState().set(req);
}

export function confirmDestructive(opts: { title: string; message?: string; confirm: string; onConfirm: () => void }) {
  haptics.warning();
  showActions({ title: opts.title, message: opts.message, options: [{ label: opts.confirm, destructive: true, onPress: opts.onConfirm }] });
}

export function ActionSheetHost() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const request = useSheet((s) => s.request);
  const set = useSheet((s) => s.set);
  const reduce = useReducedMotion();
  if (process.env.EXPO_OS === 'ios') return null;
  const close = () => set(null);
  return (
    <Modal visible={!!request} transparent animationType="none" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
      {request && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Fechar" />
          </Animated.View>
          <Animated.View
            entering={reduce ? FadeIn.duration(150) : SlideInDown.duration(260)}
            exiting={reduce ? FadeOut.duration(120) : SlideOutDown.duration(180)}
            style={[styles.sheet, { backgroundColor: t.surface, paddingBottom: insets.bottom + space.sm }]}
          >
            <View style={[styles.grabber, { backgroundColor: t.fillStrong }]} />
            {(request.title || request.message) && (
              <View style={{ paddingHorizontal: space.xl, paddingBottom: space.sm, gap: 4 }}>
                {!!request.title && <Text variant="headline">{request.title}</Text>}
                {!!request.message && (
                  <Text variant="subhead" tone="secondary">
                    {request.message}
                  </Text>
                )}
              </View>
            )}
            {request.options.map((o) => (
              <Pressable
                key={o.label}
                onPress={() => {
                  close();
                  setTimeout(o.onPress, 60);
                }}
                style={({ pressed }) => [styles.option, { backgroundColor: pressed ? t.fill : 'transparent' }]}
              >
                {o.icon && <Icon {...o.icon} size={22} color={o.destructive ? t.danger : t.label} />}
                <Text variant="body" tone={o.destructive ? 'danger' : 'label'}>
                  {o.label}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={close} style={({ pressed }) => [styles.option, { backgroundColor: pressed ? t.fill : 'transparent' }]}>
              <Icon sf="xmark" md="close" size={22} color={t.secondary} />
              <Text variant="body" tone="secondary">
                Cancelar
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    paddingTop: space.sm,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  grabber: { width: 36, height: 4, borderRadius: radius.pill, alignSelf: 'center', marginBottom: space.md },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.xl, minHeight: 52 },
});
