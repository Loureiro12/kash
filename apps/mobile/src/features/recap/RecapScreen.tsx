import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { formatMoney, lastClosedMonth, type MonthRecap } from '@kash/domain';
import { Button, Chip, EmptyState, IconButton, PageHeader, Screen, Text, radii, staticColors, useTheme } from '@/design-system';
import { now } from '@/lib/clock';
import { track } from '@/services/telemetry';
import { useKashStore, useMonthRecap } from '@/store';
import { DataGate } from '../navigation/DataGate';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Retrospectiva do mês ("seu outubro"): card no formato de story, para ver e compartilhar como
 * imagem. "Esconder valores" troca os reais por porcentagens antes de postar.
 */
export function RecapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mes?: string }>();
  const latest = lastClosedMonth(now());
  const initial = params.mes && /^\d{4}-\d{2}$/.test(params.mes) && params.mes <= latest ? params.mes : latest;
  const [month, setMonth] = useState(initial);
  const hideByDefault = useKashStore((s) => s.settings.hideValues);
  const [hidden, setHidden] = useState(hideByDefault);
  const [sharing, setSharing] = useState(false);
  const showToast = useKashStore((s) => s.showToast);
  const recap = useMonthRecap(month);
  const cardRef = useRef<View>(null);

  const share = async () => {
    if (!cardRef.current || !recap) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `Meu ${recap.name} no Kash`, UTI: 'public.png' });
      track('recap_shared', { hidden });
    } catch {
      showToast('Não deu pra compartilhar agora. Tente de novo.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen testID="recap-screen" withTabBar={false} header={<PageHeader title="Retrospectiva" onBack={() => router.back()} testID="recap" />}>
      <DataGate>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <IconButton icon="arrow-left" size={32} subtle onPress={() => setMonth((m) => shiftMonth(m, -1))} accessibilityLabel="Mês anterior" testID="recap-prev" />
          <Text variant="bodySemibold" testID="recap-month">
            {cap(monthLabel(month))}
          </Text>
          {month < latest ? (
            <IconButton icon="chevron-right" size={32} subtle onPress={() => setMonth((m) => shiftMonth(m, 1))} accessibilityLabel="Próximo mês" testID="recap-next" />
          ) : (
            <View style={{ width: 32 }} />
          )}
        </View>

        {recap ? (
          <>
            <View ref={cardRef} collapsable={false} style={{ marginTop: 12 }}>
              <RecapCard recap={recap} hidden={hidden} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, justifyContent: 'center' }}>
              <Chip label={hidden ? 'Valores escondidos' : 'Esconder valores'} tone="soft" selected={hidden} onPress={() => setHidden((h) => !h)} testID="recap-hide" />
            </View>
            <View style={{ marginTop: 14 }}>
              <Button label={sharing ? 'Preparando a imagem…' : 'Compartilhar'} onPress={() => void share()} disabled={sharing} testID="recap-share" haptic="medium" />
            </View>
            <Text variant="micro" color="muted" align="center" style={{ marginTop: 10 }}>
              {hidden ? 'A imagem mostra só porcentagens, sem os seus valores.' : 'A imagem mostra os seus valores. Toque em “Esconder valores” para postar só as porcentagens.'}
            </Text>
          </>
        ) : (
          <EmptyState icon="calendar" title={`Nada em ${monthLabel(month)}`} description="Esse mês não teve lançamentos. Escolha outro mês." testID="recap-empty" />
        )}
      </DataGate>
    </Screen>
  );
}

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const name = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
  return y === now().getFullYear() ? name : `${name} de ${y}`;
}

