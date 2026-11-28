import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import {
  Avatar,
  Badge,
  Card,
  Icon,
  IconButton,
  Pressable,
  ProgressBar,
  Screen,
  SectionHeader,
  Text,
  layout,
  staticColors,
  useTheme,
} from '@/design-system';
import { activeTravelTag, forecastHeights, formatBRL, greetingFor, lastClosedMonth, tagSummary, type BudgetPart } from '@kash/domain';
import { now } from '@/lib/clock';
import { DATA_SOURCE } from '@/data/source';
import { useForecast, useHomeSummary, useKashStore, useMoney, useMonthRecap, useOpenInvoices, usePeriodReport, useRecentTxs, useUpcomingBills } from '@/store';
import { ChecklistCard } from '@/features/onboarding/ChecklistCard';
import { AssistantFab } from '../assistant/AssistantFab';
import { DataGate } from '../navigation/DataGate';
import { TxRow } from '../transactions/TxRow';
import { HomeHeaderSkeleton, HomeSkeleton } from './HomeSkeleton';

/** Tela 3 — Início. */
export function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const money = useMoney();
  const user = useKashStore((s) => s.user);
  const hideValues = useKashStore((s) => s.settings.hideValues);
  const toggleHide = useKashStore((s) => s.toggleHideValues);
  const openSheet = useKashStore((s) => s.openSheet);
  const setAccountsSegment = useKashStore((s) => s.setAccountsSegment);
  const summary = useHomeSummary();
  const bills = useUpcomingBills();
  const invoices = useOpenInvoices();
  const forecast = useForecast();
  const recent = useRecentTxs(6);
  const today = usePeriodReport('day', 0);
  const week = usePeriodReport('week', 0);
  // primeiros 7 dias do mês: a retrospectiva do mês que fechou
  const recapMonth = lastClosedMonth(now());
  const recap = useMonthRecap(recapMonth);
  const showRecap = !!recap && now().getDate() <= 7;
  // modo viagem ligado: faixa com o gasto da viagem até agora
  const travelTag = useKashStore((s) => activeTravelTag(s.settings, now()));
  const travelSpent = useKashStore((s) => (travelTag ? (tagSummary(s.txs, travelTag)?.spent ?? 0) : 0));
  const heights = forecastHeights(forecast, 10);
  const nextMonth = forecast[0];
  // até o snapshot chegar, nada do conteúdo (nem o nome) aparece: só o esqueleto
  const loading = useKashStore((s) => s.ui.dataStatus === 'loading');
  const showFab = !loading && DATA_SOURCE === 'remote';

  const goToBills = () => {
    setAccountsSegment('bills');
    router.navigate('/accounts');
  };

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.push('/profile')} testID="home-avatar" accessibilityRole="button" accessibilityLabel="Abrir perfil" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar initial={user.name[0] ?? 'K'} />
          <View>
            <Text variant="meta" color="muted">
              {greetingFor(now())}
            </Text>
            <Text variant="titleLg">{user.name.split(' ')[0]}</Text>
          </View>
        </Pressable>
        <IconButton
          icon={hideValues ? 'eye-off' : 'eye'}
          onPress={toggleHide}
          accessibilityLabel={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
          testID="home-toggle-hide"
          style={{ marginLeft: 'auto' }}
        />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
    <Screen testID="home-screen" header={loading ? <HomeHeaderSkeleton /> : header} contentStyle={showFab ? { paddingBottom: layout.screenPaddingBottom + 72 } : undefined}>
      <DataGate skeleton={<HomeSkeleton />}>
      <ChecklistCard />

      {/* Saldo total */}
      <Card radius="cardXl" padding={[22, 20]} style={{ marginTop: 10, gap: 6 }} testID="home-balance-card">
        <Text variant="metaMedium" color="muted">
          Saldo total
        </Text>
        <Text variant="balance" testID="home-balance">
          {money(summary.totalBalance)}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Badge tone="pos" label={`↑ ${money(summary.income)} entrou`} testID="home-income" />
          <Badge tone="neg" label={`↓ ${money(summary.spent)} saiu`} testID="home-spent" />
        </View>
      </Card>

      {/* Gastos do mês */}
      <Card variant="accent" radius="cardXl" padding={[18, 20]} onPress={() => router.push('/report')} style={{ marginTop: 12, gap: 10 }} testID="home-budget-card">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text variant="titleBold" color={staticColors.ink}>
            Gastos do mês
          </Text>
          <Text variant="chip" color={staticColors.ink} opacity={0.75}>
            ver relatório →
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text variant="amountCard" color={staticColors.ink}>
            {money(summary.spent)}
          </Text>
          <Text variant="chip" color={staticColors.ink} opacity={0.75}>
            de {formatBRL(summary.budget)}
          </Text>
        </View>
        <ProgressBar pct={summary.budgetStatus.pct} height={8} trackColor={staticColors.trackOnAccent} fillColor={staticColors.ink} />
        <Text variant="chip" color={staticColors.ink}>
          {summary.budgetStatus.message}
        </Text>
        {summary.card && summary.rest ? (
          <View style={{ gap: 10, marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: staticColors.trackOnAccent }} testID="home-budget-split">
            <BudgetPartRow label="Cartão" hint="fatura do mês" part={summary.card} money={money} testID="home-budget-card-part" />
            <BudgetPartRow label="Restante" hint="débito, Pix, dinheiro" part={summary.rest} money={money} testID="home-budget-rest-part" />
          </View>
        ) : null}
      </Card>

      {travelTag ? (
        <Pressable
          onPress={() => router.push({ pathname: '/tags/[tag]', params: { tag: travelTag } })}
          accessibilityRole="button"
          accessibilityLabel={`Modo viagem ${travelTag}, ${formatBRL(travelSpent)} até agora. Abrir`}
          testID="home-travel"
          style={{ marginTop: 12 }}
        >
          <Card padding={[12, 16]} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.accentText }}>
            <Icon name="target" size={18} color={colors.accentText} />
            <Text variant="bodySemibold" style={{ flex: 1 }} numberOfLines={1}>
              Modo viagem · {travelTag}
            </Text>
            <Text variant="value" testID="home-travel-spent">
              {money(travelSpent)}
            </Text>
          </Card>
        </Pressable>
      ) : null}

      {showRecap && recap ? (
        <Pressable
          onPress={() => router.push({ pathname: '/recap', params: { mes: recapMonth } })}
          accessibilityRole="button"
          accessibilityLabel={`Sua retrospectiva de ${recap.name} chegou. Abrir`}
          testID="home-recap"
          style={{ marginTop: 12 }}
        >
          <Card padding={16} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="sparkles" size={20} color={colors.accentText} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="titleBold">Sua retrospectiva de {recap.name} chegou</Text>
              <Text variant="meta" color="muted">
                Quanto entrou, saiu e onde você mais gastou. Dá pra compartilhar.
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.muted} />
          </Card>
        </Pressable>
      ) : null}

      {/* Relatório do dia e da semana */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <PeriodCard title="Hoje" amount={money(today.spent)} hint={today.delta.message} up={today.delta.pct > 0} onPress={() => router.push({ pathname: '/report', params: { periodo: 'dia' } })} testID="home-report-day" />
        <PeriodCard title="Esta semana" amount={money(week.spent)} hint={week.delta.message} up={week.delta.pct > 0} onPress={() => router.push({ pathname: '/report', params: { periodo: 'semana' } })} testID="home-report-week" />
      </View>

      {/* Ações rápidas */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <QuickAction label="Lançar gasto" onPress={() => openSheet('expense')} testID="action-add-expense" accent>
          <Text variant="titleLg" color="accentText" style={{ fontSize: 18 }}>
            +
          </Text>
        </QuickAction>
        <QuickAction label="Contas fixas" onPress={goToBills} testID="action-bills">
          <Icon name="calendar" size={15} color={colors.text} />
        </QuickAction>
        <QuickAction label="Guardar" onPress={() => router.navigate('/goals')} testID="action-goals">
          <Icon name="target" size={15} color={colors.text} />
        </QuickAction>
      </View>

      {/* Próximas contas */}
      <SectionHeader title="Próximas contas" actionLabel="ver todas" onAction={goToBills} actionTestID="home-bills-see-all" />
      {bills.length > 0 || invoices.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginRight: -20 }} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
          {invoices.map((inv) => (
            <Card key={inv.id} variant="accent" radius="card" padding={14} onPress={() => router.navigate('/cards')} style={{ width: 150, gap: 4 }} testID={`home-invoice-${inv.id}`}>
              <Text variant="micro" color={staticColors.ink} opacity={0.75}>
                fatura vence {inv.dueLabel}
              </Text>
              <Text variant="bodySemibold" color={staticColors.ink} numberOfLines={1}>
                {inv.cardName}
              </Text>
              <Text variant="valueLg" color={staticColors.ink} style={{ marginTop: 4 }}>
                {formatBRL(inv.total)}
              </Text>
            </Card>
          ))}
          {bills.map((b) => (
            <Card key={b.id} radius="card" padding={14} style={{ width: 140, gap: 4 }} testID={`home-bill-${b.id}`}>
              <Text variant="micro" color="muted">
                vence dia {b.dueDay}
              </Text>
              <Text variant="bodySemibold" numberOfLines={1}>
                {b.name}
              </Text>
              <Text variant="valueLg" style={{ marginTop: 4 }}>
                {formatBRL(b.amount)}
              </Text>
            </Card>
          ))}
        </ScrollView>
      ) : (
        <Text variant="body" color="muted" style={{ marginTop: 12 }} testID="home-bills-empty">
          Tudo pago por aqui. 🎉
        </Text>
      )}

      {/* Previsão */}
      <Card padding={[16, 18]} onPress={() => router.push('/forecast')} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }} testID="home-forecast-card">
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 36 }}>
          {heights.map((h, i) => (
            <View key={i} style={{ width: 7, borderRadius: 3, backgroundColor: colors.accent, height: `${h}%` }} />
          ))}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text variant="titleBold">Previsão de gastos</Text>
          <Text variant="meta" color="muted" numberOfLines={1}>
            {nextMonth ? `${nextMonth.name}: ${formatBRL(nextMonth.total)} já comprometidos` : ''}
          </Text>
        </View>
        <Icon name="chevron-right" size={16} color={colors.muted} strokeWidth={2} />
      </Card>

      {/* Últimos lançamentos */}
      <SectionHeader title="Últimos lançamentos" actionLabel="ver todos" onAction={() => router.push('/transactions')} actionTestID="home-txs-see-all" />
      <View style={{ marginTop: 6 }} testID="home-recent">
        {recent.map((t) => (
          <TxRow key={t.id} tx={t} testID={`tx-${t.id}`} />
        ))}
      </View>
      </DataGate>
    </Screen>
    {/* assistente (Claude): só com o servidor e os dados carregados */}
    {showFab ? <AssistantFab /> : null}
    </View>
  );
}

