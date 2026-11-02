import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { type, useTheme } from './theme';

type Variant = keyof typeof type;
type Tone = 'label' | 'secondary' | 'tertiary' | 'accent' | 'danger' | 'success' | 'warning' | 'onAccent';

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
  tabular?: boolean;
}

export function Text({ variant = 'body', tone = 'label', weight, align, tabular, style, ...rest }: AppTextProps) {
  const t = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        type[variant],
        { color: t[tone] },
        weight ? { fontWeight: weight } : null,
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
