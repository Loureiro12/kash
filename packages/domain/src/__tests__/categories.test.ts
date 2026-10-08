import { categoryColorMap, categoryUsage, DEFAULT_CATEGORIES, validateCategoryName } from '../categories';
import { seedData } from '../fixtures/seed';
import { categoryBreakdown } from '../selectors/report';
import { txView } from '../selectors/transactions';

const list = [
  { id: 'c1', name: 'Comida' },
  { id: 'c2', name: 'Pets' },
];

describe('validateCategoryName', () => {
  it('aceita nome novo e o próprio nome ao editar', () => {
    expect(validateCategoryName('Academia', list)).toBeNull();
    expect(validateCategoryName('pets', list, 'c2')).toBeNull();
  });
  it('recusa vazio, longo, reservado e repetido (sem diferenciar maiúsculas)', () => {
    expect(validateCategoryName('   ', list)).toBe('Dê um nome pra categoria.');
    expect(validateCategoryName('x'.repeat(25), list)).toBe('Use até 24 caracteres.');
    expect(validateCategoryName('fatura', list)).toBe('“fatura” é reservado pelo app.');
    expect(validateCategoryName(' PETS ', list)).toBe('Já existe uma categoria com esse nome.');
  });
});

describe('uso e cores', () => {
  it('conta lançamentos, contas fixas e parcelamentos da categoria', () => {
    const seed = seedData(new Date(2026, 9, 15));
    const usage = categoryUsage('Assinaturas', seed);
    expect(usage.total).toBe(usage.txs + usage.bills + usage.plans);
    expect(usage.bills).toBeGreaterThan(0);
    expect(categoryUsage('Inexistente', seed).total).toBe(0);
  });
  it('seed traz as categorias padrão com ids estáveis', () => {
    const seed = seedData(new Date(2026, 9, 15));
    expect(seed.categories.map((c) => c.name)).toEqual(DEFAULT_CATEGORIES.map((c) => c.name));
    expect(seed.categories[0]!.id).toBe('cat1');
  });
  it('cores vêm da lista do usuário; categoria sumida fica neutra', () => {
    const now = new Date(2026, 9, 15);
    const colors = categoryColorMap([{ name: 'Pets', color: '#FF8A3D' }]);
    const tx = { id: 't', title: 'Ração', category: 'Pets', amount: -80, date: '2026-10-15', sourceId: 'acc1' };
    expect(txView(tx, [], [], now, colors).color).toBe('#FF8A3D');
    expect(txView({ ...tx, category: 'Sumiu' }, [], [], now, colors).color).toBe('#AAB2BF');
    expect(categoryBreakdown([tx], now, colors)[0]).toMatchObject({ name: 'Pets', color: '#FF8A3D', amount: 80 });
  });
});
