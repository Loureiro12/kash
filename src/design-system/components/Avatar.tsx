import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { avatarGradient, staticColors } from '../tokens/colors';
import { Text } from './Text';

export interface AvatarProps {
  initial: string;
  size?: 40 | 56;
  testID?: string;
}

/** Avatar circular com gradiente verde→azul e inicial. */
export function Avatar({ initial, size = 40, testID }: AvatarProps) {
  return (
    <LinearGradient
      testID={testID}
      colors={[...avatarGradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text variant={size === 56 ? 'pageTitle' : 'titleLg'} color={staticColors.ink}>
        {initial.toUpperCase()}
      </Text>
    </LinearGradient>
  );
}
