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
  staticColors,
  useTheme,
} from '@/design-system';
import { greetingFor } from '@/domain/dates';
import { formatBRL } from '@/domain/money';
import { forecastHeights } from '@/domain/selectors/forecast';
import { now } from '@/lib/clock';
import { useForecast, useHomeSummary, useKashStore, useMoney, useRecentTxs, useUpcomingBills } from '@/store';
import { TxRow } from '../transactions/TxRow';

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
  const forecast = useForecast();
  const recent = useRecentTxs(6);
  const heights = forecastHeights(forecast, 10);
  const nextMonth = forecast[0];

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
    <Screen testID="home-screen" header={header}>
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
      </Card>

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
      {bills.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginRight: -20 }} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
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
      <SectionHeader title="Últimos lançamentos" />
      <View style={{ marginTop: 6 }} testID="home-recent">
        {recent.map((t) => (
          <TxRow key={t.id} tx={t} testID={`tx-${t.id}`} />
        ))}
      </View>
    </Screen>
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
