import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Icon, type IconName } from '../icons';
import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** compacto para seções dentro de uma tela (sem ícone grande) */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Estado vazio: ícone, título, texto e CTA opcional. */
export function EmptyState({ icon, title, description, actionLabel, onAction, compact, style, testID }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View testID={testID} style={[{ alignItems: 'center', paddingVertical: compact ? 22 : 40, paddingHorizontal: 16, gap: 8 }, style]}>
      {icon && !compact ? (
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
          <Icon name={icon} size={24} color={colors.muted} />
        </View>
      ) : null}
      <Text variant={compact ? 'titleBold' : 'valueLg'} align="center">
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="muted" align="center" style={{ maxWidth: 280 }}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} variant="soft" size="sm" fullWidth={false} onPress={onAction} style={{ marginTop: 10 }} testID={testID ? `${testID}-action` : undefined} /> : null}
    </View>
  );
}
