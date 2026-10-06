import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';

export interface ScreenTitleProps {
  title: string;
  /** subtítulo em texto ou nó (permite destaque em verde) */
  subtitle?: React.ReactNode;
  testID?: string;
}

/** Título de aba (26/800) + subtítulo 13 muted. */
export function ScreenTitle({ title, subtitle, testID }: ScreenTitleProps) {
  return (
    <View>
      <Text variant="screenTitle" testID={testID}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color="muted" style={{ marginTop: 4 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
