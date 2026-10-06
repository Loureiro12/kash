export const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
] as const;

/** yyyy-mm-dd em horário local. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** Nome do mês com deslocamento a partir de `now` (0 = mês atual, 1 = próximo). */
export function monthName(offset: number, now: Date): string {
  const idx = (((now.getMonth() + offset) % 12) + 12) % 12;
  return MONTH_NAMES[idx] as string;
}

export function shortMonthName(offset: number, now: Date): string {
  return monthName(offset, now).slice(0, 3);
}

/** "Hoje" · "Ontem" · "02 out" */
export function relativeDayLabel(iso: string, now: Date): string {
  const d = parseISODate(iso);
  const diff = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86_400_000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTH_NAMES[d.getMonth()]?.slice(0, 3)}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isSameMonth(iso: string, now: Date): boolean {
  const d = parseISODate(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

/**
 * Próxima ocorrência de um dia do mês a partir de `now`, formatada "dd mmm".
 * Se o dia já passou neste mês, cai no próximo.
 */
export function nextOccurrenceLabel(day: number, now: Date, after?: { day: number; monthOffset: number }): { label: string; monthOffset: number } {
  let offset = day >= now.getDate() ? 0 : 1;
  if (after) {
    // vencimento sempre depois do fechamento
    if (offset < after.monthOffset || (offset === after.monthOffset && day <= after.day)) {
      offset = after.monthOffset + (day <= after.day ? 1 : 0);
    }
  }
  return { label: `${String(day).padStart(2, '0')} ${shortMonthName(offset, now)}`, monthOffset: offset };
}

/** Saudação por horário. */
export function greetingFor(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Bom dia,';
  if (h < 18) return 'Boa tarde,';
  return 'Boa noite,';
}

/** "1 de outubro de 2026" */
export function longDate(d: Date): string {
  return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} de ${d.getFullYear()}`;
}

/** "yyyy-mm" de uma data. */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthKeyToDate(key: string): Date {
  const [y, m] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, 1);
}

/** Chaves de mês estritamente depois de `from` até `to` (inclusive), em ordem. */
export function monthKeysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const d = monthKeyToDate(from);
  d.setMonth(d.getMonth() + 1);
  while (monthKey(d) <= to) {
    out.push(monthKey(d));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

/** Nome do mês de uma chave "yyyy-mm". */
export function monthKeyName(key: string): string {
  return MONTH_NAMES[monthKeyToDate(key).getMonth()] as string;
}
