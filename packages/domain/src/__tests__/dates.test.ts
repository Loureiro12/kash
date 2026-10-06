import { greetingFor, monthName, nextOccurrenceLabel, relativeDayLabel, toISODate } from '../dates';

const now = new Date(2026, 9, 5, 10); // 5 out 2026, 10h

describe('dates', () => {
  it('monthName com deslocamento (wrap de ano)', () => {
    expect(monthName(0, now)).toBe('outubro');
    expect(monthName(1, now)).toBe('novembro');
    expect(monthName(3, now)).toBe('janeiro');
    expect(monthName(-1, now)).toBe('setembro');
  });

  it('relativeDayLabel', () => {
    expect(relativeDayLabel('2026-10-05', now)).toBe('Hoje');
    expect(relativeDayLabel('2026-10-04', now)).toBe('Ontem');
    expect(relativeDayLabel('2026-10-02', now)).toBe('02 out');
    expect(relativeDayLabel('2026-09-28', now)).toBe('28 set');
  });

  it('nextOccurrenceLabel: fechamento e vencimento', () => {
    const closing = nextOccurrenceLabel(28, now);
    expect(closing.label).toBe('28 out');
    const due = nextOccurrenceLabel(5, now, { day: 28, monthOffset: closing.monthOffset });
    expect(due.label).toBe('05 nov');
  });

  it('nextOccurrenceLabel: dia já passou cai no próximo mês', () => {
    expect(nextOccurrenceLabel(2, now).label).toBe('02 nov');
  });

  it('greeting por horário', () => {
    expect(greetingFor(new Date(2026, 9, 5, 8))).toBe('Bom dia,');
    expect(greetingFor(new Date(2026, 9, 5, 14))).toBe('Boa tarde,');
    expect(greetingFor(new Date(2026, 9, 5, 20))).toBe('Boa noite,');
  });

  it('toISODate', () => {
    expect(toISODate(now)).toBe('2026-10-05');
  });
});
