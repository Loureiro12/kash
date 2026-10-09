import { seedData, type Tx } from '@kash/domain';
import type { KashSnapshot } from '@kash/supabase-client';
import { describe, expect, it } from 'vitest';
import { isActive, isNewTxShortcut, NAV, routes } from '@/features/app/nav';
import { isValidEmail, passwordStrength, validateLogin, validateSignup } from '@/features/auth/validation';
import { amountFromDigits, digitsFrom, maskedMoney } from '@/kash/money';
import { buildNewTxRequest, buildTxUpdate } from '@/kash/transactions';
import { billsView, cardsView, categoriesWithUsage, goalsView, homeView, reportView, transactionsView } from '@/kash/views';

const now = new Date(2026, 9, 15, 10); // 15 out 2026
const snap: KashSnapshot = { ...seedData(now), cardUsage: {} };
const base = { kind: 'expense' as const, category: 'Comida', note: '', installments: 1, date: '2026-10-15' };

describe('lançamento novo → chamada ao servidor', () => {
  it('gasto à vista na conta', () => {
    const req = buildNewTxRequest({ ...base, amount: 12.9, sourceId: 'acc1' }, snap, now);
    expect(req).toEqual({ type: 'single', input: { title: 'Comida', category: 'Comida', amount: 12.9, date: '2026-10-15', sourceType: 'account', sourceId: 'acc1' } });
  });

  it('gasto no cartão, 1x, usa a descrição como título', () => {
    const req = buildNewTxRequest({ ...base, amount: 50, sourceId: 'card1', note: '  Pizza ' }, snap, now);
    expect(req).toMatchObject({ type: 'single', input: { title: 'Pizza', sourceType: 'card' } });
  });

  it('parcelado começando agora: parcela 1 de N, valor por parcela', () => {
    const req = buildNewTxRequest({ ...base, amount: 1200, sourceId: 'card1', installments: 3 }, snap, now);
    expect(req).toMatchObject({ type: 'installments', per: 400, paid: 0, input: { total: 1200, installments: 3, current: 1, date: '2026-10-15', cardId: 'card1' } });
  });

  it('compra antiga: as parcelas que passaram contam como pagas e a atual entra neste mês', () => {
    const req = buildNewTxRequest({ ...base, amount: 800, sourceId: 'card1', installments: 8, firstInstallmentMonth: '2026-06', date: '2026-06-03' }, snap, now);
    expect(req).toMatchObject({ type: 'installments', paid: 4, input: { current: 5, date: '2026-10-01' } });
  });

  it('compra já toda paga não gera lançamento', () => {
    const req = buildNewTxRequest({ ...base, amount: 300, sourceId: 'card1', installments: 3, firstInstallmentMonth: '2026-01' }, snap, now);
    expect(req.type).toBe('invalid');
  });

  it('parcelas são ignoradas fora do cartão', () => {
    const req = buildNewTxRequest({ ...base, amount: 300, sourceId: 'acc1', installments: 6 }, snap, now);
    expect(req.type).toBe('single');
  });

  it('entrada só em conta, com título padrão', () => {
    expect(buildNewTxRequest({ ...base, kind: 'income', amount: 600, sourceId: 'acc1' }, snap, now)).toMatchObject({ type: 'single', input: { title: 'Entrada', category: 'Entrada', sourceType: 'account' } });
    expect(buildNewTxRequest({ ...base, kind: 'income', amount: 600, sourceId: 'card1' }, snap, now).type).toBe('invalid');
  });

  it('valor zero ou origem desconhecida são recusados', () => {
    expect(buildNewTxRequest({ ...base, amount: 0, sourceId: 'acc1' }, snap, now).type).toBe('invalid');
    expect(buildNewTxRequest({ ...base, amount: 10, sourceId: 'nao-existe' }, snap, now).type).toBe('invalid');
  });
});

describe('edição de lançamento', () => {
  const parcel = snap.txs.find((t) => t.planId)!;

  it('trocar o cartão de uma parcela move o parcelamento inteiro', () => {
    const other = snap.cards.find((c) => c.id !== parcel.sourceId)!.id;
    const { movePlanTo, input } = buildTxUpdate(parcel, { amount: 10, category: 'Lazer', sourceId: other, note: '', date: parcel.date }, snap);
    expect(movePlanTo).toBe(other);
    expect(input).toMatchObject({ title: parcel.title, sourceType: 'card', category: 'Lazer', amount: 10 });
  });

  it('pagamento de fatura mantém a categoria; entrada continua Entrada', () => {
    const invoicePay: Tx = { id: 'x', title: 'Fatura', category: 'Fatura', amount: -300, date: '2026-10-05', sourceId: 'acc1' };
    expect(buildTxUpdate(invoicePay, { amount: 300, category: 'Comida', sourceId: 'acc1', note: '', date: '2026-10-05' }, snap).input.category).toBeUndefined();
    const income: Tx = { id: 'y', title: 'Mesada', category: 'Entrada', amount: 600, date: '2026-10-05', sourceId: 'acc1' };
    expect(buildTxUpdate(income, { amount: 650, category: 'Comida', sourceId: 'acc1', note: 'Mesada', date: '2026-10-05' }, snap).input).toMatchObject({ category: 'Entrada', amount: 650 });
  });
});

