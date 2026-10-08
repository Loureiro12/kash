import { categoryUsage, validateCategoryName } from '@kash/domain';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { BottomSheet, Button, Chip, colorSuggestions, ColorPickerModal, CustomColorSwatch, Input, Pressable, Text, useTheme } from '@/design-system';
import { useKashStore } from '@/store';

/** Sheet — nova categoria / editar / excluir (com "mover para" quando está em uso). */
export function CategorySheet() {
  const visible = useKashStore((s) => s.ui.sheet === 'category');
  const nonce = useKashStore((s) => s.ui.sheetNonce);
  const editingId = useKashStore((s) => (s.ui.editing?.kind === 'category' ? s.ui.editing.id : null));
  return <CategoryForm key={nonce} visible={visible} editingId={editingId} />;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function describeUsage(u: { txs: number; bills: number; plans: number }) {
  return [u.txs ? plural(u.txs, 'lançamento', 'lançamentos') : '', u.bills ? plural(u.bills, 'conta fixa', 'contas fixas') : '', u.plans ? plural(u.plans, 'parcelamento', 'parcelamentos') : ''].filter(Boolean).join(', ');
}

function CategoryForm({ visible, editingId }: { visible: boolean; editingId: string | null }) {
  const { colors } = useTheme();
  const categories = useKashStore((s) => s.categories);
  const txs = useKashStore((s) => s.txs);
  const bills = useKashStore((s) => s.bills);
  const plans = useKashStore((s) => s.plans);
  const closeSheet = useKashStore((s) => s.closeSheet);
  const addCategory = useKashStore((s) => s.addCategory);
  const updateCategory = useKashStore((s) => s.updateCategory);
  const removeCategory = useKashStore((s) => s.removeCategory);
  const showToast = useKashStore((s) => s.showToast);

  const editing = categories.find((c) => c.id === editingId) ?? null;
  // cor inicial: a da categoria ou a primeira sugestão ainda não usada
  const firstFree = colorSuggestions.find((c) => !categories.some((cat) => cat.color === c)) ?? colorSuggestions[0];
  const [name, setName] = useState(editing?.name ?? '');
  const [color, setColor] = useState<string>(editing?.color ?? firstFree);
  const [touched, setTouched] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const others = categories.filter((c) => c.id !== editing?.id);
  const [moveTo, setMoveTo] = useState(others.find((c) => c.name === 'Outros')?.name ?? others[0]?.name ?? '');

  const isSuggestion = (colorSuggestions as readonly string[]).includes(color);
  const error = validateCategoryName(name, categories, editing?.id);
  const usage = editing ? categoryUsage(editing.name, { txs, bills, plans }) : null;
  const canDelete = !!editing && categories.length > 1;

  const onSave = () => {
    setTouched(true);
    if (error) return;
    const input = { name: name.trim(), color };
    if (editing) {
      updateCategory(editing.id, input);
      showToast(editing.name !== input.name && usage?.total ? `Categoria renomeada · ${describeUsage(usage)} atualizados` : 'Categoria atualizada');
      return;
    }
    addCategory(input);
    showToast(`Categoria “${input.name}” criada`);
  };

  const onDelete = () => {
    if (!editing) return;
    if (!usage?.total) {
      Alert.alert('Excluir categoria?', `“${editing.name}” não está em uso.`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            removeCategory(editing.id);
            showToast(`Categoria “${editing.name}” excluída`);
          },
        },
      ]);
      return;
    }
    setDeleting(true);
  };

  const confirmDeleteAndMove = () => {
    if (!editing || !moveTo) return;
    removeCategory(editing.id, moveTo);
    showToast(`“${editing.name}” excluída · ${describeUsage(usage!)} foram para ${moveTo}`);
  };

  if (deleting && editing && usage) {
    return (
      <BottomSheet
        visible={visible}
        onClose={closeSheet}
        title={`Excluir “${editing.name}”`}
        testID="sheet-category"
        footer={
          <>
            <Button label={`Excluir e mover para ${moveTo}`} variant="dangerSoft" onPress={confirmDeleteAndMove} disabled={!moveTo} testID="category-delete-confirm" haptic="medium" />
            <Button label="Voltar" variant="secondary" size="md" onPress={() => setDeleting(false)} testID="category-delete-back" />
          </>
        }
      >
        <Text variant="body" color="muted" testID="category-delete-usage">
          Ela está em {describeUsage(usage)}. Escolha para qual categoria eles vão:
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {others.map((c) => (
            <Chip key={c.id} label={c.name} dotColor={c.color} selected={moveTo === c.name} onPress={() => setMoveTo(c.name)} testID={`category-move-${c.name}`} />
          ))}
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={closeSheet}
      title={editing ? 'Editar categoria' : 'Nova categoria'}
      testID="sheet-category"
      footer={
        <>
          <Button label={editing ? 'Salvar' : 'Criar categoria'} onPress={onSave} disabled={touched && !!error} testID="category-save" haptic="medium" />
          {canDelete ? <Button label="Excluir categoria" variant="dangerSoft" size="md" onPress={onDelete} testID="category-delete" /> : null}
        </>
      }
    >
      <View style={{ alignItems: 'flex-start' }} testID="category-preview">
        <Chip label={name.trim() || 'Nome da categoria'} dotColor={color} selected={false} />
      </View>
      <Input
        label="Nome"
        labelSize="sm"
        placeholder="ex.: Pets, Academia, Presentes"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setTouched(true);
        }}
        maxLength={24}
        autoCapitalize="sentences"
        returnKeyType="done"
        onSubmitEditing={onSave}
        error={touched ? error : null}
        testID="category-name"
      />
      <Text variant="microMedium" color="muted" style={{ paddingLeft: 4 }}>
        Cor
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }} accessibilityRole="radiogroup">
        {colorSuggestions.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            testID={`category-color-${c.slice(1)}`}
            haptic="selection"
            accessibilityRole="radio"
            accessibilityState={{ selected: color === c }}
            accessibilityLabel={`Cor ${c}`}
            style={{ padding: 3, borderRadius: 20, borderWidth: 2, borderColor: color === c ? colors.text : 'transparent' }}
          >
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c }} />
          </Pressable>
        ))}
        <CustomColorSwatch color={isSuggestion ? null : color} selected={!isSuggestion} size={28} onPress={() => setPickerOpen(true)} testID="category-color-custom" />
      </View>
      {editing && usage && usage.total > 0 ? (
        <Text variant="meta" color="muted" testID="category-usage">
          Em uso: {describeUsage(usage)}. Renomear atualiza todos.
        </Text>
      ) : null}
      <ColorPickerModal
        visible={pickerOpen}
        initialColor={color}
        title="Cor da categoria"
        onCancel={() => setPickerOpen(false)}
        onConfirm={(hex) => {
          setColor(hex);
          setPickerOpen(false);
        }}
        testID="category-color-picker"
      />
    </BottomSheet>
  );
}
