import { activeTravelTag, cleanTag, defaultTravelUntil, formatBRL, relativeDayLabel, tagSummary, TAG_MAX } from '@kash/domain';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Calendar, Card, Chip, Icon, Input, Text, useTheme } from '@/design-system';
import { now } from '@/lib/clock';
import { useKashStore } from '@/store';

/**
 * Modo viagem: enquanto ligado, os lançamentos novos já recebem a tag (ex.: "Viagem Floripa"), até
 * o dia escolhido ou até desligar. `tag` fixa a tag (tela da tag); sem ela, a pessoa digita o nome.
 */
export function TravelModeCard({ tag: fixedTag }: { tag?: string }) {
  const { colors } = useTheme();
  const settings = useKashStore((s) => s.settings);
  const txs = useKashStore((s) => s.txs);
  const setTravelMode = useKashStore((s) => s.setTravelMode);
  const showToast = useKashStore((s) => s.showToast);
  const today = now();
  const active = activeTravelTag(settings, today);
  const [name, setName] = useState(fixedTag ?? '');
  const [untilMode, setUntilMode] = useState<'off' | 'date'>('off');
  const [until, setUntil] = useState(defaultTravelUntil(today));

  // ligado (nesta tag, ou em qualquer uma na lista de tags)
  if (active && (!fixedTag || active.toLowerCase() === fixedTag.toLowerCase())) {
    const spent = tagSummary(txs, active)?.spent ?? 0;
    return (
      <Card padding={16} style={{ gap: 10, borderWidth: 1, borderColor: colors.accentText }} testID="travel-active">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="target" size={18} color={colors.accentText} />
          <View style={{ flex: 1 }}>
            <Text variant="titleBold">Modo viagem: {active}</Text>
            <Text variant="meta" color="muted" testID="travel-active-details">
              {formatBRL(spent)} até agora · {settings.travelUntil ? `até ${relativeDayLabel(settings.travelUntil, today).toLowerCase()}` : 'até você desligar'}
            </Text>
          </View>
        </View>
        <Text variant="meta" color="muted">
          Todo lançamento novo já vem com a tag “{active}”. Dá pra tirar na hora de lançar.
        </Text>
        <Button
          label="Encerrar modo viagem"
          variant="secondary"
          size="md"
          onPress={() => {
            setTravelMode(null);
            showToast(`Modo viagem encerrado: ${formatBRL(spent)} em “${active}”`);
          }}
          testID="travel-stop"
        />
      </Card>
    );
  }

  const clean = cleanTag(name);
  return (
    <Card padding={16} style={{ gap: 10 }} testID="travel-start">
      <Text variant="titleBold">{fixedTag ? 'Usar nos próximos lançamentos' : 'Modo viagem'}</Text>
      <Text variant="meta" color="muted">
        {fixedTag ? `Liga o modo viagem: os lançamentos novos já vêm com a tag “${fixedTag}”.` : 'Vai viajar ou tem um evento? Dê um nome e os lançamentos novos já vêm com essa tag. No fim, você vê quanto gastou.'}
      </Text>
      {!fixedTag ? <Input height={46} placeholder="Ex.: Viagem Floripa" value={name} onChangeText={setName} maxLength={TAG_MAX} autoCapitalize="words" testID="travel-name" /> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="Até eu desligar" tone="soft" selected={untilMode === 'off'} onPress={() => setUntilMode('off')} testID="travel-until-off" />
        <Chip label={untilMode === 'date' ? `Até ${relativeDayLabel(until, today).toLowerCase()}` : 'Até um dia'} tone="soft" selected={untilMode === 'date'} onPress={() => setUntilMode('date')} testID="travel-until-date" />
      </View>
      {untilMode === 'date' ? <CalendarFrom value={until} onChange={setUntil} /> : null}
      <Button
        label="Começar"
        size="md"
        disabled={!clean}
        onPress={() => {
          if (!clean) return;
          setTravelMode(clean, untilMode === 'date' ? until : null);
          showToast(`Modo viagem ligado: “${clean}”`);
        }}
        testID="travel-go"
      />
    </Card>
  );
}

/** calendário só com hoje e os dias seguintes (último dia da viagem) */
function CalendarFrom({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const today = now();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return <Calendar value={value} onChange={(iso) => onChange(iso < todayISO ? todayISO : iso)} today={todayISO} min={todayISO} testID="travel-calendar" />;
}
