import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Badge, Card, Icon, PageHeader, Pressable, Screen, Text, useTheme } from '@/design-system';
import { useKashStore } from '@/store';

const OPTIONS = [
  { code: 'BRL', label: 'Real', symbol: 'R$', available: true },
  { code: 'USD', label: 'Dólar americano', symbol: 'US$', available: false },
  { code: 'EUR', label: 'Euro', symbol: '€', available: false },
] as const;

/** Perfil › Moeda — só Real nesta fase; outras aparecem como "em breve". */
export function CurrencyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const currency = useKashStore((s) => s.settings.currency);

  return (
    <Screen testID="currency-screen" header={<PageHeader title="Moeda" onBack={() => router.back()} testID="currency" />}>
      <Text variant="body" color="muted">
        Moeda usada para mostrar seus valores. Lançamentos continuam sendo registrados no valor original.
      </Text>
      <Card padding={0} style={{ marginTop: 18, overflow: 'hidden' }}>
        {OPTIONS.map((opt, i) => {
          const selected = opt.code === currency;
          return (
            <Pressable
              key={opt.code}
              disabled={!opt.available}
              testID={`currency-${opt.code}`}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !opt.available }}
              accessibilityLabel={`${opt.label} (${opt.symbol})`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 16, borderBottomWidth: i < OPTIONS.length - 1 ? 1 : 0, borderBottomColor: colors.line, opacity: opt.available ? 1 : 0.55 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="bodyBold">{opt.symbol}</Text>
              </View>
              <Text variant="title" style={{ flex: 1 }}>
                {opt.label}
              </Text>
              {opt.available ? (selected ? <Icon name="check" size={18} color={colors.accentText} strokeWidth={2.6} /> : null) : <Badge label="em breve" tone="neutral" />}
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}
