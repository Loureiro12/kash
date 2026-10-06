import React, { useMemo, useRef, useState } from 'react';
import { Alert, View, type TextInput } from 'react-native';
import { ScrollView } from 'react-native';
import { BottomSheet, Button, Chip, Input, Pressable, Text, accountColors, useTheme } from '@/design-system';
import { parseMoneyInput } from '@/domain/money';
import { goalProgress } from '@/domain/selectors/goals';
import { useKashStore } from '@/store';

/** Sheet — Nova meta: nome, valor, já guardado, aporte mensal (prévia do prazo) e cor. */
export function AddGoalSheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'addGoal');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const editingId = useKashStore((s) => (s.ui.editing?.kind === 'goal' ? s.ui.editing.id : null));
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <AddGoalForm key={`${nonce}-${editingId ?? 'new'}`} visible={visible} editingId={editingId} onClose={closeSheet} />;
}

const money = (n: number) => String(n).replace('.', ',');

function AddGoalForm({ visible, editingId, onClose }: { visible: boolean; editingId: string | null; onClose: () => void }) {
  const { colors } = useTheme();
  const editing = useKashStore((s) => (editingId ? (s.goals.find((g) => g.id === editingId) ?? null) : null));
  const addGoal = useKashStore((s) => s.addGoal);
  const updateGoal = useKashStore((s) => s.updateGoal);
  const removeGoal = useKashStore((s) => s.removeGoal);
  const showToast = useKashStore((s) => s.showToast);
  const accounts = useKashStore((s) => s.accounts);

  const [name, setName] = useState(editing?.name ?? '');
  const [target, setTarget] = useState(editing ? money(editing.target) : '');
  const [saved, setSaved] = useState(editing ? money(editing.saved) : '');
  const [monthly, setMonthly] = useState(editing ? money(editing.monthly) : '');
  const [colorIdx, setColorIdx] = useState(editing ? Math.max(0, accountColors.findIndex((c) => c === editing.color)) : 1);
  const [accountId, setAccountId] = useState(editing?.accountId ?? accounts[0]?.id ?? '');
  const [depositDay, setDepositDay] = useState(editing?.depositDay ? String(editing.depositDay) : '');
  const targetRef = useRef<TextInput>(null);
  const dayN = parseInt(depositDay, 10);
  const depositDayN = Number.isFinite(dayN) && dayN >= 1 && dayN <= 31 ? dayN : null;

  const targetN = parseMoneyInput(target);
  const savedN = parseMoneyInput(saved);
  const monthlyN = parseMoneyInput(monthly);
  const canSave = name.trim().length > 0 && targetN > 0;
  const color = accountColors[colorIdx] ?? accountColors[0];

  // prévia do prazo com as mesmas regras da tela de Metas
  const preview = useMemo(() => {
    if (targetN <= 0) return null;
    const p = goalProgress({ id: 'preview', name, target: targetN, saved: Math.min(savedN, targetN), monthly: monthlyN, color });
    if (p.done) return 'Meta batida!';
    if (monthlyN <= 0) return 'Informe um aporte mensal pra ver o prazo';
    return p.eta;
  }, [name, targetN, savedN, monthlyN, color]);

  const onSave = () => {
    if (!canSave) return;
    const input = { name, target: targetN, saved: savedN, monthly: monthlyN, color, accountId: accountId || undefined, depositDay: depositDayN };
    if (editing) {
      updateGoal(editing.id, input);
      showToast('Meta atualizada');
      return;
    }
    addGoal(input);
    showToast(`Meta “${name.trim()}” criada`);
  };

  const onDelete = () => {
    if (!editing) return;
    Alert.alert('Excluir meta?', 'O dinheiro guardado continua na sua conta; só a meta some.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => { removeGoal(editing.id); showToast(`Meta “${editing.name}” excluída`); } },
    ]);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Editar meta' : 'Nova meta'}
      testID="sheet-add-goal"
      footer={
        <>
          <Button label={editing ? 'Salvar alterações' : 'Criar meta'} onPress={onSave} disabled={!canSave} testID="add-goal-save" haptic="medium" />
          {editing ? <Button label="Excluir meta" variant="dangerSoft" size="md" onPress={onDelete} testID="add-goal-delete" /> : null}
        </>
      }
    >
      <Input
        placeholder="Nome da meta (ex.: Viagem pra praia)"
        value={name}
        onChangeText={setName}
        testID="add-goal-name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => targetRef.current?.focus()}
      />
      <Input ref={targetRef} label="Valor da meta" labelSize="sm" placeholder="R$ 0,00" value={target} onChangeText={setTarget} keyboardType="decimal-pad" testID="add-goal-target" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Input containerStyle={{ flex: 1 }} label="Já guardado" labelSize="sm" placeholder="R$ 0,00" value={saved} onChangeText={setSaved} keyboardType="decimal-pad" testID="add-goal-saved" />
        <Input containerStyle={{ flex: 1 }} label="Guardar por mês" labelSize="sm" placeholder="R$ 0,00" value={monthly} onChangeText={setMonthly} keyboardType="decimal-pad" testID="add-goal-monthly" />
      </View>
      {preview ? (
        <Text variant="meta" color={preview === 'Meta batida!' ? 'accentText' : 'muted'} testID="add-goal-eta">
          {preview}
        </Text>
      ) : null}
      <Input
        label="Dia do depósito (opcional)"
        labelSize="sm"
        placeholder="ex.: 10"
        value={depositDay}
        onChangeText={(v) => setDepositDay(v.replace(/\D/g, '').slice(0, 2))}
        keyboardType="number-pad"
        testID="add-goal-day"
      />
      <Text variant="metaMedium" color="muted">
        Onde o dinheiro fica guardado
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
        {accounts.map((a) => (
          <Chip key={a.id} label={a.name} tone="soft" shape="rounded" height={34} selected={accountId === a.id} onPress={() => setAccountId(a.id)} testID={`add-goal-account-${a.id}`} />
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text variant="metaMedium" color="muted" style={{ marginRight: 4 }}>
          Cor
        </Text>
        {accountColors.map((c, i) => (
          <Pressable
            key={c}
            onPress={() => setColorIdx(i)}
            testID={`add-goal-color-${i}`}
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
