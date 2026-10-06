import React from 'react';
import { View } from 'react-native';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  actionTestID?: string;
  /** espaço acima (default 26 = gap entre seções) */
  marginTop?: number;
}

/** Título de seção (15/700) com link opcional à direita ("ver todas"). */
export function SectionHeader({ title, actionLabel, onAction, actionTestID, marginTop = 26 }: SectionHeaderProps) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop }}>
      <Text variant="section">{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} testID={actionTestID} accessibilityRole="link" hitSlop={8}>
          <Text variant="chip" color="accentText">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
