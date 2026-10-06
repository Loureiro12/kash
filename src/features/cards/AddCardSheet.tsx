import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
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
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <AddCardForm key={nonce} visible={visible} onClose={closeSheet} />;
}

function AddCardForm({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const addCard = useKashStore((s) => s.addCard);
  const showToast = useKashStore((s) => s.showToast);

  const [name, setName] = useState('');
  const [last4, setLast4] = useState('');
  const [limit, setLimit] = useState('');
  const [closing, setClosing] = useState('');
  const [due, setDue] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const last4Ref = useRef<TextInput>(null);
  const limitRef = useRef<TextInput>(null);

  const gradient = cardGradients[colorIdx] ?? cardGradients[0]!;
  const limitN = parseMoneyInput(limit);
  const canSave = name.trim().length > 0 && last4.length === 4 && limitN > 0;

  const onSave = () => {
    if (!canSave) return;
    addCard({ name, last4, limit: limitN, closingDay: dayOrNull(closing), dueDay: dayOrNull(due), gradientId: gradient.id });
    showToast(`Cartão “${name.trim()}” adicionado`);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Novo cartão"
      testID="sheet-add-card"
      footer={<Button label="Adicionar cartão" onPress={onSave} disabled={!canSave} testID="add-card-save" haptic="medium" />}
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