/** O card compartilhado: fundo escuro fixo (fica igual no tema claro e no escuro). */
export function RecapCard({ recap: r, hidden }: { recap: MonthRecap; hidden: boolean }) {
  const { colors } = useTheme();
  const money = (v: number) => formatMoney(v, hidden);
  const ink = staticColors.inkOnLight;
  const muted = staticColors.inkMuted;
  const line = staticColors.inkLine;
  const savedLine =
    r.saved >= 0
      ? hidden
        ? r.savedPct !== null
          ? `Sobraram ${r.savedPct}% do que entrou`
          : 'Fechou no azul'
        : `Sobraram ${money(r.saved)}${r.savedPct !== null ? ` (${r.savedPct}% do que entrou)` : ''}`
      : hidden
        ? 'Saiu mais do que entrou'
        : `Saiu ${money(-r.saved)} a mais do que entrou`;
  const vsPrev =
    r.spentVsPrevious === null ? null : r.spentVsPrevious === 0 ? `Gastou o mesmo que em ${r.previousName}` : `${Math.abs(r.spentVsPrevious)}% ${r.spentVsPrevious < 0 ? 'a menos' : 'a mais'} que em ${r.previousName}`;
  const budgetLine = r.budget
    ? r.budget.within
      ? hidden
        ? `Ficou dentro do limite (${Math.round((r.budget.spent / r.budget.limit) * 100)}% usado)`
        : `Ficou ${money(r.budget.diff)} dentro do limite`
      : hidden
        ? `Passou ${Math.round(((r.budget.spent - r.budget.limit) / r.budget.limit) * 100)}% do limite`
        : `Passou ${money(r.budget.diff)} do limite`
    : null;

  return (
    <View testID="recap-card" style={{ borderRadius: radii.card, padding: 22, gap: 18, backgroundColor: staticColors.ink, borderWidth: 1, borderColor: line }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="titleBold" color={staticColors.brandGreen}>
          Kash
        </Text>
        <Text variant="micro" color={muted}>
          Retrospectiva {r.year}
        </Text>
      </View>
      <View style={{ gap: 4 }}>
        <Text variant="heroTitle" color={ink} testID="recap-heading">
          Seu {r.name}
        </Text>
        <Text variant="body" color={muted}>
          {r.txCount} {r.txCount === 1 ? 'gasto' : 'gastos'} · {r.noSpendDays} {r.noSpendDays === 1 ? 'dia' : 'dias'} sem gastar
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Stat label="Entrou" value={money(r.income)} color={staticColors.brandGreen} testID="recap-income" />
        <Stat label="Saiu" value={money(r.spent)} color={ink} testID="recap-spent" />
      </View>
      <View style={{ padding: 14, borderRadius: radii.input, backgroundColor: r.saved >= 0 ? staticColors.brandGreen : colors.neg }}>
        <Text variant="bodyBold" color={staticColors.ink} testID="recap-saved">
          {savedLine}
        </Text>
      </View>

      {r.categories.length ? (
        <View style={{ gap: 10 }} testID="recap-categories">
          <Text variant="microMedium" color={muted}>
            ONDE MAIS SAIU
          </Text>
          {r.categories.map((c) => (
            <View key={c.name} style={{ gap: 5 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="bodySemibold" color={ink}>
                  {c.name}
                </Text>
                <Text variant="bodySemibold" color={ink}>
                  {hidden ? `${c.pct}%` : money(c.amount)}
                </Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: line }}>
                <View style={{ width: `${Math.max(4, Math.min(100, c.pct))}%`, height: 6, borderRadius: 3, backgroundColor: c.color }} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: line }}>
        {vsPrev ? <Line text={vsPrev} muted={muted} ink={ink} testID="recap-vs-prev" /> : null}
        {budgetLine ? <Line text={budgetLine} muted={muted} ink={ink} testID="recap-budget" /> : null}
        {r.biggest ? <Line text={`Maior gasto: ${r.biggest.title}${hidden ? '' : ` (${money(r.biggest.amount)})`}`} muted={muted} ink={ink} testID="recap-biggest" /> : null}
      </View>

      <Text variant="micro" color={muted} align="center">
        kash.app.br · organize sua grana
      </Text>
    </View>
  );
}

function Stat({ label, value, color, testID }: { label: string; value: string; color: string; testID: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="micro" color={staticColors.inkMuted}>
        {label}
      </Text>
      <Text variant="amountMedium" color={color} numberOfLines={1} adjustsFontSizeToFit testID={testID}>
        {value}
      </Text>
    </View>
  );
}

function Line({ text, ink, testID }: { text: string; muted: string; ink: string; testID: string }) {
  return (
    <Text variant="body" color={ink} testID={testID}>
      • {text}
    </Text>
  );
}
