import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Icon, PageHeader, Pressable, ProgressBar, Screen, SegmentedControl, Text, useTheme } from '@/design-system';
import { dayOffsetOf, formatBRL, type PeriodBar, type ReportPeriod } from '@kash/domain';
import { now } from '@/lib/clock';
import { useMoney, usePeriodReport, useTagTotals } from '@/store';
import { DataGate } from '@/features/navigation/DataGate';
import { TxRow } from '../transactions/TxRow';

/** `?periodo=dia|semana|mes` (atalhos do Início) */
const FROM_PARAM: Record<string, ReportPeriod> = { dia: 'day', semana: 'week', mes: 'month' };
const PERIODS: { value: ReportPeriod; label: string; testID: string }[] = [
  { value: 'day', label: 'Dia', testID: 'report-period-day' },
  { value: 'week', label: 'Semana', testID: 'report-period-week' },
  { value: 'month', label: 'Mês', testID: 'report-period-month' },
];
const WORD: Record<ReportPeriod, string> = { day: 'dia', week: 'semana', month: 'mês' };

/**
 * Tela 7 — Relatório: gastos do dia, da semana ou do mês. Total e comparação, ritmo contra o limite,
 * gráfico (toque numa barra abre o dia), como você está indo, por categoria e os maiores gastos.
 */
