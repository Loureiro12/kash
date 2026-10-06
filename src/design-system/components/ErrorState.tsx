import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Icon } from '../icons';
import { Button } from './Button';
import { Text } from './Text';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Estado de erro com ação de tentar de novo. */
export function ErrorState({ title = 'Não deu pra carregar', description = 'Confere sua conexão e tenta de novo.', retryLabel = 'Tentar de novo', onRetry, style, testID = 'error-state' }: ErrorStateProps) {
  const { colors } = useTheme();
  return (
    <View testID={testID} accessibilityRole="alert" style={[{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16, gap: 8 }, style]}>
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.negSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
        <Icon name="close" size={24} color={colors.neg} strokeWidth={2.4} />
      </View>
      <Text variant="valueLg" align="center">
        {title}
      </Text>
      <Text variant="body" color="muted" align="center" style={{ maxWidth: 280 }}>
        {description}
      </Text>
      {onRetry ? <Button label={retryLabel} variant="secondary" size="sm" fullWidth={false} onPress={onRetry} style={{ marginTop: 10 }} testID={`${testID}-retry`} /> : null}
    </View>
  );
}
