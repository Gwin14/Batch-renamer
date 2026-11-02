import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptics } from '@/services/haptics';

import { Icon } from './Icon';
import { Text } from './Text';
import { motion, radius, space, useTheme } from './theme';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children?: ReactNode;
}

/** Buttons and cards: scale 0.97 on press-in (110 ms, strong ease-out). */
export function PressableScale({ style, scaleTo = 0.97, onPressIn, onPressOut, children, ...rest }: ScaleProps) {
  const scale = useSharedValue(1);
  const reduce = useReducedMotion();
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        if (!reduce) scale.set(withTiming(scaleTo, { duration: motion.pressIn, easing: EASE_OUT }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withTiming(1, { duration: motion.pressOut, easing: EASE_OUT }));
        onPressOut?.(e);
      }}
      style={[style, animated, rest.disabled ? { opacity: 0.45 } : null]}
    >
      {children}
    </AnimatedPressable>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'tinted' | 'plain' | 'destructive';

export interface ButtonProps extends Omit<ScaleProps, 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: 'lg' | 'md' | 'sm';
  icon?: { sf: string; md: string };
  loading?: boolean;
  full?: boolean;
  haptic?: boolean;
}

export function Button({ title, variant = 'primary', size = 'lg', icon, loading, full, haptic = true, style, onPress, ...rest }: ButtonProps) {
  const t = useTheme();
  const height = size === 'lg' ? 52 : size === 'md' ? 44 : 34;
  const palette: Record<ButtonVariant, { bg: string; fg: string }> = {
    primary: { bg: t.accent, fg: t.onAccent },
    secondary: { bg: t.fill, fg: t.label },
    tinted: { bg: t.accentSoft, fg: t.accent },
    plain: { bg: 'transparent', fg: t.accent },
    destructive: { bg: t.dangerSoft, fg: t.danger },
  };
  const { bg, fg } = palette[variant];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      {...rest}
      onPress={(e) => {
        if (haptic) haptics.light();
        onPress?.(e);
      }}
      style={[
        styles.button,
        { height, backgroundColor: bg, paddingHorizontal: size === 'sm' ? space.md : space.xl },
        full && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon {...icon} size={size === 'sm' ? 15 : 18} color={fg} weight="semibold" />}
          <Text variant={size === 'sm' ? 'subhead' : 'headline'} weight="600" style={{ color: fg }} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

export interface IconButtonProps extends Omit<PressableProps, 'style'> {
  sf: string;
  md: string;
  label: string;
  size?: number;
  tone?: 'plain' | 'filled' | 'accent';
  style?: StyleProp<ViewStyle>;
  color?: string;
}

/** Bar buttons: opacity feedback, ≥44pt hit target. */
export function IconButton({ sf, md, label, size = 20, tone = 'plain', style, color, ...rest }: IconButtonProps) {
  const t = useTheme();
  const bg = tone === 'filled' ? t.fill : tone === 'accent' ? t.accentSoft : 'transparent';
  const fg = color ?? (tone === 'plain' ? t.accent : tone === 'accent' ? t.accent : t.label);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      {...rest}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: bg, opacity: pressed ? 0.5 : rest.disabled ? 0.35 : 1 },
        style,
      ]}
    >
      <Icon sf={sf} md={md} size={size} color={fg} weight="semibold" />
    </Pressable>
  );
}

export function Spacer({ size = space.lg }: { size?: number }) {
  return <View style={{ height: size, width: size }} />;
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
