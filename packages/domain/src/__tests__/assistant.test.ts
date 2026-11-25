import { describe, expect, it } from 'vitest';
import { ASSISTANT_LIMITS, assistantLedger, buildAssistantContext, checkProposal, describeProposal } from '../assistant';
import { seedData } from '../fixtures/seed';

const now = new Date(2026, 10, 25, 10);

describe('resumo para o assistente', () => {
  it('traz contas, cartões, mês, compromissos, metas e lançamentos — sem e-mail nem celular', () => {
    const seed = seedData(now);
    const text = buildAssistantContext({ ...seed, user: { name: 'Lara Mendes' } }, now);
    expect(text).toContain('Hoje: 25 de novembro de 2026');
    expect(text).toContain('Nome: Lara.');
    expect(text).not.toContain('Mendes');
    for (const section of ['## Contas', '## Cartões', '## novembro até agora', '## Metas', '## Lançamentos dos últimos 60 dias']) expect(text).toContain(section);
    expect(text).not.toMatch(/@|\d{4} \d{4}/);
    for (const c of seed.cards) expect(text).not.toContain(c.last4);
  });

  it('conta nova: diz que não há contas nem cartões, sem quebrar', () => {
    const text = buildAssistantContext({ user: { name: '' }, settings: { monthlyBudget: 1800, cardBudget: 0 }, accounts: [], cards: [], txs: [], plans: [], bills: [], goals: [], invoices: [] }, now);
    expect(text).toContain('- nenhuma conta cadastrada');
    expect(text).toContain('- nenhum cartão cadastrado');
    expect(text).not.toContain('Nome:');
  });

  it('respeita o tamanho máximo', () => {
    const seed = seedData(now);
    const many = Array.from({ length: 2000 }, (_, i) => ({ ...seed.txs[0]!, id: `x${i}`, title: `Compra com um nome bem comprido número ${i}` }));
    const text = buildAssistantContext({ ...seed, txs: many }, now);
    expect(text.length).toBeLessThanOrEqual(ASSISTANT_LIMITS.contextChars);
  });
});


describe('lançamento assistido', () => {
  const ledger = {
    categories: ['Comida', 'Mercado', 'Outros'],
    sources: [
      { id: 'card1', name: 'Nubank', type: 'card' as const },
      { id: 'acc1', name: 'Corrente', type: 'account' as const },
    ],
  };
  const today = '2026-11-25';

  it('opções: categorias sem as do sistema e origens sem número de cartão', () => {
    const seed = seedData(now);
    const l = assistantLedger([...seed.categories, { name: 'Entrada' }], seed.cards, seed.accounts);
    expect(l.categories).not.toContain('Entrada');
    expect(JSON.stringify(l)).not.toContain(seed.cards[0]!.last4);
    expect(l.sources.filter((s) => s.type === 'card')).toHaveLength(seed.cards.length);
  });

  it('aceita uma proposta válida e ajusta o que dá', () => {
    expect(checkProposal({ kind: 'expense', amount: 45.9, title: ' iFood ', category: 'Comida', sourceId: 'card1', date: '2026-11-24', installments: 1 }, ledger, today)).toEqual({ kind: 'expense', amount: 45.9, title: 'iFood', category: 'Comida', sourceId: 'card1', date: '2026-11-24', installments: 1 });
    // data no futuro vira hoje; categoria desconhecida vira Outros; parcelas na conta viram à vista
    expect(checkProposal({ kind: 'expense', amount: 100, title: 'Farmácia', category: 'Saúde', sourceId: 'acc1', date: '2026-12-01', installments: 3 }, ledger, today)).toMatchObject({ category: 'Outros', date: today, installments: 1 });
    // parcelas no cartão: até 24
    expect(checkProposal({ kind: 'expense', amount: 2000, title: 'Celular', category: 'Outros', sourceId: 'card1', date: today, installments: 40 }, ledger, today)?.installments).toBe(24);
    // entrada sempre na categoria Entrada
    expect(checkProposal({ kind: 'income', amount: 3000, title: 'Salário', category: 'Comida', sourceId: 'acc1', date: today, installments: 1 }, ledger, today)?.category).toBe('Entrada');
  });

  it('recusa o que não dá pra lançar', () => {
    expect(checkProposal({ kind: 'expense', amount: 0, title: 'x', category: 'Comida', sourceId: 'card1', date: today, installments: 1 }, ledger, today)).toBeNull();
    expect(checkProposal({ kind: 'expense', amount: 10, title: 'x', category: 'Comida', sourceId: 'sumiu', date: today, installments: 1 }, ledger, today)).toBeNull();
    // entrada no cartão não existe
    expect(checkProposal({ kind: 'income', amount: 10, title: 'x', category: 'Entrada', sourceId: 'card1', date: today, installments: 1 }, ledger, today)).toBeNull();
    expect(checkProposal('lixo', ledger, today)).toBeNull();
  });

  it('descreve a proposta para o histórico da conversa', () => {
    expect(describeProposal({ kind: 'expense', amount: 300, title: 'Fone', category: 'Outros', sourceId: 'card1', date: '2026-11-25', installments: 3 }, ledger)).toBe('Gasto de R$ 300,00 · Fone · Outros · Nubank · 25/11 · 3x');
  });
});
