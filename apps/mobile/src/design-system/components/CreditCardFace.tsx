import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { radii } from '../tokens/radii';
import { Text } from './Text';

export interface CreditCardFaceProps {
  name: string;
  gradient: readonly [string, string];
  ink: string;
  /** rótulo pequeno acima do valor ("Fatura atual" / "Limite") */
  caption: string;
  amount: string;
  last4: string;
  /** texto à direita do número (ex.: "fecha 28 out") */
  footerRight?: string;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Face do cartão de crédito (gradiente, r22, p20) — usada no carrossel e no preview do sheet. */
export function CreditCardFace({ name, gradient, ink, caption, amount, last4, footerRight, width = 300, height = 176, style, testID }: CreditCardFaceProps) {
  const compact = height < 170;
  return (
    <LinearGradient
      testID={testID}
      colors={[...gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ width, height, borderRadius: radii.creditCard, padding: compact ? 18 : 20, justifyContent: 'space-between' }, style]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="titleBold" color={ink} numberOfLines={1} style={{ flex: 1, marginRight: 8 }}>
          {name}
        </Text>
        <Text variant="value" color={ink} opacity={0.7} style={{ fontFamily: 'Sora_800ExtraBold' }}>
          kash
        </Text>
      </View>
      <View style={{ gap: compact ? 4 : 6 }}>
        <Text variant="microMedium" color={ink} opacity={0.7}>
          {caption}
        </Text>
        <Text variant={compact ? 'pageTitle' : 'amountCard'} color={ink}>
          {amount}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="metaMedium" color={ink} opacity={0.8}>
            •••• {last4}
          </Text>
          {footerRight ? (
            <Text variant="metaMedium" color={ink} opacity={0.8}>
              {footerRight}
            </Text>
          ) : null}
        </View>
      </View>
    </LinearGradient>
  );
}
