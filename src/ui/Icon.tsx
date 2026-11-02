import { SymbolView, type SymbolWeight } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

import { useTheme } from './theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];
type IOSName = Extract<SymbolName, { ios?: unknown }> extends { ios?: infer I } ? I : string;
type MDName = Extract<SymbolName, { android?: unknown }> extends { android?: infer A } ? A : string;

export interface IconProps {
  /** SF Symbol name (iOS) */
  sf: string;
  /** Material Symbol name (Android + web) */
  md: string;
  size?: number;
  color?: ColorValue;
  weight?: SymbolWeight;
  style?: StyleProp<ViewStyle>;
}

/** One icon family per platform: SF Symbols on iOS, Material Symbols elsewhere. */
export function Icon({ sf, md, size = 22, color, weight = 'medium', style }: IconProps) {
  const t = useTheme();
  return (
    <SymbolView
      name={{ ios: sf as IOSName, android: md as MDName, web: md as MDName }}
      size={size}
      tintColor={color ?? t.label}
      weight={weight}
      resizeMode="scaleAspectFit"
      style={[{ width: size, height: size }, style]}
    />
  );
}
