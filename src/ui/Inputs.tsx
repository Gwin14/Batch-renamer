import RNSegmentedControl, { type SegmentedControlProps } from '@react-native-segmented-control/segmented-control';
import { forwardRef, useImperativeHandle, useRef, useState, type ComponentRef, type ComponentType, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { haptics } from '@/services/haptics';

import { Icon } from './Icon';
import { Text } from './Text';
import { radius, space, type, useTheme } from './theme';

export interface FieldHandle {
  insert: (text: string) => void;
  focus: () => void;
}

interface FieldProps extends Omit<TextInputProps, 'value' | 'onChangeText' | 'style'> {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  mono?: boolean;
  error?: string | null;
  hint?: string;
  trailing?: ReactNode;
}

/** Label above the field; error below in the platform error color and stays until fixed. */
export const Field = forwardRef<FieldHandle, FieldProps>(function Field({ label, value, onChangeText, mono, error, hint, trailing, ...rest }, ref) {
  const t = useTheme();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const selection = useRef({ start: value.length, end: value.length });
  const [focused, setFocused] = useState(false);

  useImperativeHandle(ref, () => ({
    insert: (text: string) => {
      const { start, end } = selection.current;
      const s = Math.min(start, value.length);
      const e = Math.min(end, value.length);
      const next = value.slice(0, s) + text + value.slice(e);
      selection.current = { start: s + text.length, end: s + text.length };
      onChangeText(next);
    },
    focus: () => input.current?.focus(),
  }));

  return (
    <View style={{ gap: 6 }}>
      {!!label && (
        <Text variant="footnote" tone="secondary" weight="600">
          {label}
        </Text>
      )}
      <View
        style={[
          styles.field,
          { backgroundColor: t.fill, borderColor: error ? t.danger : focused ? t.accent : 'transparent' },
        ]}
      >
        <TextInput
          ref={input}
          value={value}
          onChangeText={onChangeText}
          onSelectionChange={(e) => (selection.current = e.nativeEvent.selection)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={t.tertiary}
          selectionColor={t.accent}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          style={[mono ? type.mono : type.body, styles.input, { color: t.label }]}
          {...rest}
        />
        {trailing}
      </View>
      {error ? (
        <Text variant="footnote" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="footnote" tone="secondary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

// The package ships class typings that predate React 19's JSX types.
const SegmentedControl = RNSegmentedControl as unknown as ComponentType<SegmentedControlProps>;

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const t = useTheme();
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <SegmentedControl
      values={options.map((o) => o.label)}
      selectedIndex={index}
      onChange={(e) => {
        haptics.selection();
        onChange(options[e.nativeEvent.selectedSegmentIndex].value);
      }}
      appearance={t.scheme}
      style={{ height: 32 }}
      fontStyle={{ fontSize: 13 }}
      activeFontStyle={{ fontSize: 13, fontWeight: '600' }}
    />
  );
}

export function Stepper({ value, onChange, min = 0, max = 9999, step = 1, label, format }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string; format?: (v: number) => string }) {
  const t = useTheme();
  const set = (v: number) => {
    const clamped = Math.max(min, Math.min(max, v));
    if (clamped !== value) {
      haptics.selection();
      onChange(clamped);
    }
  };
  return (
    <View style={styles.stepperRow}>
      <Text variant="body" style={{ flex: 1 }}>
        {label}
      </Text>
      <View style={[styles.stepper, { backgroundColor: t.fill }]}>
        <Pressable accessibilityLabel={`Diminuir ${label}`} onPress={() => set(value - step)} hitSlop={4} style={({ pressed }) => [styles.stepBtn, { opacity: value <= min ? 0.3 : pressed ? 0.5 : 1 }]}>
          <Icon sf="minus" md="remove" size={16} weight="bold" />
        </Pressable>
        <Text variant="headline" tabular style={{ minWidth: 44, textAlign: 'center' }}>
          {format ? format(value) : value}
        </Text>
        <Pressable accessibilityLabel={`Aumentar ${label}`} onPress={() => set(value + step)} hitSlop={4} style={({ pressed }) => [styles.stepBtn, { opacity: value >= max ? 0.3 : pressed ? 0.5 : 1 }]}>
          <Icon sf="plus" md="add" size={16} weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}

export function Chip({ label, selected, onPress, icon, mono }: { label: string; selected?: boolean; onPress?: () => void; icon?: { sf: string; md: string }; mono?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.selection();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? t.accent : pressed ? t.fillStrong : t.fill },
      ]}
    >
      {icon && <Icon {...icon} size={14} color={selected ? t.onAccent : t.label} weight="semibold" />}
      <Text variant="subhead" weight="500" style={[{ color: selected ? t.onAccent : t.label }, mono && { fontFamily: type.mono.fontFamily, fontSize: 14 }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Horizontal choice group made of chips (for >5 options where a segmented control won't fit). */
export function ChipGroup<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

/** Scrollable token bar for inserting variables at the cursor. */
export function TokenBar({ tokens, onInsert }: { tokens: { token: string; label: string }[]; onInsert: (token: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: space.sm, paddingVertical: 2 }}>
      {tokens.map((tk) => (
        <Chip key={tk.token} label={tk.label} onPress={() => onInsert(tk.token)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  field: {
    borderRadius: radius.field,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    minHeight: 46,
  },
  input: { flex: 1, paddingVertical: 11 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, paddingHorizontal: 4, height: 36 },
  stepBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: radius.pill, borderCurve: 'continuous' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
