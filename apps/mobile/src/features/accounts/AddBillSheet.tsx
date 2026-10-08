import React, { useRef, useState } from 'react';
import { Alert, ScrollView, View, type TextInput } from 'react-native';
import { BottomSheet, Button, Chip, Input, MoneyInput, Text } from '@/design-system';
import { type Category } from '@kash/domain';
import { useCategories, useKashStore, useSourceOptions } from '@/store';

/** Sheet — Nova conta fixa: nome, valor, dia, categoria e onde é cobrada (cartão ou conta). */
export function AddBillSheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'addBill');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const editingId = useKashStore((s) => (s.ui.editing?.kind === 'bill' ? s.ui.editing.id : null));
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <AddBillForm key={`${nonce}-${editingId ?? 'new'}`} visible={visible} editingId={editingId} onClose={closeSheet} />;
}

function AddBillForm({ visible, editingId, onClose }: { visible: boolean; editingId: string | null; onClose: () => void }) {
  const editing = useKashStore((s) => (editingId ? (s.bills.find((b) => b.id === editingId) ?? null) : null));
  const addBill = useKashStore((s) => s.addBill);
  const updateBill = useKashStore((s) => s.updateBill);
  const removeBill = useKashStore((s) => s.removeBill);
  const showToast = useKashStore((s) => s.showToast);
  const sources = useSourceOptions();

  const [name, setName] = useState(editing?.name ?? '');
  const [amountN, setAmount] = useState(editing?.amount ?? 0);
  const [day, setDay] = useState(editing ? String(editing.dueDay) : '');
  const { names: categoryNames, colors: categoryColorsMap } = useCategories();
  const [category, setCategory] = useState<Category>(editing?.category ?? (categoryNames.includes('Assinaturas') ? 'Assinaturas' : (categoryNames[0] ?? 'Outros')));
  const [sourceId, setSourceId] = useState(editing?.sourceId ?? sources[0]?.id ?? '');
  const amountRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);

  const dayN = parseInt(day, 10);
  const validDay = Number.isFinite(dayN) && dayN >= 1 && dayN <= 31;
  const canSave = name.trim().length > 0 && amountN > 0 && validDay;

  const onSave = () => {
    if (!canSave) return;
    const input = { name, amount: amountN, dueDay: dayN, category, sourceId: sourceId || undefined };
    if (editing) {
      updateBill(editing.id, input);
      showToast('Conta fixa atualizada');
      return;
    }
    addBill(input);
    showToast(`Conta fixa “${name.trim()}” adicionada`);
  };

  const onDelete = () => {
    if (!editing) return;
    Alert.alert('Excluir conta fixa?', 'Ela some das próximas contas e da previsão. Pagamentos já registrados continuam nos lançamentos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => { removeBill(editing.id); showToast(`Conta fixa “${editing.name}” excluída`); } },
    ]);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Editar conta fixa' : 'Nova conta fixa'}
      testID="sheet-add-bill"
      footer={
        <>
          <Button label={editing ? 'Salvar alterações' : 'Adicionar conta fixa'} onPress={onSave} disabled={!canSave} testID="add-bill-save" haptic="medium" />
          {editing ? <Button label="Excluir conta fixa" variant="dangerSoft" size="md" onPress={onDelete} testID="add-bill-delete" /> : null}
        </>
      }
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
        {categoryNames.map((c) => (
          <Chip key={c} label={c} dotColor={categoryColorsMap[c]} selected={category === c} onPress={() => setCategory(c)} testID={`add-bill-cat-${c}`} />
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
        <MoneyInput ref={amountRef} containerStyle={{ flex: 1 }} label="Valor" labelSize="sm" value={amountN} onChangeValue={setAmount} testID="add-bill-amount" />
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
