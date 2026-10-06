import React, { useMemo, useState } from 'react';
import { Keyboard, ScrollView, View } from 'react-native';
import { BottomSheet, Button, Chip, Input, Keypad, Pressable, Text, categoryColors, useTheme, type KeypadKey } from '@/design-system';
import { applyKeypadKey, digitsToAmount, formatBRL } from '@/domain/money';
import { installmentPreview } from '@/domain/selectors/cards';
import { CATEGORIES, isCardId, type Category } from '@/domain/types';
import { now } from '@/lib/clock';
import { useKashStore, useSourceOptions } from '@/store';

const MAX_INSTALLMENTS = 24;

/** Sheet — Lançar gasto. O formulário é remontado a cada abertura (key = sheetNonce). */
export function ExpenseSheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'expense');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <ExpenseForm key={nonce} visible={visible} onClose={closeSheet} />;
}

function ExpenseForm({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const addExpense = useKashStore((s) => s.addExpense);
  const showToast = useKashStore((s) => s.showToast);
  const sources = useSourceOptions();

  const [digits, setDigits] = useState('');
  const [category, setCategory] = useState<Category>('Comida');
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [installments, setInstallments] = useState(1);

  const amount = digitsToAmount(digits);
  const canSave = amount > 0;
  const srcIsCard = isCardId(sourceId);
  const n = srcIsCard ? installments : 1;
  const preview = useMemo(() => installmentPreview(amount, n, now()), [amount, n]);

  const onKey = (key: KeypadKey) => {
    Keyboard.dismiss(); // teclado do sistema (descrição) não deve competir com o keypad
    setDigits((d) => applyKeypadKey(d, key));
  };

  const onSave = () => {
    if (!canSave) return;
    Keyboard.dismiss();
    addExpense({ amountCents: Math.round(amount * 100), category, sourceId, note, installments: n });
    showToast(n > 1 ? `${n}x de ${formatBRL(preview.per)} no cartão` : `${formatBRL(amount)} lançado em ${category}`);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Lançar gasto"
      testID="sheet-expense"
      gap={16}
      footer={<Button label="Salvar gasto" onPress={onSave} disabled={!canSave} testID="expense-save" haptic="medium" />}
    >
      <View style={{ alignItems: 'center', paddingVertical: 6 }}>
        <Text variant="amountSheet" color={canSave ? 'text' : 'muted'} testID="expense-amount">
          {formatBRL(amount)}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} dotColor={categoryColors[c]} selected={category === c} onPress={() => setCategory(c)} testID={`chip-cat-${c}`} />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
        {sources.map((s) => (
          <Chip key={s.id} label={s.label} tone="soft" shape="rounded" height={34} selected={sourceId === s.id} onPress={() => setSourceId(s.id)} testID={`chip-src-${s.id}`} />
        ))}
      </ScrollView>

      <Input height={46} placeholder="Descrição (ex.: lanche com a galera)" value={note} onChangeText={setNote} testID="expense-note" returnKeyType="done" />

      {srcIsCard ? (
        <View
          testID="expense-installments"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 50, paddingLeft: 14, paddingRight: 6, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}
        >
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Text variant="bodySemibold" testID="expense-installments-label">
              {n === 1 ? 'À vista' : `${n}x de ${formatBRL(preview.per)}`}
            </Text>
            <Text variant="micro" color="muted" numberOfLines={1}>
              {n === 1 ? 'Toque em + para parcelar' : `Última parcela em ${preview.lastMonth} · total ${formatBRL(amount)}`}
            </Text>
          </View>
          <StepButton label="−" onPress={() => setInstallments((v) => Math.max(1, v - 1))} testID="expense-inst-dec" accessibilityLabel="Menos parcelas" />
          <Text variant="value" style={{ minWidth: 30, textAlign: 'center' }} testID="expense-inst-n">
            {n}x
          </Text>
          <StepButton label="+" onPress={() => setInstallments((v) => Math.min(MAX_INSTALLMENTS, v + 1))} testID="expense-inst-inc" accessibilityLabel="Mais parcelas" />
        </View>
      ) : null}

      <Keypad onKey={onKey} />
    </BottomSheet>
  );
}

function StepButton({ label, onPress, testID, accessibilityLabel }: { label: string; onPress: () => void; testID: string; accessibilityLabel: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text variant="key" style={{ fontSize: 18 }}>
        {label}
      </Text>
    </Pressable>
  );
}
