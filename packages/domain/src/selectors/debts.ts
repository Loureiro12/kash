import { addDays, parseISODate, relativeDayLabel, toISODate } from '../dates';
import { formatBRL, round2 } from '../money';
import type { Debt } from '../types';
import type { Reminder } from './reminders';

/** hora do lembrete de cobrança, no dia escolhido */
export const DEBT_REMINDER_HOUR = 10;
/** sugestão de quando cobrar: daqui a 7 dias */
export const defaultDebtDue = (now: Date) => toISODate(addDays(now, 7));

export interface DebtsSummary {
  /** a receber (pendentes) */
  pendingTotal: number;
  pendingCount: number;
  /** pendentes com a data de cobrar já passada */
  overdueCount: number;
  /** pendentes: atrasadas primeiro, depois por data de cobrar e as sem data */
  pending: Debt[];
  /** recebidas, da mais recente para a mais antiga */
  settled: Debt[];
  /** total pendente por pessoa (maior primeiro) */
  byPerson: { person: string; total: number; count: number }[];
}

export function debtsSummary(debts: readonly Debt[], now: Date): DebtsSummary {
  const today = toISODate(now);
  const pending = debts.filter((d) => !d.settledAt);
  const settled = debts.filter((d) => d.settledAt).sort((a, b) => (b.settledAt ?? '').localeCompare(a.settledAt ?? ''));
  pending.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || b.date.localeCompare(a.date));
  const people = new Map<string, { person: string; total: number; count: number }>();
  for (const d of pending) {
    const key = d.person.toLowerCase();
    const cur = people.get(key) ?? { person: d.person, total: 0, count: 0 };
    cur.total = round2(cur.total + d.amount);
    cur.count += 1;
    people.set(key, cur);
  }
  return {
    pendingTotal: round2(pending.reduce((a, d) => a + d.amount, 0)),
    pendingCount: pending.length,
    overdueCount: pending.filter((d) => d.dueDate && d.dueDate < today).length,
    pending,
    settled,
    byPerson: [...people.values()].sort((a, b) => b.total - a.total),
  };
}

/** "vence hoje", "atrasada desde 20 nov", "cobrar em 3 dias", "sem data" */
export function debtDueLabel(debt: Debt, now: Date): string {
  if (debt.settledAt) return `recebido ${relativeDayLabel(debt.settledAt, now).toLowerCase()}`;
  if (!debt.dueDate) return 'sem data para cobrar';
  const today = toISODate(now);
  if (debt.dueDate === today) return 'cobrar hoje';
  if (debt.dueDate < today) return `atrasado desde ${relativeDayLabel(debt.dueDate, now).toLowerCase()}`;
  const days = Math.round((parseISODate(debt.dueDate).getTime() - parseISODate(today).getTime()) / 86_400_000);
  return days === 1 ? 'cobrar amanhã' : `cobrar em ${days} dias`;
}

/** Lembretes de cobrança: no dia de cobrar, às 10h (só pendentes e no futuro). */
export function debtReminders(debts: readonly Debt[], now: Date): Reminder[] {
  return debts
    .filter((d) => !d.settledAt && d.dueDate)
    .map((d) => {
      const at = parseISODate(d.dueDate!);
      at.setHours(DEBT_REMINDER_HOUR, 0, 0, 0);
      return { d, at };
    })
    .filter(({ at }) => at.getTime() > now.getTime())
    .map(({ d, at }) => ({
      id: `debt:${d.id}:${d.dueDate}`,
      kind: 'debt' as const,
      title: `Hora de cobrar ${d.person}`,
      body: `${formatBRL(d.amount)}${d.description ? ` · ${d.description}` : ''}. Toque para mandar o lembrete.`,
      at: `${toISODate(at)}T${String(DEBT_REMINDER_HOUR).padStart(2, '0')}:00`,
      route: '/accounts?segmento=receber',
    }));
}

/** Mensagem pronta para cobrar (WhatsApp, SMS…), sem tom de cobrança chata. */
export function debtChargeMessage(debt: Debt, now: Date): string {
  const what = debt.description ? ` do ${debt.description}` : '';
  const when = relativeDayLabel(debt.date, now).toLowerCase();
  const first = debt.person.split(/\s+/)[0];
  return debt.kind === 'split'
    ? `Oi, ${first}! Passando pra lembrar da sua parte${what} (${when}): ${formatBRL(debt.amount)}. Valeu! 🙂`
    : `Oi, ${first}! Passando pra lembrar daquele valor${what} (${when}): ${formatBRL(debt.amount)}. Quando puder, me avisa. Valeu! 🙂`;
}

/** Divide uma conta: a parte de cada um (o resto dos centavos fica com quem pagou). */
export function splitShare(totalCents: number, people: number): number {
  if (people < 2) return totalCents;
  return Math.floor(totalCents / people);
}
