import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { Icon } from '../icons';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** texto à direita (ex.: "R$ 1.800,00") */
  value?: string;
  /** elemento à direita (switch) — substitui chevron */
  trailing?: React.ReactNode;
  chevron?: boolean;
  divider?: boolean;
  onPress?: () => void;
  testID?: string;
}

/** Linha de lista (Perfil): título, valor/sub, chevron ou switch, separador line. */
export function ListRow({ title, subtitle, value, trailing, chevron = true, divider = true, onPress, testID }: ListRowProps) {
  const { colors } = useTheme();
  const content = (
    <>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title">{title}</Text>
        {subtitle ? (
          <Text variant="meta" color="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="meta" color="muted">
          {value}
        </Text>
      ) : null}
      {trailing ?? (chevron ? <Icon name="chevron-right" size={16} color={colors.muted} strokeWidth={2} /> : null)}
    </>
  );
  const style = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: divider ? 1 : 0,
    borderBottomColor: colors.line,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} testID={testID} accessibilityRole="button" pressedOpacity={0.6} style={style}>
        {content}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={style}>
      {content}
    </View>
  );
}
