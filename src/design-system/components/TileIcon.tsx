import React from 'react';
import { View } from 'react-native';
import { withAlpha } from '../tokens/colors';
import { radii } from '../tokens/radii';
import { Text } from './Text';

export interface TileIconProps {
  /** inicial exibida (ex.: "C" de Comida) */
  initial: string;
  color: string;
  /** soft: fundo cor+15%, letra na cor (categoria) · solid: fundo na cor, letra ink (conta) */
  mode?: 'soft' | 'solid';
  size?: 36 | 40 | 42;
  testID?: string;
}

/** Quadrado arredondado com inicial — ícone de categoria/conta. */
export function TileIcon({ initial, color, mode = 'soft', size = 40, testID }: TileIconProps) {
  return (
    <View
      testID={testID}
      style={{
        width: size,
        height: size,
        borderRadius: radii.icon,
        backgroundColor: mode === 'soft' ? withAlpha(color, 0.15) : color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="value" color={mode === 'soft' ? color : '#0B0C0E'}>
        {initial.toUpperCase()}
      </Text>
    </View>
  );
}
