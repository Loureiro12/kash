import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { Card, Icon, PageHeader, Pressable, Screen, Text, useTheme } from '@/design-system';
import { useCategoriesWithUsage, useKashStore } from '@/store';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Perfil › Categorias — lista, cria e abre a edição de cada categoria. */
export function CategoriesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const categories = useCategoriesWithUsage();
  const openSheet = useKashStore((s) => s.openSheet);
  const openEdit = useKashStore((s) => s.openEdit);

  return (
    <Screen testID="categories-screen" header={<PageHeader title="Categorias" onBack={() => router.back()} testID="categories" />}>
      <Text variant="body" color="muted">
        Organize seus gastos do seu jeito. Toque numa categoria pra mudar nome e cor ou excluir.
      </Text>
      <Card padding={0} style={{ marginTop: 18, overflow: 'hidden' }}>
        {categories.map((c, i) => {
          const parts = [c.usage.txs ? plural(c.usage.txs, 'lançamento', 'lançamentos') : '', c.usage.bills ? plural(c.usage.bills, 'conta fixa', 'contas fixas') : ''].filter(Boolean);
          return (
            <Pressable
              key={c.id}
              onPress={() => openEdit({ kind: 'category', id: c.id })}
              testID={`category-${c.name}`}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}. ${parts.join(', ') || 'sem uso'}. Toque para editar`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: i < categories.length - 1 ? 1 : 0, borderBottomColor: colors.line }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.color, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="bodyBold" style={{ color: '#0B0C0E' }}>
                  {c.name[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="title" numberOfLines={1}>
                  {c.name}
                </Text>
                <Text variant="meta" color="muted" numberOfLines={1}>
                  {parts.join(' · ') || 'Sem uso'}
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.muted} />
            </Pressable>
          );
        })}
      </Card>
      <Pressable
        onPress={() => openSheet('category')}
        testID="categories-add"
        accessibilityRole="button"
        accessibilityLabel="Nova categoria"
        style={{ marginTop: 14, height: 52, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text variant="bodySemibold" color="muted">
          + Nova categoria
        </Text>
      </Pressable>
    </Screen>
  );
}
