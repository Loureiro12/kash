import { describe, expect, it } from 'vitest';
import { ASSISTANT_LIMITS, buildAssistantContext } from '../assistant';
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
