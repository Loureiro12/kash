import { validateCategoryName } from '@kash/domain';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, colorSuggestions, IconButton, Input, Pressable, radii, useTheme } from '@/design-system';
import { useKashStore } from '@/store';

/**
 * Criar categoria sem sair do lançamento: nome + cor (já vem uma cor ainda não usada) e "Criar".
 * A categoria nova é devolvida em `onCreated` para o sheet já selecioná-la.
 */
export function NewCategoryInline({ onCreated, onCancel }: { onCreated: (name: string) => void; onCancel: () => void }) {
  const { colors } = useTheme();
  const categories = useKashStore((s) => s.categories);
  const addCategory = useKashStore((s) => s.addCategory);
  const showToast = useKashStore((s) => s.showToast);
  const firstFree = colorSuggestions.find((c) => !categories.some((cat) => cat.color === c)) ?? colorSuggestions[0];
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(firstFree);
  const [touched, setTouched] = useState(false);
  const error = validateCategoryName(name, categories);

  const create = () => {
    setTouched(true);
    if (error) return;
    const clean = name.trim();
    addCategory({ name: clean, color }, { keepSheet: true });
    showToast(`Categoria “${clean}” criada`);
    onCreated(clean);
  };

  return (
    <View style={{ gap: 10, padding: 12, borderRadius: radii.input, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }} testID="new-category">
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <Input
          containerStyle={{ flex: 1, minWidth: 0 }}
          height={46}
          autoFocus
          placeholder="Nome da nova categoria"
          value={name}
          onChangeText={setName}
          maxLength={24}
          returnKeyType="done"
          onSubmitEditing={create}
          error={touched ? error : null}
          autoCapitalize="sentences"
          testID="new-category-name"
        />
        <IconButton icon="close" size={40} subtle onPress={onCancel} accessibilityLabel="Cancelar nova categoria" testID="new-category-cancel" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled" accessibilityRole="radiogroup">
        {colorSuggestions.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            haptic="selection"
            accessibilityRole="radio"
            accessibilityState={{ selected: color === c }}
            accessibilityLabel={`Cor ${c}`}
            testID={`new-category-color-${c.slice(1)}`}
            style={{ padding: 2, borderRadius: 16, borderWidth: 2, borderColor: color === c ? colors.text : 'transparent' }}
          >
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c }} />
          </Pressable>
        ))}
      </ScrollView>
      <Button label="Criar categoria" size="sm" onPress={create} disabled={!name.trim()} testID="new-category-save" />
    </View>
  );
}
