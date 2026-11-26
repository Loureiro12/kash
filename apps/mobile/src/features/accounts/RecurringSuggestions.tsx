import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectRecurring, formatBRL, recurringSuggestions, type RecurringCharge } from '@kash/domain';
import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { create } from 'zustand';
import { Badge, Button, Card, Icon, Text, useTheme } from '@/design-system';
import { now } from '@/lib/clock';
import { useCategories, useKashStore } from '@/store';

/** "netflix.com" → "netflix-com" (testID em kebab-case) */
const slug = (key: string) => key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** cobranças que a pessoa mandou ignorar (por pessoa, neste aparelho) */
const dismissedKey = (userId: string) => `kash.recurring.dismissed.${userId}`;

interface DismissedState {
  userId: string | null;
  keys: Set<string>;
  load: (userId: string) => Promise<void>;
  dismiss: (key: string) => void;
}

export const useDismissedRecurring = create<DismissedState>((set, get) => ({
  userId: null,
  keys: new Set(),
  load: async (userId) => {
    if (get().userId === userId) return;
    try {
      const raw = await AsyncStorage.getItem(dismissedKey(userId));
      const list = raw ? (JSON.parse(raw) as unknown) : [];
      set({ userId, keys: new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []) });
    } catch {
      set({ userId, keys: new Set() });
    }
  },
  dismiss: (key) => {
    const { userId, keys } = get();
    const next = new Set(keys).add(key);
    set({ keys: next });
    if (userId) void AsyncStorage.setItem(dismissedKey(userId), JSON.stringify([...next])).catch(() => undefined);
  },
}));

/** assinaturas/cobranças recorrentes que ainda não são conta fixa nem foram ignoradas */
export function useRecurringSuggestions(): RecurringCharge[] {
  const userId = useKashStore((s) => s.userId) ?? 'anon';
  const txs = useKashStore((s) => s.txs);
  const bills = useKashStore((s) => s.bills);
  const ready = useKashStore((s) => s.ui.dataStatus === 'ready');
  const dismissed = useDismissedRecurring((s) => s.keys);
  const loadedFor = useDismissedRecurring((s) => s.userId);
  useEffect(() => {
    void useDismissedRecurring.getState().load(userId);
  }, [userId]);
  return useMemo(() => (ready && loadedFor === userId ? recurringSuggestions(detectRecurring(txs, bills, now()), dismissed) : []), [ready, loadedFor, userId, txs, bills, dismissed]);
}

/**
 * Contas › Fixas: "Encontramos cobranças que se repetem". Virar conta fixa põe a cobrança nos
 * lembretes e na previsão; se a deste mês já foi lançada, a conta nasce paga, ligada a ela.
 */
export function RecurringSuggestions() {
  const { colors } = useTheme();
  const suggestions = useRecurringSuggestions();
  const addBill = useKashStore((s) => s.addBill);
  const showToast = useKashStore((s) => s.showToast);
  const { names } = useCategories();
  const dismiss = useDismissedRecurring((s) => s.dismiss);
  if (suggestions.length === 0) return null;

  const yearly = suggestions.reduce((a, c) => a + c.yearly, 0);
  const convert = (c: RecurringCharge) => {
    addBill({ name: c.title, amount: c.amount, dueDay: c.dueDay, category: names.includes(c.category) ? c.category : 'Outros', sourceId: c.sourceId, ...(c.thisMonthTxId ? { linkTxId: c.thisMonthTxId } : {}) });
    showToast(c.thisMonthTxId ? `${c.title} virou conta fixa (já paga este mês)` : `${c.title} virou conta fixa: lembrete antes do dia ${c.dueDay}`);
  };
  const ignore = (c: RecurringCharge) => {
    dismiss(c.key);
    showToast(`${c.title} não aparece mais aqui`);
  };

  return (
    <Card radius="card" padding={16} style={{ marginTop: 18, gap: 14, borderWidth: 1, borderColor: colors.accentText }} testID="recurring-suggestions">
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Icon name="sparkles" size={18} color={colors.accentText} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="titleBold" testID="recurring-title">
            {suggestions.length === 1 ? 'Encontramos uma cobrança que se repete' : `Encontramos ${suggestions.length} cobranças que se repetem`}
          </Text>
          <Text variant="meta" color="muted">
            Juntas, dão {formatBRL(yearly)} por ano. Virando conta fixa, entram nos lembretes e na previsão.
          </Text>
        </View>
      </View>
      {suggestions.map((c) => (
        <View key={c.key} style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line }} testID={`recurring-${slug(c.key)}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text variant="title" numberOfLines={1}>
                {c.title}
              </Text>
              <Text variant="meta" color="muted" numberOfLines={2} testID={`recurring-${slug(c.key)}-details`}>
                Todo dia {c.dueDay} · {c.months} meses seguidos · {formatBRL(c.yearly)} por ano
              </Text>
            </View>
            <Text variant="valueLg">{formatBRL(c.amount)}</Text>
          </View>
          {c.priceChange ? <Badge label={`Subiu de ${formatBRL(c.priceChange.from)} para ${formatBRL(c.priceChange.to)}`} tone="neg" style={{ alignSelf: 'flex-start' }} testID={`recurring-${slug(c.key)}-raised`} /> : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Virar conta fixa" variant="secondary" size="xs" fullWidth={false} onPress={() => convert(c)} testID={`recurring-${slug(c.key)}-add`} />
            <Button label="Ignorar" variant="ghost" size="xs" fullWidth={false} onPress={() => ignore(c)} testID={`recurring-${slug(c.key)}-ignore`} />
          </View>
        </View>
      ))}
    </Card>
  );
}
