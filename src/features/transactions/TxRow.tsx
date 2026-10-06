import React from 'react';
import { View } from 'react-native';
import { Text, TileIcon, useTheme } from '@/design-system';
import type { TxView } from '@/domain/selectors/transactions';
import { useMoney } from '@/store';

export interface TxRowProps {
  tx: TxView;
  testID?: string;
}

/** Linha de lançamento: ícone de categoria 40px, título, meta, valor (− / + em verde). */
export function TxRow({ tx, testID }: TxRowProps) {
  const { colors } = useTheme();
  const money = useMoney();
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <TileIcon initial={tx.initial} color={tx.color} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text variant="title" numberOfLines={1}>
          {tx.title}
        </Text>
        <Text variant="meta" color="muted" numberOfLines={1}>
          {tx.meta}
        </Text>
      </View>
      <Text variant="value" color={tx.isExpense ? 'text' : 'accentText'}>
        {tx.isExpense ? '− ' : '+ '}
        {money(tx.amount)}
      </Text>
    </View>
  );
}
