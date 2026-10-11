import { describe, expect, it } from 'vitest';
import { budgetSplit } from '../selectors/budget';
import type { Tx } from '../types';

const now = new Date(2026, 9, 15);
const tx = (over: Partial<Tx>): Tx => ({ id: Math.random().toString(36), title: 'x', category: 'Comida', amount: -10, date: '2026-10-05', sourceId: 'acc1', ...over });

describe('limite dividido entre cartão e restante', () => {
  const txs: Tx[] = [
    tx({ amount: -300, sourceId: 'card1' }), // compra no cartão
    tx({ amount: -120, sourceId: 'card2', category: 'Lazer' }), // parcela no outro cartão
    tx({ amount: -80, sourceId: 'acc1' }), // débito/Pix
    tx({ amount: -900, sourceId: 'acc1', category: 'Fatura' }), // pagamento da fatura: já está no cartão
    tx({ amount: -500, sourceId: 'acc1', category: 'Transferência', transferId: 't1' }), // transferência entre contas
    tx({ amount: 3000, sourceId: 'acc1', category: 'Entrada' }),
    tx({ amount: -50, sourceId: 'card1', date: '2026-09-28' }), // mês passado
  ];

  it('cartão conta a fatura do mês de todos os cartões; o restante não conta pagamento de fatura nem transferência', () => {
    const split = budgetSplit(txs, ['card1', 'card2'], { monthlyBudget: 2000, cardBudget: 1500 }, now);
    expect(split.card).toMatchObject({ budget: 1500, spent: 420 });
    expect(split.rest).toMatchObject({ budget: 500, spent: 80 });
    expect(split.total).toMatchObject({ budget: 2000, spent: 500 });
    expect(split.rest!.status.message).toBe('Sobram R$ 420,00 pra fechar o mês no verde');
  });

  it('sem divisão, só o total (igual ao limite mensal de antes)', () => {
    const split = budgetSplit(txs, ['card1', 'card2'], { monthlyBudget: 2000, cardBudget: 0 }, now);
    expect([split.card, split.rest]).toEqual([null, null]);
    expect(split.total.spent).toBe(500);
  });

  it('usa o tipo da origem quando vem do servidor', () => {
    const split = budgetSplit([tx({ amount: -40, sourceId: 'x', sourceType: 'card' })], [], { monthlyBudget: 100, cardBudget: 50 }, now);
    expect([split.card!.spent, split.rest!.spent]).toEqual([40, 0]);
  });
});
