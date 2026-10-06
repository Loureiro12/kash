import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import { Alert, View, type TextInput } from 'react-native';
import { BottomSheet, Button, CreditCardFace, Input, Pressable, cardGradients, useTheme } from '@/design-system';
import { formatBRL, parseMoneyInput } from '@/domain/money';
import { useKashStore } from '@/store';

const onlyDigits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);
const dayOrNull = (v: string) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 1 && n <= 31 ? n : null;
};

/** Sheet — Novo cartão, com preview ao vivo. */
export function AddCardSheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'addCard');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const editingId = useKashStore((s) => (s.ui.editing?.kind === 'card' ? s.ui.editing.id : null));
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <AddCardForm key={`${nonce}-${editingId ?? 'new'}`} visible={visible} editingId={editingId} onClose={closeSheet} />;
}

function AddCardForm({ visible, editingId, onClose }: { visible: boolean; editingId: string | null; onClose: () => void }) {
  const { colors } = useTheme();
  const editing = useKashStore((s) => (editingId ? (s.cards.find((c) => c.id === editingId) ?? null) : null));
  // seletores primitivos: um objeto novo por render faria o zustand re-renderizar em loop
  const txCount = useKashStore((s) => (editingId ? s.txs.filter((t) => t.sourceId === editingId).length : 0));
  const planCount = useKashStore((s) => (editingId ? s.plans.filter((p) => p.cardId === editingId && p.current < p.installments).length : 0));
  const addCard = useKashStore((s) => s.addCard);
  const updateCard = useKashStore((s) => s.updateCard);
  const removeCard = useKashStore((s) => s.removeCard);
  const showToast = useKashStore((s) => s.showToast);

  const [name, setName] = useState(editing?.name ?? '');
  const [last4, setLast4] = useState(editing?.last4 ?? '');
  const [limit, setLimit] = useState(editing ? String(editing.limit) : '');
  const [closing, setClosing] = useState(editing ? String(editing.closingDay) : '');
  const [due, setDue] = useState(editing ? String(editing.dueDay) : '');
  const [colorIdx, setColorIdx] = useState(editing ? Math.max(0, cardGradients.findIndex((g) => g.id === editing.gradientId)) : 0);
  const last4Ref = useRef<TextInput>(null);
  const limitRef = useRef<TextInput>(null);

  const gradient = cardGradients[colorIdx] ?? cardGradients[0]!;
  const limitN = parseMoneyInput(limit);
  const canSave = name.trim().length > 0 && last4.length === 4 && limitN > 0;

  const onSave = () => {
    if (!canSave) return;
    const input = { name, last4, limit: limitN, closingDay: dayOrNull(closing), dueDay: dayOrNull(due), gradientId: gradient.id };
    if (editing) {
      updateCard(editing.id, input);
      showToast('Cartão atualizado');
      return;
    }
    addCard(input);
    showToast(`Cartão “${name.trim()}” adicionado`);
  };

  const onDelete = () => {
    if (!editing) return;
    const parts = [txCount ? `${txCount} lançamento${txCount > 1 ? 's' : ''}` : '', planCount ? `${planCount} parcelamento${planCount > 1 ? 's' : ''}` : ''].filter(Boolean);
    Alert.alert('Excluir cartão?', parts.length ? `Isso apaga ${parts.join(' e ')} deste cartão. Não dá pra desfazer.` : 'Não dá pra desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => { removeCard(editing.id); showToast(`Cartão “${editing.name}” excluído`); } },
    ]);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Editar cartão' : 'Novo cartão'}
      testID="sheet-add-card"
      footer={
        <>
          <Button label={editing ? 'Salvar alterações' : 'Adicionar cartão'} onPress={onSave} disabled={!canSave} testID="add-card-save" haptic="medium" />
          {editing ? <Button label="Excluir cartão" variant="dangerSoft" size="md" onPress={onDelete} testID="add-card-delete" /> : null}
        </>
      }
    >
      <CreditCardFace
        name={name.trim() || 'Nome do cartão'}
        gradient={gradient.colors}
        ink={gradient.ink}
        caption="Limite"
        amount={limitN > 0 ? formatBRL(limitN) : 'R$ —'}
        last4={last4.padEnd(4, '•')}
        height={150}
        style={{ width: '100%' }}
        testID="add-card-preview"
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {cardGradients.map((g, i) => (
          <Pressable
            key={g.id}
            onPress={() => setColorIdx(i)}
            testID={`add-card-color-${g.id}`}
            haptic="selection"
            accessibilityRole="radio"
            accessibilityState={{ selected: i === colorIdx }}
            accessibilityLabel={`Cor ${g.id}`}
            style={{ padding: 3, borderRadius: 22, borderWidth: 2, borderColor: i === colorIdx ? colors.text : 'transparent' }}
          >
            <LinearGradient colors={[...g.colors]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 34, height: 34, borderRadius: 17 }} />
          </Pressable>
        ))}
      </View>
      <Input placeholder="Nome do cartão (ex.: Cartão da faculdade)" value={name} onChangeText={setName} testID="add-card-name" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => last4Ref.current?.focus()} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Input ref={last4Ref} containerStyle={{ flex: 1 }} placeholder="Últimos 4 dígitos" value={last4} onChangeText={(v) => { const d = onlyDigits(v, 4); setLast4(d); if (d.length === 4) limitRef.current?.focus(); }} keyboardType="number-pad" maxLength={4} testID="add-card-last4" />
        <Input ref={limitRef} containerStyle={{ flex: 1 }} placeholder="Limite (R$)" value={limit} onChangeText={setLimit} keyboardType="decimal-pad" testID="add-card-limit" />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Input containerStyle={{ flex: 1 }} label="Dia do fechamento" labelSize="sm" placeholder="ex.: 28" value={closing} onChangeText={(v) => setClosing(onlyDigits(v, 2))} keyboardType="number-pad" testID="add-card-closing" />
        <Input containerStyle={{ flex: 1 }} label="Dia do vencimento" labelSize="sm" placeholder="ex.: 5" value={due} onChangeText={(v) => setDue(onlyDigits(v, 2))} keyboardType="number-pad" testID="add-card-due" />
      </View>
    </BottomSheet>
  );
}