export function ReportScreen() {
  const router = useRouter();
  const money = useMoney();
  const tags = useTagTotals();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ periodo?: string }>();
  const [kind, setKind] = useState<ReportPeriod>(FROM_PARAM[params.periodo ?? ''] ?? 'month');
  const [offset, setOffset] = useState(0);
  const r = usePeriodReport(kind, offset);

  const changeKind = (next: ReportPeriod) => {
    setKind(next);
    setOffset(0);
  };
  const openDay = (bar: PeriodBar) => {
    if (bar.future) return;
    setKind('day');
    setOffset(dayOffsetOf(bar.date, now()));
  };
  const top = r.categories[0];

  return (
    <Screen testID="report-screen" header={<PageHeader title="Relatório" onBack={() => router.back()} testID="report" />}>
      <DataGate>
        <SegmentedControl value={kind} options={PERIODS} onChange={changeKind} testID="report-period" style={{ marginTop: 6 }} />

        <PeriodNav label={r.label} subtitle={r.subtitle} canBack={r.canGoBack} canForward={r.canGoForward} onBack={() => setOffset((o) => o - 1)} onForward={() => setOffset((o) => Math.min(0, o + 1))} onToday={r.isCurrent ? undefined : () => setOffset(0)} />

        <Card padding={20} style={{ marginTop: 12 }} testID="report-summary">
          <Text variant="meta" color="muted">
            Gastos · {r.label}
          </Text>
          <Text variant="amountLarge" style={{ marginTop: 2 }} testID="report-total" accessibilityLiveRegion="polite">
            {money(r.spent)}
          </Text>
          <Text variant="chip" color={r.delta.pct > 0 ? 'neg' : 'accentText'} style={{ marginTop: 2 }} testID="report-delta">
            {r.delta.message}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <Badge tone="pos" label={`↑ ${money(r.income)} entrou`} testID="report-income" />
            <Badge tone={r.net >= 0 ? 'neutral' : 'neg'} label={`${r.net >= 0 ? 'sobrou' : 'faltou'} ${money(Math.abs(r.net))}`} testID="report-net" />
          </View>

          {r.budget ? (
            <View style={{ gap: 8, marginTop: 16 }} testID="report-budget">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="metaMedium" color="muted">
                  Limite {kind === 'week' ? 'da' : 'do'} {WORD[kind]}
                </Text>
                <Text variant="metaMedium" color="muted">
                  {money(r.spent)} de {formatBRL(r.budget.limit)}
                </Text>
              </View>
              <ProgressBar pct={r.budget.pct} height={8} />
              <Text variant="chip" color={r.budget.left < 0 || (r.budget.projected ?? 0) > r.budget.limit ? 'neg' : 'text'} testID="report-budget-message">
                {r.budget.message}
              </Text>
            </View>
          ) : null}

          <Bars bars={r.bars} kind={kind} onPress={openDay} />
        </Card>

        {kind === 'month' && offset < 0 && (r.spent > 0 || r.income > 0) ? (
          <View style={{ marginTop: 12 }}>
            <Button label={`Ver a retrospectiva de ${r.label.toLowerCase()}`} variant="secondary" size="md" onPress={() => router.push({ pathname: '/recap', params: { mes: r.start.slice(0, 7) } })} testID="report-recap" />
          </View>
        ) : null}
        <Text variant="section" style={{ marginTop: 24 }}>
          Como você está indo
        </Text>
        <Card padding={[6, 16]} style={{ marginTop: 12 }} testID="report-insights">
          {r.spent === 0 && r.income === 0 ? (
            <Insight text={`Nada lançado ${kind === 'day' ? 'neste dia' : kind === 'week' ? 'nesta semana' : 'neste mês'}.`} last testID="report-insight-empty" />
          ) : (
            <>
              {kind !== 'day' && r.spent > 0 ? <Insight text={`Média de ${money(r.perDay)} por dia${r.isCurrent ? ' até agora' : ''}`} testID="report-insight-per-day" /> : null}
              {r.average ? <Insight text={r.average.message} testID="report-insight-average" /> : null}
              {r.peakDay ? <Insight text={`Dia que mais gastou: ${r.peakDay.label} (${money(r.peakDay.amount)})`} testID="report-insight-peak" /> : null}
              {top ? <Insight text={`${top.name} foi ${top.pct}% dos gastos (${money(top.amount)})`} testID="report-insight-top" /> : null}
              <Insight text={r.count === 0 ? 'Nenhum gasto, só entradas' : `${r.count} ${r.count === 1 ? 'gasto' : 'gastos'} · média de ${money(r.spent / r.count)} cada`} last testID="report-insight-count" />
            </>
          )}
        </Card>

        {r.categories.length > 0 ? (
          <>
            <Text variant="section" style={{ marginTop: 24 }}>
              Por categoria
            </Text>
            <Text variant="meta" color="muted" style={{ marginTop: 2 }}>
              Toque numa categoria pra ver os gastos dela mês a mês.
            </Text>
            <View style={{ gap: 14, marginTop: 14 }} testID="report-categories">
              {r.categories.map((c) => (
                <Pressable
                  key={c.name}
                  onPress={() => router.push({ pathname: '/category/[name]', params: { name: c.name } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name}: ${money(c.amount)}, ${c.pct}% dos gastos. Ver detalhes`}
                  style={{ gap: 7 }}
                  testID={`report-cat-${c.name}`}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.color }} />
                      <Text variant="bodySemibold">{c.name}</Text>
                    </View>
                    <Text variant="body" color="muted">
                      {money(c.amount)} · {c.pct}% ›
                    </Text>
                  </View>
                  <ProgressBar pct={c.pct} height={8} fillColor={c.color} />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {kind === 'day' ? (
          <>
            <Text variant="section" style={{ marginTop: 24 }}>
              Lançamentos {r.isCurrent ? 'de hoje' : 'do dia'}
            </Text>
            {r.groups.length === 0 ? (
              <Text variant="body" color="muted" style={{ marginTop: 8 }} testID="report-day-empty">
                Nenhum lançamento neste dia.
              </Text>
            ) : (
              <View testID="report-day-list">
                {r.groups.flatMap((g) => g.items).map((t) => (
                  <TxRow key={t.id} tx={t} testID={`report-tx-${t.id}`} />
                ))}
              </View>
            )}
          </>
        ) : r.topViews.length > 0 ? (
          <>
            <Text variant="section" style={{ marginTop: 24 }}>
              Maiores gastos
            </Text>
            <View testID="report-top">
              {r.topViews.map((t) => (
                <TxRow key={t.id} tx={t} testID={`report-top-${t.id}`} />
              ))}
            </View>
          </>
        ) : null}

        {/* tags (viagens, eventos): fora das categorias */}
        <Pressable onPress={() => router.push('/tags')} accessibilityRole="button" accessibilityLabel="Abrir tags e modo viagem" testID="report-tags" style={{ marginTop: 24 }}>
          <Card padding={16} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="titleBold">Tags e modo viagem</Text>
              <Text variant="meta" color="muted" numberOfLines={1}>
                {tags.length ? tags.slice(0, 3).map((t) => `#${t.tag} ${money(t.spent)}`).join(' · ') : 'Junte os gastos de uma viagem ou de um evento'}
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.muted} />
          </Card>
        </Pressable>
      </DataGate>
    </Screen>
  );
}

function PeriodNav({ label, subtitle, canBack, canForward, onBack, onForward, onToday }: { label: string; subtitle: string; canBack: boolean; canForward: boolean; onBack: () => void; onForward: () => void; onToday?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
      <NavButton direction="back" disabled={!canBack} onPress={onBack} />
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text variant="titleBold" testID="report-period-label" accessibilityLiveRegion="polite">
          {label}
        </Text>
        {onToday ? (
          <Pressable onPress={onToday} accessibilityRole="button" accessibilityLabel={`${subtitle}. Voltar para o período atual`} hitSlop={8} testID="report-today">
            <Text variant="meta" color="accentText">
              {subtitle} · voltar pra hoje
            </Text>
          </Pressable>
        ) : (
          <Text variant="meta" color="muted" testID="report-period-subtitle">
            {subtitle}
          </Text>
        )}
      </View>
      <NavButton direction="forward" disabled={!canForward} onPress={onForward} />
    </View>
  );
}

function NavButton({ direction, disabled, onPress }: { direction: 'back' | 'forward'; disabled: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const back = direction === 'back';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={back ? 'Período anterior' : 'Próximo período'}
      accessibilityState={{ disabled }}
      testID={back ? 'report-prev' : 'report-next'}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, opacity: disabled ? 0.35 : 1 }}
    >
      <View style={{ transform: [{ rotate: back ? '180deg' : '0deg' }] }}>
        <Icon name="chevron-right" size={16} color={colors.text} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

/** dia/semana: 7 barras com o dia da semana · mês: uma barra por dia, rótulo de 7 em 7 */
function Bars({ bars, kind, onPress }: { bars: PeriodBar[]; kind: ReportPeriod; onPress: (bar: PeriodBar) => void }) {
  const { colors } = useTheme();
  const dense = kind === 'month';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: dense ? 3 : 10, height: 120, marginTop: 20 }} testID="report-chart">
      {bars.map((b, i) => {
        const showLabel = !dense || i === 0 || (i + 1) % 7 === 0;
        return (
          <Pressable
            key={b.date}
            onPress={() => onPress(b)}
            disabled={b.future}
            haptic="selection"
            pressedOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: b.selected, disabled: b.future }}
            accessibilityLabel={`${dense ? `dia ${b.label}` : b.label}: ${formatBRL(b.value)}${b.future ? ', ainda não chegou' : '. Ver o dia'}`}
            testID={`report-bar-${b.date}`}
            style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}
          >
            <View
              style={{
                width: '100%',
                height: b.height > 0 ? `${b.height * 0.8}%` : 3,
                borderRadius: dense ? 3 : 8,
                backgroundColor: b.selected ? colors.accent : b.value > 0 ? colors.accent : colors.surface2,
                opacity: b.selected ? 1 : b.value > 0 ? 0.45 : 1,
              }}
            />
            <Text variant="microSemibold" color={b.selected ? 'text' : 'muted'} numberOfLines={1} style={{ opacity: showLabel ? 1 : 0 }}>
              {dense ? (showLabel ? b.label : '·') : b.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Insight({ text, last, testID }: { text: string; last?: boolean; testID: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line }} testID={testID}>
      <Text variant="body">{text}</Text>
    </View>
  );
}
