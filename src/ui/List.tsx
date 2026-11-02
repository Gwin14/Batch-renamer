import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptics } from '@/services/haptics';

import { Icon } from './Icon';
import { Text } from './Text';
import { radius, space, useTheme } from './theme';

export function Card({ children, style, padded = false }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.surface, boxShadow: t.scheme === 'light' ? t.shadow : undefined }, padded && { padding: space.lg }, style]}>
      {children}
    </View>
  );
}

export function Section({
  title,
  footer,
  action,
  children,
  style,
}: {
  title?: string;
  footer?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ gap: space.sm }, style]}>
      {(title || action) && (
        <View style={styles.sectionHeader}>
          {title ? (
            <Text variant="footnote" tone="secondary" weight="600" style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      )}
      <Card>
        {items.map((child, i) => (
          <Fragment key={isValidElement(child) && child.key != null ? child.key : i}>
            {child}
            {i < items.length - 1 && <View style={[styles.separator, { backgroundColor: t.separator }]} />}
          </Fragment>
        ))}
      </Card>
      {!!footer && (
        <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: space.lg }}>
          {footer}
        </Text>
      )}
    </View>
  );
}

export function IconTile({ sf, md, color, bg, size = 30 }: { sf: string; md: string; color?: string; bg?: string; size?: number }) {
  const t = useTheme();
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: bg ?? t.accentSoft }]}>
      <Icon sf={sf} md={md} size={size * 0.56} color={color ?? t.accent} weight="semibold" />
    </View>
  );
}

export interface RowProps {
  title: string;
  subtitle?: string;
  icon?: { sf: string; md: string; color?: string; bg?: string };
  value?: string;
  chevron?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  right?: ReactNode;
  disabled?: boolean;
  selected?: boolean;
  numberOfLines?: number;
}

/** List row: background highlight on press (never scale). */
export function Row({ title, subtitle, icon, value, chevron, destructive, onPress, onLongPress, right, disabled, selected, numberOfLines = 1 }: RowProps) {
  const t = useTheme();
  const content = (
    <>
      {icon && <IconTile sf={icon.sf} md={icon.md} color={destructive ? t.danger : icon.color} bg={destructive ? t.dangerSoft : icon.bg} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" tone={destructive ? 'danger' : 'label'} numberOfLines={numberOfLines}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" tone="secondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="body" tone="secondary" numberOfLines={1} style={{ maxWidth: '45%' }}>
          {value}
        </Text>
      ) : null}
      {right}
      {selected && <Icon sf="checkmark" md="check" size={17} color={t.accent} weight="bold" />}
      {chevron && <Icon sf="chevron.right" md="chevron_right" size={14} color={t.tertiary} weight="semibold" />}
    </>
  );
  if (!onPress && !onLongPress) return <View style={[styles.row, disabled && { opacity: 0.45 }]}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? t.fill : 'transparent' }, disabled && { opacity: 0.45 }]}
    >
      {content}
    </Pressable>
  );
}

export function SwitchRow({ title, subtitle, value, onValueChange, icon }: { title: string; subtitle?: string; value: boolean; onValueChange: (v: boolean) => void; icon?: RowProps['icon'] }) {
  const t = useTheme();
  return (
    <Row
      title={title}
      subtitle={subtitle}
      icon={icon}
      numberOfLines={2}
      right={
        <Switch
          value={value}
          onValueChange={(v) => {
            haptics.selection();
            onValueChange(v);
          }}
          trackColor={{ true: t.accent, false: t.fillStrong }}
          thumbColor={process.env.EXPO_OS === 'ios' ? undefined : value ? '#FFFFFF' : '#F4F4F5'}
          ios_backgroundColor={t.fillStrong}
          accessibilityLabel={title}
          {...(process.env.EXPO_OS === 'web' ? ({ activeThumbColor: '#FFFFFF' } as object) : null)}
        />
      }
    />
  );
}

export function Separator({ inset = space.lg }: { inset?: number }) {
  const t = useTheme();
  return <View style={[styles.separator, { backgroundColor: t.separator, marginLeft: inset }]} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, borderCurve: 'continuous', overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, minHeight: 20 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 48 },
  tile: { borderRadius: radius.tile, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
});