describe('projeções das telas', () => {
  it('início: saldo, gastos do mês e limite', () => {
    const v = homeView(snap, now);
    expect(v.totalBalance).toBe(4225.5);
    expect(v.spent).toBeGreaterThan(0);
    expect(v.budgetStatus.message).toMatch(/Sobram|Passou/);
    expect(v.forecastHeights).toHaveLength(6);
    expect(v.recent.length).toBeLessThanOrEqual(8);
  });

  it('cartões: seleção cai no primeiro quando o id não existe', () => {
    expect(cardsView(snap, 'sumiu', now).selected?.card.id).toBe('card1');
    const v = cardsView(snap, 'card2', now);
    expect(v.selected?.card.id).toBe('card2');
    expect(v.txs.every((t) => t.tx.sourceId === 'card2')).toBe(true);
    expect(v.plans.every((p) => p.cardId === 'card2')).toBe(true);
  });

  it('contas fixas: resumo com total mensal', () => {
    const v = billsView(snap);
    expect(v.summary.count).toBe(snap.bills.length);
    expect(v.summary.total).toBeGreaterThanOrEqual(v.summary.pendingTotal);
  });

  it('metas: progresso, total guardado e dica', () => {
    const v = goalsView(snap, now);
    expect(v.goals).toHaveLength(snap.goals.length);
    expect(v.totalSaved).toBeGreaterThan(0);
  });

  it('relatório usa os gastos reais dos meses anteriores (sem números fictícios)', () => {
    const v = reportView(snap, now);
    expect(v.history).toHaveLength(6);
    expect(v.history.slice(0, 5).every((m) => m.value === 0)).toBe(true);
    expect(v.delta.message).toBe('Sem gastos em setembro pra comparar');
  });

  it('lançamentos: busca por descrição ou categoria, agrupados por dia', () => {
    const all = transactionsView(snap, { monthOffset: 0, kind: 'all', category: null }, now);
    expect(all.totals.count).toBe(snap.txs.length);
    const found = transactionsView(snap, { monthOffset: 0, kind: 'all', category: null }, now, 'pizza');
    expect(found.groups.flatMap((g) => g.items).every((t) => t.title.toLowerCase().includes('pizza'))).toBe(true);
    const byCat = transactionsView(snap, { monthOffset: 0, kind: 'all', category: null }, now, 'lazer');
    expect(byCat.totals.count).toBeGreaterThan(0);
    expect(transactionsView(snap, { monthOffset: -3, kind: 'all', category: null }, now).totals.count).toBe(0);
  });

  it('categorias com contagem de uso', () => {
    const list = categoriesWithUsage(snap);
    expect(list.find((c) => c.name === 'Lazer')?.usage.txs).toBeGreaterThan(0);
  });
});

describe('navegação e atalhos', () => {
  it('item ativo', () => {
    expect(isActive('/app', routes.home)).toBe(true);
    expect(isActive('/app/cartoes', routes.home)).toBe(false);
    expect(isActive('/app/perfil/dados', routes.profile)).toBe(true);
    expect(NAV.map((n) => n.label)).toEqual(['Início', 'Lançamentos', 'Cartões', 'Contas bancárias', 'Contas fixas', 'Metas', 'Relatório', 'Previsão']);
  });

  it('N abre Lançar gasto, mas não enquanto digita ou com modificador', () => {
    const key = { key: 'n', metaKey: false, ctrlKey: false, altKey: false, repeat: false };
    expect(isNewTxShortcut(key, { tagName: 'BODY' })).toBe(true);
    expect(isNewTxShortcut({ ...key, key: 'N' }, { tagName: 'MAIN' })).toBe(true);
    expect(isNewTxShortcut(key, { tagName: 'INPUT' })).toBe(false);
    expect(isNewTxShortcut(key, { tagName: 'DIV', isContentEditable: true })).toBe(false);
    expect(isNewTxShortcut({ ...key, metaKey: true }, { tagName: 'BODY' })).toBe(false);
    expect(isNewTxShortcut({ ...key, key: 'm' }, { tagName: 'BODY' })).toBe(false);
  });
});

describe('máscara de dinheiro', () => {
  it('dígitos entram pelos centavos, até 8', () => {
    expect(digitsFrom('12990')).toBe('12990');
    expect(amountFromDigits(digitsFrom('R$ 129,905'))).toBe(1299.05);
    expect(digitsFrom('123456789')).toBe('12345678');
    expect(amountFromDigits('')).toBe(0);
  });
  it('texto do campo', () => {
    expect(maskedMoney(0)).toBe('');
    expect(maskedMoney(1234.5)).toBe('R$ 1.234,50');
    expect(maskedMoney(-50)).toBe('-R$ 50,00');
  });
});

describe('formulários de entrada', () => {
  it('login e cadastro', () => {
    expect(validateLogin('', '')).toEqual({ email: 'Informe seu e-mail.', password: 'Informe sua senha.' });
    expect(validateLogin('a@b.co', 'x')).toEqual({});
    expect(Object.keys(validateSignup('L', 'x', '123', false))).toEqual(['name', 'email', 'password', 'terms']);
    expect(isValidEmail(' lara@kash.app ')).toBe(true);
    expect(passwordStrength('Senha123').label).toBe('Senha forte');
  });
});