function PeriodCard({ title, amount, hint, up, onPress, testID }: { title: string; amount: string; hint: string; up: boolean; onPress: () => void; testID: string }) {
  return (
    <Card radius="card" padding={14} onPress={onPress} testID={testID} accessibilityLabel={`Gastos ${title.toLowerCase()}: ${amount}. ${hint}. Ver relatório`} style={{ flex: 1, gap: 4 }}>
      <Text variant="metaMedium" color="muted">
        {title} ›
      </Text>
      <Text variant="amountMedium" numberOfLines={1} adjustsFontSizeToFit>
        {amount}
      </Text>
      <Text variant="micro" color={up ? 'neg' : 'muted'} numberOfLines={2}>
        {hint}
      </Text>
    </Card>
  );
}

function QuickAction({ label, onPress, testID, accent, children }: { label: string; onPress: () => void; testID: string; accent?: boolean; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Card radius="card" padding={14} onPress={onPress} testID={testID} style={{ flex: 1, gap: 10, alignItems: 'flex-start' }}>
      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: accent ? colors.posSoft : colors.surface2, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      <Text variant="chip">{label}</Text>
    </Card>
  );
}

/** Uma das metas do limite dividido (no card verde do Início). */
function BudgetPartRow({ label, hint, part, money, testID }: { label: string; hint: string; part: BudgetPart; money: (v: number) => string; testID: string }) {
  const over = part.status.left < 0;
  return (
    <View style={{ gap: 6 }} testID={testID} accessible accessibilityLabel={`${label}: ${money(part.spent)} de ${formatBRL(part.budget)}. ${part.status.message}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <Text variant="chipBold" color={staticColors.ink}>
          {label}{' '}
          <Text variant="meta" color={staticColors.ink} opacity={0.7}>
            {hint}
          </Text>
        </Text>
        <Text variant="chip" color={staticColors.ink}>
          {money(part.spent)} de {formatBRL(part.budget)}
          {over ? ' · passou' : ''}
        </Text>
      </View>
      <ProgressBar pct={part.status.pct} height={6} trackColor={staticColors.trackOnAccent} fillColor={staticColors.ink} />
    </View>
  );
}
