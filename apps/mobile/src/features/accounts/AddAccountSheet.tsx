import React, { useRef, useState } from 'react';
import { Alert, View, type TextInput } from 'react-native';
import { accountColors, BottomSheet, Button, Chip, ColorPickerModal, CustomColorSwatch, Input, MoneyInput, Pressable, Text, useTheme } from '@/design-system';
import { ACCOUNT_KINDS, type AccountKind } from '@kash/domain';
import { useKashStore } from '@/store';

/** Sheet — Nova conta bancária. */
export function AddAccountSheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'addAccount');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const editingId = useKashStore((s) => (s.ui.editing?.kind === 'account' ? s.ui.editing.id : null));
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <AddAccountForm key={`${nonce}-${editingId ?? 'new'}`} visible={visible} editingId={editingId} onClose={closeSheet} />;
}

const splitKind = (kind: string): { kind: AccountKind; bank: string } => {
  const [k, ...rest] = kind.split(' · ');
  const known = ACCOUNT_KINDS.find((x) => x === k) ?? 'Conta corrente';
  return { kind: known, bank: rest.join(' · ') };
};

function AddAccountForm({ visible, editingId, onClose }: { visible: boolean; editingId: string | null; onClose: () => void }) {
  const { colors } = useTheme();
  const editing = useKashStore((s) => (editingId ? (s.accounts.find((a) => a.id === editingId) ?? null) : null));
  const txCount = useKashStore((s) => (editingId ? s.txs.filter((t) => t.sourceId === editingId).length : 0));
  const addAccount = useKashStore((s) => s.addAccount);
  const updateAccount = useKashStore((s) => s.updateAccount);
  const removeAccount = useKashStore((s) => s.removeAccount);
  const showToast = useKashStore((s) => s.showToast);
  const initial = editing ? splitKind(editing.kind) : null;

  const [kind, setKind] = useState<AccountKind>(initial?.kind ?? 'Conta corrente');
  const [name, setName] = useState(editing?.name ?? '');
  const [bank, setBank] = useState(initial?.bank ?? '');
  const [balance, setBalance] = useState(editing?.balance ?? 0);
  const presetIdx = editing ? accountColors.findIndex((c) => c.toUpperCase() === editing.color.toUpperCase()) : 0;
  const [colorIdx, setColorIdx] = useState(Math.max(0, presetIdx));
  /** cor fora da paleta (inclusive a que já veio do servidor) fica como personalizada */
  const [customColor, setCustomColor] = useState<string | null>(editing && presetIdx < 0 ? editing.color : null);
  const [useCustom, setUseCustom] = useState(!!editing && presetIdx < 0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const bankRef = useRef<TextInput>(null);
  const balanceRef = useRef<TextInput>(null);

  const canSave = name.trim().length > 0;
  const onSave = () => {
    if (!canSave) return;
    const input = { name, kind, bank, balance, color: useCustom && customColor ? customColor : (accountColors[colorIdx] ?? accountColors[0]) };
    if (editing) {
      updateAccount(editing.id, input);
      showToast('Conta atualizada');
      return;
    }
    addAccount(input);
    showToast(`Conta “${name.trim()}” adicionada`);
  };

  const onDelete = () => {
    if (!editing) return;
    Alert.alert('Excluir conta?', txCount ? `Isso apaga ${txCount} lançamento${txCount > 1 ? 's' : ''} desta conta. Não dá pra desfazer.` : 'Não dá pra desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => { removeAccount(editing.id); showToast(`Conta “${editing.name}” excluída`); } },
    ]);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Editar conta' : 'Nova conta'}
      testID="sheet-add-account"
      footer={
        <>
          <Button label={editing ? 'Salvar alterações' : 'Adicionar conta'} onPress={onSave} disabled={!canSave} testID="add-account-save" haptic="medium" />
          {editing ? <Button label="Excluir conta" variant="dangerSoft" size="md" onPress={onDelete} testID="add-account-delete" /> : null}
        </>
      }
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
      <MoneyInput ref={balanceRef} label="Saldo atual" labelSize="sm" value={balance} onChangeValue={setBalance} allowNegative testID="add-account-balance" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text variant="metaMedium" color="muted" style={{ marginRight: 4 }}>
          Cor
        </Text>
        {accountColors.map((c, i) => (
          <Pressable
            key={c}
            onPress={() => {
              setColorIdx(i);
              setUseCustom(false);
            }}
            testID={`add-account-color-${i}`}
            haptic="selection"
            accessibilityRole="radio"
            accessibilityState={{ selected: !useCustom && i === colorIdx }}
            accessibilityLabel={`Cor ${i + 1}`}
            style={{ padding: 3, borderRadius: 20, borderWidth: 2, borderColor: !useCustom && i === colorIdx ? colors.text : 'transparent' }}
          >
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c }} />
          </Pressable>
        ))}
        <CustomColorSwatch color={customColor} selected={useCustom} size={30} onPress={() => setPickerOpen(true)} testID="add-account-color-custom" />
        <ColorPickerModal
          visible={pickerOpen}
          initialColor={customColor ?? accountColors[colorIdx] ?? accountColors[0]}
          title="Cor da conta"
          onCancel={() => setPickerOpen(false)}
          onConfirm={(hex) => {
            setCustomColor(hex);
            setUseCustom(true);
            setPickerOpen(false);
          }}
          testID="account-color-picker"
        />
      </View>
    </BottomSheet>
  );
}
