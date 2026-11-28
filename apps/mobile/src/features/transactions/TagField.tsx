import { cleanTag, tagTotals, TAG_MAX } from '@kash/domain';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Chip, IconButton, Input, Text } from '@/design-system';
import { useKashStore } from '@/store';

/**
 * Tag do lançamento ("Viagem Floripa"): chip com a tag escolhida (toque tira) ou "+ Tag", que abre as
 * tags recentes e um campo para criar outra. `travel` marca a tag que veio do modo viagem.
 */
export function TagField({ value, onChange, travel }: { value: string | null; onChange: (tag: string | null) => void; travel?: boolean }) {
  const txs = useKashStore((s) => s.txs);
  const recent = useMemo(() => tagTotals(txs).slice(0, 8).map((t) => t.tag), [txs]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const pick = (tag: string | null) => {
    onChange(tag);
    setOpen(false);
    setDraft('');
  };

  if (!open) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} testID="tag-field">
        {value ? (
          <Chip label={`# ${value}  ✕`} tone="soft" shape="rounded" height={32} selected onPress={() => pick(null)} testID="tag-current" />
        ) : (
          <Chip label="+ Tag" tone="soft" shape="rounded" height={32} onPress={() => setOpen(true)} testID="tag-add" />
        )}
        {value && travel ? (
          <Text variant="micro" color="muted">
            modo viagem
          </Text>
        ) : !value ? (
          <Text variant="micro" color="muted" numberOfLines={1} style={{ flex: 1 }}>
            ex.: uma viagem, um evento, uma reforma
          </Text>
        ) : null}
      </View>
    );
  }

  const clean = cleanTag(draft);
  return (
    <View style={{ gap: 8 }} testID="tag-picker">
      {recent.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
          {recent.map((t) => (
            <Chip key={t} label={`# ${t}`} tone="soft" shape="rounded" height={32} onPress={() => pick(t)} testID={`tag-recent-${t}`} />
          ))}
        </ScrollView>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Input
          containerStyle={{ flex: 1, minWidth: 0 }}
          height={46}
          autoFocus={recent.length === 0}
          placeholder="Nova tag (ex.: Viagem Floripa)"
          value={draft}
          onChangeText={setDraft}
          maxLength={TAG_MAX}
          returnKeyType="done"
          onSubmitEditing={() => clean && pick(clean)}
          autoCapitalize="words"
          testID="tag-input"
        />
        <Button label="Usar" size="sm" fullWidth={false} disabled={!clean} onPress={() => clean && pick(clean)} testID="tag-use" />
        <IconButton icon="close" size={40} subtle onPress={() => setOpen(false)} accessibilityLabel="Cancelar tag" testID="tag-cancel" />
      </View>
    </View>
  );
}
