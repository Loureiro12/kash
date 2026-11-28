import { householdPeople, VIEW_SCOPE_LABEL, type ViewScope } from '@kash/domain';
import React from 'react';
import { Alert, View } from 'react-native';
import { Chip, Text } from '@/design-system';
import { track } from '@/services/telemetry';
import { useKashStore } from '@/store';

/** Início: com a conta compartilhada ativa, mostra a visão atual e troca com um toque. */
export function ViewScopeChip() {
  const household = useKashStore((s) => s.household);
  const userId = useKashStore((s) => s.userId);
  const people = householdPeople(household, userId);
  const setViewScope = useKashStore((s) => s.setViewScope);
  if (!people.active || !people.me || !people.partner) return null;
  const partnerName = people.partner.name.split(/\s+/)[0];
  const scope = people.me.viewScope;
  const pick = () =>
    Alert.alert('O que mostrar', `Você e ${partnerName} escolhem cada um a sua visão.`, [
      ...(['all', 'mine_shared', 'shared'] as ViewScope[]).map((v) => ({
        text: `${v === scope ? '✓ ' : ''}${v === 'all' ? `Tudo${people.partner!.sharePersonal ? ` (inclui o pessoal de ${partnerName})` : ''}` : VIEW_SCOPE_LABEL[v]}`,
        onPress: () => {
          setViewScope(v);
          track('household_view', { scope: v });
        },
      })),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
      <Chip label={`👥 ${VIEW_SCOPE_LABEL[scope]} ▾`} tone="soft" height={30} selected={scope === 'shared'} onPress={pick} testID="home-view-scope" />
      <Text variant="micro" color="muted" numberOfLines={1} style={{ flex: 1 }}>
        com {partnerName}
      </Text>
    </View>
  );
}
