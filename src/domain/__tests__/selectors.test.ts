import { seedData } from '@/store/seed';
import { budgetStatus } from '../selectors/budget';
import { activePlans, cardDates, cardUsage, installmentPreview } from '../selectors/cards';
import { billsSummary, upcomingBills } from '../selectors/bills';
import { addToGoal, goalProgress, totalSaved } from '../selectors/goals';
import { categoryBreakdown, monthDelta, monthlyHistory, topCategoryTip } from '../selectors/report';
import { forecast, forecastHeights } from '../selectors/forecast';
import { monthIncome, monthSpent, totalBalance } from '../selectors/balance';
import { sourceOptions, txView } from '../selectors/transactions';

const now = new Date(2026, 9, 15, 10); // 15 out 2026 — todos os lançamentos do seed caem no mês
const seed = seedData(now);

describe('saldo e mês', () => {
  it('saldo total = Σ contas', () => {
    expect(totalBalance(seed.accounts)).toBe(4225.5);
  });
  it('saídas e entradas do mês', () => {
    expect(monthSpent(seed.txs, now)).toBeCloseTo(671.3, 2);
    expect(monthIncome(seed.txs, now)).toBe(1450);
  });
  it('ignora lançamentos de outro mês', () => {
    const txs = [{ id: 'x', title: 'Antigo', category: 'Comida' as const, amount: -100, date: '2026-09-01', sourceId: 'acc1' }];
    expect(monthSpent(txs, now)).toBe(0);
  });
});

describe('orçamento', () => {
  it('sobra quando abaixo do limite', () => {
    const s = budgetStatus(671.3, 1800);
    expect(s.pct).toBe(37);
    expect(s.message).toBe('Sobram R$ 1.128,70 pra fechar o mês no verde');
  });
  it('passou do limite', () => {
    const s = budgetStatus(2000, 1800);
    expect(s.pct).toBe(100);
    expect(s.message).toBe('Passou R$ 200,00 do limite do mês');
  });
});

describe('cartões', () => {
  it('fatura = Σ |txs| do cartão', () => {
    const card = seed.cards[0]!;
    const u = cardUsage(card, seed.txs);
    expect(u.used).toBeCloseTo(405.1, 2);
    expect(u.available).toBeCloseTo(2094.9, 2);
    expect(u.pct).toBe(16);
  });
  it('datas de fechamento/vencimento', () => {
    expect(cardDates(seed.cards[0]!, now)).toEqual({ closes: '28 out', due: '05 nov' });
  });
  it('parcelas em aberto do cartão', () => {
    const plans = activePlans(seed.plans, 'card1', now);
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ pct: 42, endsIn: 'maio', remaining: 1399.3 });
  });
  it('preview de parcelamento', () => {
    expect(installmentPreview(1200, 6, now)).toEqual({ n: 6, per: 200, total: 1200, lastMonth: 'março' });
    expect(installmentPreview(100, 3, now).per).toBe(33.33);
    expect(installmentPreview(100, 99, now).n).toBe(24);
  });
});

describe('contas fixas', () => {
  it('resumo', () => {
    expect(billsSummary(seed.bills)).toEqual({ pendingTotal: 274.6, paidCount: 1, count: 5 });
  });
  it('próximas = não pagas ordenadas', () => {
    expect(upcomingBills(seed.bills).map((b) => b.name)).toEqual(['Internet', 'Streaming de vídeo', 'Academia', 'Plano do celular']);
  });
});

describe('metas', () => {
  it('progresso e ETA', () => {
    expect(goalProgress(seed.goals[0]!)).toMatchObject({ pct: 41, monthsLeft: 6, eta: 'Faltam ~6 meses nesse ritmo', done: false });
  });
  it('singular de mês', () => {
    expect(goalProgress({ id: 'g', name: 'x', target: 100, saved: 50, color: '#fff', monthly: 60 }).eta).toBe('Faltam ~1 mês nesse ritmo');
  });
  it('meta batida', () => {
    expect(goalProgress({ id: 'g', name: 'x', target: 100, saved: 100, color: '#fff', monthly: 10 })).toMatchObject({ pct: 100, eta: 'Meta batida!', done: true });
  });
  it('aporte não ultrapassa o alvo', () => {
    expect(addToGoal({ id: 'g', name: 'x', target: 100, saved: 80, color: '#fff', monthly: 10 }, 50).saved).toBe(100);
  });
  it('total guardado', () => {
    expect(totalSaved(seed.goals)).toBe(3960);
  });
});

describe('relatório', () => {
  it('categorias ordenadas desc com %', () => {
    const cats = categoryBreakdown(seed.txs, now);
    expect(cats[0]).toMatchObject({ name: 'Lazer', color: '#D98BFF' });
    expect(cats.map((c) => c.name)).toEqual(['Lazer', 'Outros', 'Mercado', 'Transporte', 'Comida', 'Assinaturas']);
    expect(cats.reduce((a, c) => a + c.pct, 0)).toBeGreaterThanOrEqual(98);
  });
  it('histórico de 6 meses com mês atual destacado', () => {
    const h = monthlyHistory(seed.txs, now);
    expect(h).toHaveLength(6);
    expect(h.map((m) => m.label)).toEqual(['mai', 'jun', 'jul', 'ago', 'set', 'out']);
    expect(h[5]).toMatchObject({ current: true });
    expect(h[3]?.height).toBe(100);
  });
  it('delta vs mês anterior', () => {
    expect(monthDelta(seed.txs, now).message).toBe('56% a menos que setembro');
  });
  it('dica da semana', () => {
    expect(topCategoryTip(seed.txs, now)).toMatchObject({ name: 'lazer' });
  });
});

describe('previsão', () => {
  it('6 meses: contas fixas + parcelas restantes', () => {
    const f = forecast(seed.plans, seed.bills, seed.cards, now);
    expect(f).toHaveLength(6);
    expect(f[0]).toMatchObject({ name: 'novembro', bills: 924.6, installments: 289.8, total: 1214.4 });
    // tênis termina em 3 meses (3/6 → 6/6): no 4º mês só o celular
    expect(f[3]?.installments).toBeCloseTo(199.9, 2);
    expect(f[0]?.items.map((i) => i.tag)).toEqual(['6/12', '4/6', 'FIXA', 'FIXA', 'FIXA', 'FIXA', 'FIXA']);
  });
  it('alturas relativas', () => {
    const f = forecast(seed.plans, seed.bills, seed.cards, now);
    expect(forecastHeights(f)[0]).toBe(100);
  });
});

describe('lançamentos', () => {
  it('projeção de linha', () => {
    const v = txView(seed.txs[0]!, seed.accounts, seed.cards, now);
    expect(v).toMatchObject({ initial: 'A', meta: 'Hoje · Comida · Conta corrente', isExpense: true, color: '#FFB86B' });
    const income = txView(seed.txs.find((t) => t.id === 'tx4')!, seed.accounts, seed.cards, now);
    expect(income).toMatchObject({ isExpense: false, meta: 'Ontem · Entrada · Conta corrente' });
  });
  it('origens: cartões antes das contas', () => {
    const opts = sourceOptions(seed.cards, seed.accounts);
    expect(opts[0]).toEqual({ id: 'card1', label: 'Cartão principal •••• 4821', isCard: true });
    expect(opts.at(-1)).toEqual({ id: 'acc3', label: 'Carteira', isCard: false });
  });
});
