import React, { useRef, useState } from 'react';
import { ScrollView, View, type TextInput } from 'react-native';
import { BottomSheet, Button, Chip, Input, Text, categoryColors } from '@/design-system';
import { parseMoneyInput } from '@/domain/money';
import { CATEGORIES, type Category } from '@/domain/types';
import { useKashStore, useSourceOptions } from '@/store';

/** Sheet — Nova conta fixa: nome, valor, dia, categoria e onde é cobrada (cartão ou conta). */
export function AddBillSheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'addBill');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <AddBillForm key={nonce} visible={visible} onClose={closeSheet} />;
}

function AddBillForm({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const addBill = useKashStore((s) => s.addBill);
  const showToast = useKashStore((s) => s.showToast);
  const sources = useSourceOptions();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [category, setCategory] = useState<Category>('Assinaturas');
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '');
  const amountRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);

  const amountN = parseMoneyInput(amount);
  const dayN = parseInt(day, 10);
  const validDay = Number.isFinite(dayN) && dayN >= 1 && dayN <= 31;
  const canSave = name.trim().length > 0 && amountN > 0 && validDay;

  const onSave = () => {
    if (!canSave) return;
    addBill({ name, amount: amountN, dueDay: dayN, category, sourceId: sourceId || undefined });
    showToast(`Conta fixa “${name.trim()}” adicionada`);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Nova conta fixa"
      testID="sheet-add-bill"
      footer={<Button label="Adicionar conta fixa" onPress={onSave} disabled={!canSave} testID="add-bill-save" haptic="medium" />}
    >
      <Text variant="metaMedium" color="muted">
        Cobrada em
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
        {sources.map((s) => (
          <Chip key={s.id} label={s.label} tone="soft" shape="rounded" height={34} selected={sourceId === s.id} onPress={() => setSourceId(s.id)} testID={`add-bill-src-${s.id}`} />
        ))}
      </ScrollView>
      <Text variant="metaMedium" color="muted">
        Categoria
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} dotColor={categoryColors[c]} selected={category === c} onPress={() => setCategory(c)} testID={`add-bill-cat-${c}`} />
        ))}
      </ScrollView>
      <Input
        placeholder="Nome (ex.: Streaming de vídeo)"
        value={name}
        onChangeText={setName}
        testID="add-bill-name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => amountRef.current?.focus()}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Input ref={amountRef} containerStyle={{ flex: 1 }} label="Valor" labelSize="sm" placeholder="R$ 0,00" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" testID="add-bill-amount" />
        <Input
          ref={dayRef}
          containerStyle={{ flex: 1 }}
          label="Dia do vencimento"
          labelSize="sm"
          placeholder="ex.: 10"
          value={day}
          onChangeText={(v) => setDay(v.replace(/\D/g, '').slice(0, 2))}
          keyboardType="number-pad"
          testID="add-bill-day"
        />
      </View>
    </BottomSheet>
  );
}
