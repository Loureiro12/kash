import React from 'react';
import { View } from 'react-native';
import { Pressable, Text, TileIcon, useTheme } from '@/design-system';
import { formatBRL, householdPeople, ownerLabel, type TxView } from '@kash/domain';
import { useKashStore, useMoney } from '@/store';

export interface TxRowProps {
  tx: TxView;
  testID?: string;
}

/** Linha de lançamento: ícone de categoria 40px, título, meta, valor. Toque abre para editar. */
export function TxRow({ tx, testID }: TxRowProps) {
  const { colors } = useTheme();
  const money = useMoney();
  const openTransaction = useKashStore((s) => s.openTransaction);
  // conta compartilhada: "casal" ou o nome de quem lançou (pessoal da outra pessoa)
  const owner = useKashStore((s) => {
    const people = householdPeople(s.household, s.userId);
    if (!people.active) return '';
    const raw = s.txs.find((t) => t.id === tx.id);
    return raw ? ownerLabel(raw, s.userId, people.partner?.name ?? null) : '';
  });
  const meta = owner ? `${tx.meta} · ${owner}` : tx.meta;
  return (
    <Pressable
      onPress={() => openTransaction(tx.id)}
      testID={testID}
      pressedOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`${tx.title}, ${tx.kind === 'transfer' ? '' : tx.isExpense ? 'menos ' : 'mais '}${formatBRL(tx.amount)}, ${meta}`}
      accessibilityHint="Abre o lançamento para editar"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line }}
    >
      <TileIcon initial={tx.initial} color={tx.color} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text variant="title" numberOfLines={1}>
          {tx.title}
        </Text>
        <Text variant="meta" color="muted" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <Text variant="value" color={tx.kind === 'transfer' ? 'muted' : tx.isExpense ? 'text' : 'accentText'}>
        {tx.kind === 'transfer' ? '' : tx.isExpense ? '− ' : '+ '}
        {money(tx.amount)}
      </Text>
    </Pressable>
  );
}
