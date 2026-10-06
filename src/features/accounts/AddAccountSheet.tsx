import React, { useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import { BottomSheet, Button, Chip, Input, Pressable, Text, accountColors, useTheme } from '@/design-system';
import { parseMoneyInput } from '@/domain/money';
import { ACCOUNT_KINDS, type AccountKind } from '@/domain/types';
import { useKashStore } from '@/store';

/** Sheet — Nova conta bancária. */
export function AddAccountSheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'addAccount');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <AddAccountForm key={nonce} visible={visible} onClose={closeSheet} />;
}

function AddAccountForm({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const addAccount = useKashStore((s) => s.addAccount);
  const showToast = useKashStore((s) => s.showToast);

  const [kind, setKind] = useState<AccountKind>('Conta corrente');
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [balance, setBalance] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const bankRef = useRef<TextInput>(null);
  const balanceRef = useRef<TextInput>(null);

  const canSave = name.trim().length > 0;
  const onSave = () => {
    if (!canSave) return;
    addAccount({ name, kind, bank, balance: parseMoneyInput(balance), color: accountColors[colorIdx] ?? accountColors[0] });
    showToast(`Conta “${name.trim()}” adicionada`);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Nova conta"
      testID="sheet-add-account"
      footer={<Button label="Adicionar conta" onPress={onSave} disabled={!canSave} testID="add-account-save" haptic="medium" />}
    >
      <Text variant="metaMedium" color="muted">
        Tipo de conta
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {ACCOUNT_KINDS.map((k) => (
          <Chip key={k} label={k} selected={kind === k} onPress={() => setKind(k)} testID={`add-account-kind-${k}`} />
        ))}
      </View>
      <Input placeholder="Apelido (ex.: Conta do estágio)" value={name} onChangeText={setName} testID="add-account-name" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => bankRef.current?.focus()} />
      <Input ref={bankRef} placeholder="Banco ou instituição" value={bank} onChangeText={setBank} testID="add-account-bank" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => balanceRef.current?.focus()} />
      <Input ref={balanceRef} label="Saldo atual" labelSize="sm" placeholder="R$ 0,00" value={balance} onChangeText={setBalance} keyboardType="decimal-pad" testID="add-account-balance" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text variant="metaMedium" color="muted" style={{ marginRight: 4 }}>
          Cor
        </Text>
        {accountColors.map((c, i) => (
          <Pressable
            key={c}
            onPress={() => setColorIdx(i)}
            testID={`add-account-color-${i}`}
            haptic="selection"
            accessibilityRole="radio"
            accessibilityState={{ selected: i === colorIdx }}
            accessibilityLabel={`Cor ${i + 1}`}
            style={{ padding: 3, borderRadius: 20, borderWidth: 2, borderColor: i === colorIdx ? colors.text : 'transparent' }}
          >
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c }} />
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}
