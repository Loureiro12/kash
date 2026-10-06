import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { radii } from '../tokens/radii';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  testID?: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  testID?: string;
  /** altura menor (38 total) para caber em cabeçalhos */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Segmentado (Bancárias | Fixas): container surface r14 p4; ativo fundo text/texto bg. */
export function SegmentedControl<T extends string>({ value, options, onChange, testID, compact, style }: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      style={[{ flexDirection: 'row', padding: compact ? 3 : 4, borderRadius: radii.input, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, style]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            testID={opt.testID}
            onPress={() => onChange(opt.value)}
            haptic="selection"
            pressedOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            // compact: largura pelo conteúdo (flex: 1 faria o container ocupar a linha toda)
            style={{ flex: compact ? undefined : 1, height: compact ? 30 : 38, paddingHorizontal: compact ? 16 : 0, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? colors.text : 'transparent' }}
          >
            <Text variant="bodySemibold" color={active ? colors.bg : colors.muted}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
