import { householdPeople } from '@kash/domain';
import React from 'react';
import { View } from 'react-native';
import { Switch, Text, radii, useTheme } from '@/design-system';
import { useKashStore } from '@/store';

/** visão "só do casal": o item novo já nasce compartilhado */
export function useDefaultShared(): boolean {
  return useKashStore((s) => {
    const me = s.household?.members.find((m) => m.userId === s.userId);
    return householdPeople(s.household, s.userId).active && me?.viewScope === 'shared';
  });
}

/**
 * "Compartilhar com Bruno": aparece só com a conta compartilhada ativa (duas pessoas).
 * `what` completa a explicação ("os lançamentos desta conta", "a fatura deste cartão"…).
 */
export function ShareToggle({ value, onChange, what, testID = 'share-toggle' }: { value: boolean; onChange: (v: boolean) => void; what: string; testID?: string }) {
  const { colors } = useTheme();
  const household = useKashStore((s) => s.household);
  const userId = useKashStore((s) => s.userId);
  const partner = householdPeople(household, userId);
  if (!partner.active || !partner.partner) return null;
  const name = partner.partner.name.split(/\s+/)[0];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radii.input, backgroundColor: colors.surface, borderWidth: 1, borderColor: value ? colors.accentText : colors.line }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodySemibold">Compartilhar com {name}</Text>
        <Text variant="micro" color="muted">
          {value ? `${name} vê e lança junto: ${what}. A cada lançamento, ${name} recebe um aviso.` : `Só você vê ${what}.`}
        </Text>
      </View>
      <Switch value={value} onValueChange={onChange} testID={testID} accessibilityLabel={`Compartilhar com ${name}`} />
    </View>
  );
}
