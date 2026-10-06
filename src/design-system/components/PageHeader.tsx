import React from 'react';
import { View } from 'react-native';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface PageHeaderProps {
  title: string;
  onBack: () => void;
  testID?: string;
}

/** Cabeçalho de página interna: botão voltar redondo 40px + título 22/800. */
export function PageHeader({ title, onBack, testID }: PageHeaderProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <IconButton icon="arrow-left" onPress={onBack} accessibilityLabel="Voltar" testID={testID ? `${testID}-back` : 'page-back'} />
      <Text variant="pageTitle" testID={testID ? `${testID}-title` : undefined}>
        {title}
      </Text>
    </View>
  );
}
