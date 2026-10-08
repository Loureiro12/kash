import { installmentSchedule, monthsBetween } from '../selectors/cards';

const now = new Date(2026, 9, 7); // 7 out 2026

describe('monthsBetween', () => {
  it('conta meses atravessando anos', () => {
    expect(monthsBetween('2026-02', '2026-10')).toBe(8);
    expect(monthsBetween('2025-11', '2026-02')).toBe(3);
    expect(monthsBetween('2026-10', '2026-10')).toBe(0);
    expect(monthsBetween('2026-11', '2026-10')).toBe(-1);
  });
});

describe('cronograma de parcelas', () => {
  it('compra deste mês: parcela 1, nada pago', () => {
    expect(installmentSchedule(1200, 12, '2026-10', now)).toMatchObject({ n: 12, per: 100, current: 1, paid: 0, remaining: 12, remainingAmount: 1200, lastMonth: 'setembro', finished: false });
  });

  it('1ª parcela há 8 meses: 8 pagas, lança a 9ª, faltam 4 contando esta', () => {
    expect(installmentSchedule(1200, 12, '2026-02', now)).toMatchObject({ current: 9, paid: 8, remaining: 4, remainingAmount: 400, lastMonth: 'janeiro', finished: false });
  });

  it('atravessa a virada de ano', () => {
    expect(installmentSchedule(1200, 12, '2025-12', now)).toMatchObject({ current: 11, paid: 10, remaining: 2, remainingAmount: 200, lastMonth: 'novembro' });
  });

  it('todas as parcelas já passaram: quitada, nada a lançar', () => {
    expect(installmentSchedule(300, 3, '2026-01', now)).toMatchObject({ finished: true, remaining: 0, remainingAmount: 0, paid: 3, current: 3 });
  });

  it('mês futuro é tratado como o mês atual', () => {
    expect(installmentSchedule(200, 2, '2026-12', now)).toMatchObject({ current: 1, paid: 0, firstMonth: '2026-10' });
  });
});
