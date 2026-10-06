import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, staticColors } from '@/design-system';
import { useKashStore } from '@/store';

const BULLETS = ['Lance gastos de cartão e débito', 'Nunca mais esqueça uma conta fixa', 'Crie metas e veja o dinheiro crescer'];

/** Tela 1 — Onboarding: fundo verde integral, display 46/800, 3 bullets, CTA "Começar". */
export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const start = useKashStore((s) => s.start);
  return (
    <View
      testID="onboarding-screen"
      style={{ flex: 1, backgroundColor: staticColors.brandGreen, paddingTop: insets.top + 64, paddingHorizontal: 28, paddingBottom: Math.max(insets.bottom, 20) + 24 }}
    >
      <Text variant="screenTitle" color={staticColors.ink} style={{ fontSize: 28 }}>
        Kash
      </Text>
      <View style={{ flex: 1, justifyContent: 'center', gap: 18 }}>
        <Text variant="display" color={staticColors.ink}>
          Sua grana,{'\n'}sem mistério.
        </Text>
        <Text variant="lead" color={staticColors.ink} opacity={0.8} style={{ maxWidth: 300 }}>
          Cartões, contas e boletos num lugar só. Lance um gasto em 3 toques e saiba quanto sobra até o fim do mês.
        </Text>
        <View style={{ gap: 10, marginTop: 8 }}>
          {BULLETS.map((b, i) => (
            <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: staticColors.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="chip" color={staticColors.brandGreen}>
                  {i + 1}
                </Text>
              </View>
              <Text variant="bodySemibold" color={staticColors.ink}>
                {b}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Button label="Começar" variant="inverse" onPress={start} testID="onboarding-cta" haptic="medium" />
    </View>
  );
}
