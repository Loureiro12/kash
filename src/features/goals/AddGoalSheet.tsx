import React, { useMemo, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import { BottomSheet, Button, Input, Pressable, Text, accountColors, useTheme } from '@/design-system';
import { formatBRL, parseMoneyInput } from '@/domain/money';
import { goalProgress } from '@/domain/selectors/goals';
import { useKashStore } from '@/store';

/** Sheet — Nova meta: nome, valor, já guardado, aporte mensal (prévia do prazo) e cor. */
export function AddGoalSheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'addGoal');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const closeSheet = useKashStore((s) => s.closeSheet);
  return <AddGoalForm key={nonce} visible={visible} onClose={closeSheet} />;
}

function AddGoalForm({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const addGoal = useKashStore((s) => s.addGoal);
  const showToast = useKashStore((s) => s.showToast);

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [monthly, setMonthly] = useState('');
  const [colorIdx, setColorIdx] = useState(1);
  const targetRef = useRef<TextInput>(null);

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
    addGoal({ name, target: targetN, saved: savedN, monthly: monthlyN, color });
    showToast(`Meta “${name.trim()}” criada`);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Nova meta"
      testID="sheet-add-goal"
      footer={<Button label="Criar meta" onPress={onSave} disabled={!canSave} testID="add-goal-save" haptic="medium" />}
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
